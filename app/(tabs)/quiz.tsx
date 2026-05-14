import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  StyleSheet, SafeAreaView, Animated, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { CEFRLevel, Word } from '../../types';
import { fetchWordsByLevel } from '../../lib/db';
import { useGameState } from '../../hooks/useGameState';

const { width } = Dimensions.get('window');

const ARTICLE_COLOR: Record<string, string> = {
  der: Colors.articleDer,
  die: Colors.articleDie,
  das: Colors.articleDas,
};

const HINT_CONFIG = [
  { key: 'context',   icon: '💬', label: 'Context',   cost: 10 },
  { key: 'letter',    icon: '🔡', label: '1st Letter', cost: 8  },
  { key: 'eliminate', icon: '✂️', label: 'Remove 2',   cost: 15 },
  { key: 'image',     icon: '🖼️', label: 'Picture',   cost: 5  },
];

// ─── Loader wrapper ───────────────────────────────────────────────────────────
export default function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ levels?: string }>();
  const levels = (params.levels ?? 'A1').split(',') as CEFRLevel[];

  const [words, setWords] = useState<Word[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchWordsByLevel(levels)
      .then(data => {
        if (data.length === 0) setError(true);
        else setWords(data);
      })
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>Could not load words.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!words) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.gold} size="large" />
          <Text style={styles.loadingText}>Loading words…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return <QuizGame words={words} onExit={() => router.replace('/(tabs)')} />;
}

const LEVEL_COLORS: Record<string, string> = {
  A1: Colors.levelA1, A2: Colors.levelA2, B1: Colors.levelB1,
  B2: Colors.levelB2, C1: Colors.levelC1, C2: Colors.levelC2,
};

