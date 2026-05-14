import { useState, useCallback, useMemo, useRef } from 'react';
import { Word } from '../types';

export type AnswerState = 'unanswered' | 'correct' | 'wrong';

export interface QuizQuestion {
  word: Word;
  options: string[];
  correctIndex: number;
}

interface HistoryEntry {
  questionIndex: number;
  selectedIndex: number | null;
  answerState: AnswerState;
  hintsUsed: Set<string>;
  eliminatedIndices: number[];
  hearts: number;
  xp: number;
  correctCount: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestion(word: Word, allWords: Word[]): QuizQuestion {
  const wrongPool = allWords
    .filter(w => w.id !== word.id && w.english !== word.english)
    .map(w => w.english);

  const unique = [...new Set([...word.distractors, ...wrongPool])];
  const wrong3 = shuffle(unique).slice(0, 3);
  const options = shuffle([word.english, ...wrong3]);
  return { word, options, correctIndex: options.indexOf(word.english) };
}

export function useGameState(words: Word[], sessionSize = 10) {
  const [sessionKey, setSessionKey] = useState(0);
  const wordsRef = useRef(words);

  const questions = useMemo(() => {
    const pool = shuffle(wordsRef.current).slice(0, sessionSize);
    return pool.map(w => buildQuestion(w, wordsRef.current));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, sessionSize]);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [xp, setXp] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState<Set<string>>(new Set());
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);
  const [sessionDone, setSessionDone] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  // Stack of answered-question snapshots; popped when going back
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // True when we've navigated back into a previously-answered question
  const [isReviewing, setIsReviewing] = useState(false);

  const current = questions[questionIndex];

  const answer = useCallback((index: number) => {
    if (answerState !== 'unanswered') return;
    setIsReviewing(false);
    setSelectedIndex(index);
    if (index === current.correctIndex) {
      const earned = Math.max(10, 20 - hintsUsed.size * 5);
      setXp(x => x + earned);
      setAnswerState('correct');
      setCorrectCount(c => c + 1);
    } else {
      setHearts(h => Math.max(0, h - 1));
      setAnswerState('wrong');
    }
  }, [answerState, current, hintsUsed]);

  const next = useCallback(() => {
    // Snapshot current answered state before advancing
    setHistory(prev => [...prev, {
      questionIndex,
      selectedIndex,
      answerState,
      hintsUsed: new Set(hintsUsed),
      eliminatedIndices: [...eliminatedIndices],
      hearts,
      xp,
      correctCount,
    }]);

    if (questionIndex + 1 >= questions.length || hearts === 0) {
      setSessionDone(true);
      return;
    }
    setIsReviewing(false);
    setQuestionIndex(i => i + 1);
    setAnswerState('unanswered');
    setSelectedIndex(null);
    setHintsUsed(new Set());
    setEliminatedIndices([]);
  }, [questionIndex, questions.length, hearts, xp, correctCount,
      selectedIndex, answerState, hintsUsed, eliminatedIndices]);

  const back = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setIsReviewing(true);
    setQuestionIndex(prev.questionIndex);
    setSelectedIndex(prev.selectedIndex);
    setAnswerState(prev.answerState);
    setHintsUsed(prev.hintsUsed);
    setEliminatedIndices(prev.eliminatedIndices);
    setHearts(prev.hearts);
    setXp(prev.xp);
    setCorrectCount(prev.correctCount);
  }, [history]);

  const useHint = useCallback((type: string) => {
    if (hintsUsed.has(type)) return;
    setHintsUsed(prev => new Set([...prev, type]));
    if (type === 'eliminate') {
      const wrongIndices = current.options
        .map((_, i) => i)
        .filter(i => i !== current.correctIndex);
      setEliminatedIndices(shuffle(wrongIndices).slice(0, 2));
    }
  }, [hintsUsed, current]);

  const reset = useCallback(() => {
    setSessionKey(k => k + 1);
    setQuestionIndex(0);
    setHearts(3);
    setXp(0);
    setAnswerState('unanswered');
    setSelectedIndex(null);
    setHintsUsed(new Set());
    setEliminatedIndices([]);
    setSessionDone(false);
    setCorrectCount(0);
    setHistory([]);
    setIsReviewing(false);
  }, []);

  return {
    current, questionIndex, total: questions.length,
    hearts, xp, answerState, selectedIndex,
    hintsUsed, eliminatedIndices, sessionDone, correctCount,
    canGoBack: history.length > 0,
    isReviewing,
    answer, next, back, useHint, reset,
  };
}
