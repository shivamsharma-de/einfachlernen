import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Animated, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { CEFRLevel } from '../../data/vocabulary';
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

export default function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ levels?: string }>();
  const levels = (params.levels ?? 'A1,A2').split(',') as CEFRLevel[];

  const game = useGameState(levels, 10);
  const { current, questionIndex, total, hearts, xp, answerState, selectedIndex,
          hintsUsed, eliminatedIndices, sessionDone, correctCount, answer, next, useHint, reset } = game;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(1)).current;
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (questionIndex + 1) / total,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [questionIndex]);

  useEffect(() => {
    feedbackAnim.setValue(0);
    if (answerState !== 'unanswered') {
      Animated.spring(feedbackAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
    }
  }, [answerState]);

  const handleAnswer = (index: number) => {
    if (answerState !== 'unanswered') return;
    if (index === current.correctIndex) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    answer(index);
  };

  const handleHint = (key: string) => {
    if (hintsUsed.has(key) || answerState !== 'unanswered') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useHint(key);
  };

  if (sessionDone) {
    return <ResultScreen correct={correctCount} total={total} xp={xp} onReplay={reset} onHome={() => router.replace('/(tabs)')} />;
  }

  const word = current.word;
  const levelColor = word.level === 'A1' ? Colors.levelA1 : Colors.levelA2;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={Colors.white} />
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
            <Text style={[styles.levelTagText, { color: levelColor }]}>⭐ {word.level} · {word.category}</Text>
          </View>
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>+{xp} XP</Text>
          </View>
        </View>

        {/* Word Card */}
        <View style={styles.wordCard}>
          <Text style={styles.wordType}>{word.type.toUpperCase()}</Text>

          {word.article ? (
            <View style={styles.articleRow}>
              <Text style={[styles.article, { color: ARTICLE_COLOR[word.article] }]}>
                {word.article}
              </Text>
            </View>
          ) : null}

          <Text style={styles.mainWord}>{word.german}</Text>
          <Text style={styles.pronunciation}>{word.pronunciation}</Text>

          {/* Example sentence if hint used */}
          {hintsUsed.has('context') && (
            <View style={styles.contextBox}>
              <Text style={styles.contextLabel}>💬 Context</Text>
              <Text style={styles.contextText}>„{word.exampleDe}"</Text>
              <Text style={styles.contextTranslation}>{word.exampleEn}</Text>
            </View>
          )}
          {hintsUsed.has('letter') && (
            <View style={styles.letterBox}>
              <Text style={styles.letterHint}>
                🔡 First letter: <Text style={{ color: Colors.gold, fontWeight: '800' }}>
                  {word.english.charAt(0).toUpperCase()}…
                </Text>
              </Text>
            </View>
          )}
          {hintsUsed.has('image') && (
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
              { opacity: feedbackAnim, transform: [{ scale: feedbackAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] },
            ]}
          >
            <Text style={styles.feedbackTitle}>
              {answerState === 'correct' ? '✅ Correct!' : '❌ Not quite'}
            </Text>
            <Text style={styles.feedbackText}>{word.exampleDe}</Text>
            <Text style={styles.feedbackSub}>{word.exampleEn}</Text>
          </Animated.View>
        )}

        {/* Next Button */}
        {answerState !== 'unanswered' && (
          <TouchableOpacity style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextBtnText}>
              {questionIndex + 1 >= total ? 'See Results 🎉' : 'Continue →'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
          <StatBox label="Score" value={`${pct}%`} color={Colors.gold} />
          <StatBox label="XP Earned" value={`+${xp}`} color={Colors.purple} />
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

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
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

  wordCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
    marginBottom: 14,
  },
  wordType: { color: Colors.textMuted, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  articleRow: { marginBottom: 4 },
  article: { fontSize: 16, fontWeight: '600' },
  mainWord: { color: Colors.white, fontSize: 40, fontWeight: '900', letterSpacing: -1, textAlign: 'center' },
  pronunciation: { color: Colors.textMuted, fontSize: 14, fontStyle: 'italic', marginTop: 6 },

  contextBox: {
    marginTop: 14, backgroundColor: Colors.surface2, borderRadius: 12, padding: 12, width: '100%',
    borderLeftWidth: 3, borderLeftColor: Colors.purple,
  },
  contextLabel: { color: Colors.purple, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  contextText: { color: Colors.white, fontSize: 14, fontStyle: 'italic' },
  contextTranslation: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },

  letterBox: { marginTop: 12, backgroundColor: Colors.surface2, borderRadius: 10, padding: 10, width: '100%' },
  letterHint: { color: Colors.textMuted, fontSize: 14 },

  imageHintBox: {
    marginTop: 12, backgroundColor: '#1e1a0d', borderRadius: 10, padding: 12, width: '100%',
    borderWidth: 1, borderColor: Colors.gold + '33',
  },
  imageHintText: { color: '#e8d89a', fontSize: 13 },

  hintsRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  hintBtn: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 10,
    alignItems: 'center', gap: 3, borderWidth: 1, borderColor: Colors.border,
  },
  hintBtnUsed: { opacity: 0.4 },
  hintIcon: { fontSize: 18 },
  hintLabel: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
  hintCost: { color: Colors.gold, fontSize: 10, fontWeight: '700' },

  questionText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 14 },

  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  optionBtn: {
    width: (width - 50) / 2,
    backgroundColor: Colors.surface, borderRadius: 14,
    padding: 16, borderWidth: 1.5, borderColor: Colors.border,
    gap: 4,
  },
  optionCorrect: { borderColor: Colors.green, backgroundColor: Colors.greenBg },
  optionWrong: { borderColor: Colors.red, backgroundColor: Colors.redBg },
  optionEliminated: { opacity: 0.2 },
  optionLetter: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' },
  optionText: { color: Colors.white, fontSize: 15, fontWeight: '600', lineHeight: 20 },

  feedbackBar: { borderRadius: 14, padding: 16, marginBottom: 14, gap: 4 },
  feedbackCorrect: { backgroundColor: Colors.greenBg, borderWidth: 1, borderColor: Colors.green + '44' },
  feedbackWrong: { backgroundColor: Colors.redBg, borderWidth: 1, borderColor: Colors.red + '44' },
  feedbackTitle: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  feedbackText: { color: Colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  feedbackSub: { color: Colors.textDim, fontSize: 12 },

  nextBtn: {
    backgroundColor: Colors.gold, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 12,
  },
  nextBtnText: { color: Colors.black, fontWeight: '800', fontSize: 16 },

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