// ─── Game ─────────────────────────────────────────────────────────────────────
function QuizGame({ words, onExit }: { words: Word[]; onExit: () => void }) {
  const router = useRouter();
  const game = useGameState(words, 10);
  const {
    current, questionIndex, total, hearts, xp,
    answerState, selectedIndex, hintsUsed, eliminatedIndices,
    sessionDone, correctCount, canGoBack, isReviewing,
    answer, next, back, useHint, reset,
  } = game;

  const progressAnim    = useRef(new Animated.Value(0)).current;
  const feedbackAnim    = useRef(new Animated.Value(0)).current;
  const autoAdvanceAnim = useRef(new Animated.Value(0)).current;
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (questionIndex + 1) / total,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [questionIndex, total]);

  useEffect(() => {
    feedbackAnim.setValue(0);
    if (answerState !== 'unanswered') {
      Animated.spring(feedbackAnim, {
        toValue: 1, useNativeDriver: true, tension: 80, friction: 8,
      }).start();
    }
  }, [answerState]);

  // Auto-advance: fill button over 2 s, showing 3 → 2 → 1 countdown.
  // Skipped when reviewing a history question — user navigates manually.
  useEffect(() => {
    if (answerState === 'unanswered' || isReviewing) {
      autoAdvanceAnim.stopAnimation();
      autoAdvanceAnim.setValue(0);
      setCountdown(3);
      return;
    }

    setCountdown(3);
    Animated.timing(autoAdvanceAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start(({ finished }) => { if (finished) next(); });

    const t1 = setTimeout(() => setCountdown(2), 667);
    const t2 = setTimeout(() => setCountdown(1), 1334);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      autoAdvanceAnim.stopAnimation();
    };
  }, [answerState, isReviewing]);

  const handleAnswer = (index: number) => {
    if (answerState !== 'unanswered') return;
    Haptics.notificationAsync(
      index === current.correctIndex
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
    answer(index);
  };

  const handleHint = (key: string) => {
    if (hintsUsed.has(key) || answerState !== 'unanswered') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useHint(key);
  };

  if (sessionDone) {
    return (
      <ResultScreen
        correct={correctCount} total={total} xp={xp}
        onReplay={reset} onHome={onExit}
      />
    );
  }

  const word = current.word;
  const levelColor = LEVEL_COLORS[word.level] ?? Colors.gold;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => canGoBack ? back() : router.back()}
          >
            <Ionicons name="arrow-back" size={18} color={canGoBack ? Colors.gold : Colors.white} />
          </TouchableOpacity>
          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <Animated.View
                style={[styles.progressFill, {
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                }]}
              />
            </View>
            <Text style={styles.progressLabel}>{questionIndex + 1} / {total}</Text>
          </View>
          <View style={styles.heartsRow}>
            {[0, 1, 2].map(i => (
              <Text key={i} style={styles.heart}>{i < hearts ? '❤️' : '🖤'}</Text>
            ))}
          </View>
        </View>

        {/* Level + Category Tag */}
        <View style={styles.tagRow}>
          <View style={[styles.levelTag, { borderColor: levelColor + '55', backgroundColor: levelColor + '15' }]}>
            <Text style={[styles.levelTagText, { color: levelColor }]}>
              ⭐ {word.level} · {word.category}
            </Text>
          </View>
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>+{xp} XP</Text>
          </View>
        </View>

        {/* Word Card */}
        <View style={styles.wordCard}>
          <Text style={styles.wordType}>{word.word_type.toUpperCase()}</Text>

          {word.article ? (
            <Text style={[styles.article, { color: ARTICLE_COLOR[word.article] ?? Colors.textMuted }]}>
              {word.article}
            </Text>
          ) : null}

          <Text style={styles.mainWord}>{word.german}</Text>
          {word.pronunciation ? (
            <Text style={styles.pronunciation}>{word.pronunciation}</Text>
          ) : null}

          {hintsUsed.has('context') && word.example_de && (
            <View style={styles.contextBox}>
              <Text style={styles.contextLabel}>💬 Context</Text>
              <Text style={styles.contextText}>„{word.example_de}"</Text>
              <Text style={styles.contextTranslation}>{word.example_en}</Text>
            </View>
          )}
          {hintsUsed.has('letter') && (
            <View style={styles.letterBox}>
              <Text style={styles.letterHint}>
                🔡 First letter:{' '}
                <Text style={{ color: Colors.gold, fontWeight: '800' }}>
                  {word.english.charAt(0).toUpperCase()}…
                </Text>
              </Text>
            </View>
          )}
          {hintsUsed.has('image') && word.hint && (
            <View style={styles.imageHintBox}>
              <Text style={styles.imageHintText}>🖼️ {word.hint}</Text>
            </View>
          )}
        </View>

        {/* Hint Buttons */}
        <View style={styles.hintsRow}>
          {HINT_CONFIG.map(h => (
            <TouchableOpacity
              key={h.key}
              style={[styles.hintBtn, hintsUsed.has(h.key) && styles.hintBtnUsed]}
              onPress={() => handleHint(h.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.hintIcon}>{h.icon}</Text>
              <Text style={styles.hintLabel}>{h.label}</Text>
              <Text style={styles.hintCost}>−{h.cost} XP</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Question */}
        <Text style={styles.questionText}>What does this word mean in English?</Text>

        {/* Options */}
        <View style={styles.optionsGrid}>
          {current.options.map((option, i) => {
            const isEliminated = eliminatedIndices.includes(i);
            const isSelected = selectedIndex === i;
            const isCorrectAnswer = i === current.correctIndex;
            const btnVariant = answerState !== 'unanswered'
              ? isCorrectAnswer ? styles.optionCorrect : isSelected ? styles.optionWrong : null
              : null;
            const textColor = answerState !== 'unanswered'
              ? isCorrectAnswer ? Colors.green : isSelected ? Colors.red : Colors.white
              : Colors.white;

            return (
              <TouchableOpacity
                key={i}
                style={[styles.optionBtn, btnVariant, isEliminated && styles.optionEliminated]}
                onPress={() => !isEliminated && handleAnswer(i)}
                activeOpacity={isEliminated ? 1 : 0.75}
                disabled={isEliminated || answerState !== 'unanswered'}
              >
                <Text style={styles.optionLetter}>{String.fromCharCode(65 + i)}</Text>
                <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feedback */}
        {answerState !== 'unanswered' && (
          <Animated.View
            style={[
              styles.feedbackBar,
              answerState === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong,
              {
                opacity: feedbackAnim,
                transform: [{
                  scale: feedbackAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }),
                }],
              },
            ]}
          >
            <Text style={styles.feedbackTitle}>
              {answerState === 'correct' ? '✅ Correct!' : '❌ Not quite'}
            </Text>
            {word.example_de && <Text style={styles.feedbackText}>{word.example_de}</Text>}
            {word.example_en && <Text style={styles.feedbackSub}>{word.example_en}</Text>}
          </Animated.View>
        )}

        {/* Next / auto-advance button */}
        {answerState !== 'unanswered' && (
          isReviewing ? (
            <TouchableOpacity
              style={[styles.nextBtn, styles.nextBtnReview]}
              onPress={next}
              activeOpacity={0.8}
            >
              <Text style={styles.nextBtnText}>
                {questionIndex + 1 >= total ? 'Results 🎉' : 'Continue →'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => { autoAdvanceAnim.stopAnimation(); next(); }}
              activeOpacity={0.9}
            >
              <Animated.View
                style={[styles.nextBtnFill, {
                  width: autoAdvanceAnim.interpolate({
                    inputRange: [0, 1], outputRange: ['0%', '100%'],
                  }),
                }]}
              />
              <Text style={styles.nextBtnText}>
                {questionIndex + 1 >= total
                  ? `Results 🎉  ${countdown}`
                  : `Next  ${countdown}`}
              </Text>
            </TouchableOpacity>
          )
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Result screen ────────────────────────────────────────────────────────────
function ResultScreen({ correct, total, xp, onReplay, onHome }: {
  correct: number; total: number; xp: number;
  onReplay: () => void; onHome: () => void;
}) {
  const pct = Math.round((correct / total) * 100);
  const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '💪';
  const msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good job!' : 'Keep practising!';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.resultContainer}>
        <Text style={styles.resultEmoji}>{emoji}</Text>
        <Text style={styles.resultTitle}>{msg}</Text>
        <Text style={styles.resultSub}>Session complete</Text>
        <View style={styles.resultStats}>
          <StatBox label="Correct" value={`${correct}/${total}`} color={Colors.green} />
          <StatBox label="Score"   value={`${pct}%`}            color={Colors.gold} />
          <StatBox label="XP"      value={`+${xp}`}             color={Colors.purple} />
        </View>
        <TouchableOpacity style={styles.replayBtn} onPress={onReplay}>
          <Text style={styles.replayBtnText}>Play Again ↺</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeBtn} onPress={onHome}>
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: Colors.textMuted, fontSize: 14, marginTop: 12 },
  errorText: { color: Colors.red, fontSize: 15 },
  retryBtn: { backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
  retryBtnText: { color: Colors.white, fontWeight: '600' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  progressWrap: { flex: 1 },
  progressBg: { height: 8, backgroundColor: Colors.surface3, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 4 },
  progressLabel: { color: Colors.textMuted, fontSize: 11, textAlign: 'right', marginTop: 4 },
  heartsRow: { flexDirection: 'row', gap: 2 },
  heart: { fontSize: 14 },

  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  levelTag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  levelTagText: { fontSize: 12, fontWeight: '700' },
  xpBadge: { backgroundColor: Colors.goldBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  xpBadgeText: { color: Colors.gold, fontSize: 12, fontWeight: '700' },

  wordCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginBottom: 14 },
  wordType: { color: Colors.textMuted, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  article: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  mainWord: { color: Colors.white, fontSize: 40, fontWeight: '900', letterSpacing: -1, textAlign: 'center' },
  pronunciation: { color: Colors.textMuted, fontSize: 14, fontStyle: 'italic', marginTop: 6 },

  contextBox: { marginTop: 14, backgroundColor: Colors.surface2, borderRadius: 12, padding: 12, width: '100%', borderLeftWidth: 3, borderLeftColor: Colors.purple },
  contextLabel: { color: Colors.purple, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  contextText: { color: Colors.white, fontSize: 14, fontStyle: 'italic' },
  contextTranslation: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  letterBox: { marginTop: 12, backgroundColor: Colors.surface2, borderRadius: 10, padding: 10, width: '100%' },
  letterHint: { color: Colors.textMuted, fontSize: 14 },
  imageHintBox: { marginTop: 12, backgroundColor: '#1e1a0d', borderRadius: 10, padding: 12, width: '100%', borderWidth: 1, borderColor: Colors.gold + '33' },
  imageHintText: { color: '#e8d89a', fontSize: 13 },

  hintsRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  hintBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 10, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: Colors.border },
  hintBtnUsed: { opacity: 0.4 },
  hintIcon: { fontSize: 18 },
  hintLabel: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
  hintCost: { color: Colors.gold, fontSize: 10, fontWeight: '700' },

  questionText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 14 },

  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  optionBtn: { width: (width - 50) / 2, backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: Colors.border, gap: 4 },
  optionCorrect: { borderColor: Colors.green, backgroundColor: Colors.greenBg },
  optionWrong: { borderColor: Colors.red, backgroundColor: Colors.redBg },
  optionEliminated: { opacity: 0.2 },
  optionLetter: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' },
  optionText: { fontSize: 15, fontWeight: '600', lineHeight: 20 },

  feedbackBar: { borderRadius: 14, padding: 16, marginBottom: 14, gap: 4 },
  feedbackCorrect: { backgroundColor: Colors.greenBg, borderWidth: 1, borderColor: Colors.green + '44' },
  feedbackWrong: { backgroundColor: Colors.redBg, borderWidth: 1, borderColor: Colors.red + '44' },
  feedbackTitle: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  feedbackText: { color: Colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  feedbackSub: { color: Colors.textDim, fontSize: 12 },

  nextBtn: {
    borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 12,
    overflow: 'hidden', backgroundColor: Colors.goldDark,
    borderWidth: 1, borderColor: Colors.gold,
  },
  nextBtnFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: Colors.gold,
  },
  nextBtnReview: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  nextBtnText: { color: Colors.black, fontWeight: '800', fontSize: 16, zIndex: 1 },

  resultContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  resultEmoji: { fontSize: 64, marginBottom: 8 },
  resultTitle: { color: Colors.white, fontSize: 28, fontWeight: '900' },
  resultSub: { color: Colors.textMuted, fontSize: 14 },
  resultStats: { flexDirection: 'row', gap: 16, marginVertical: 24 },
  statBox: { alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 16, minWidth: 90, borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  replayBtn: { backgroundColor: Colors.gold, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center', marginTop: 8 },
  replayBtnText: { color: Colors.black, fontWeight: '800', fontSize: 16 },
  homeBtn: { backgroundColor: Colors.surface, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 32, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  homeBtnText: { color: Colors.textMuted, fontWeight: '600', fontSize: 15 },
});
