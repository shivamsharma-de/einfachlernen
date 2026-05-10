import { useState, useCallback } from 'react';
import { VocabWord, shuffleArray, getWordsByLevel, CEFRLevel } from '../data/vocabulary';

export type AnswerState = 'unanswered' | 'correct' | 'wrong';

export interface QuizQuestion {
  word: VocabWord;
  options: string[];   // 4 English answers
  correctIndex: number;
}

function buildQuestion(word: VocabWord, allWords: VocabWord[]): QuizQuestion {
  const wrongPool = allWords
    .filter(w => w.id !== word.id && w.english !== word.english)
    .map(w => w.english);

  const uniqueWrong = [...new Set([...word.distractors, ...wrongPool])];
  const wrong3 = shuffleArray(uniqueWrong).slice(0, 3);
  const options = shuffleArray([word.english, ...wrong3]);
  const correctIndex = options.indexOf(word.english);

  return { word, options, correctIndex };
}

export function useGameState(levels: CEFRLevel[], sessionSize = 10) {
  const allWords = getWordsByLevel(levels);
  const pool = shuffleArray(allWords).slice(0, sessionSize);
  const questions = pool.map(w => buildQuestion(w, allWords));

  const [questionIndex, setQuestionIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [xp, setXp] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState<Set<string>>(new Set());
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);
  const [sessionDone, setSessionDone] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const current = questions[questionIndex];

  const answer = useCallback((index: number) => {
    if (answerState !== 'unanswered') return;
    setSelectedIndex(index);
    if (index === current.correctIndex) {
      const hintPenalty = hintsUsed.size * 5;
      const earned = Math.max(10, 20 - hintPenalty);
      setXp(x => x + earned);
      setAnswerState('correct');
      setCorrectCount(c => c + 1);
    } else {
      setHearts(h => Math.max(0, h - 1));
      setAnswerState('wrong');
    }
  }, [answerState, current, hintsUsed]);

  const next = useCallback(() => {
    if (questionIndex + 1 >= questions.length) {
      setSessionDone(true);
      return;
    }
    setQuestionIndex(i => i + 1);
    setAnswerState('unanswered');
    setSelectedIndex(null);
    setHintsUsed(new Set());
    setEliminatedIndices([]);
  }, [questionIndex, questions.length]);

  const useHint = useCallback((type: string) => {
    if (hintsUsed.has(type)) return;
    setHintsUsed(prev => new Set([...prev, type]));
    if (type === 'eliminate') {
      const wrongIndices = current.options
        .map((_, i) => i)
        .filter(i => i !== current.correctIndex);
      const toEliminate = shuffleArray(wrongIndices).slice(0, 2);
      setEliminatedIndices(toEliminate);
    }
  }, [hintsUsed, current]);

  const reset = useCallback(() => {
    setQuestionIndex(0);
    setHearts(3);
    setXp(0);
    setAnswerState('unanswered');
    setSelectedIndex(null);
    setHintsUsed(new Set());
    setEliminatedIndices([]);
    setSessionDone(false);
    setCorrectCount(0);
  }, []);

  return {
    current,
    questionIndex,
    total: questions.length,
    hearts,
    xp,
    answerState,
    selectedIndex,
    hintsUsed,
    eliminatedIndices,
    sessionDone,
    correctCount,
    answer,
    next,
    useHint,
    reset,
  };
}
