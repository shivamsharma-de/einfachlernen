/**
 * Test (plan §3): ten questions, German word, four English meanings.
 *
 * The correct answer comes from the snapshot the server froze when the test started,
 * so feedback is instant and works offline. The answer is sent in the background, and a
 * failed send is kept on the device and retried. The result screen shows the traffic lights
 * after the round, so the learner sees what changed.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Type, Space, Radius, HIT, ARTICLE_COLOR } from '../../constants/Colors';
import { PillButton } from '../../components';
import { useAuth } from '../../context/auth';
import { levelsOf } from '../../lib/profile';
import { useI18n } from '../../lib/i18n';
import { startTest, submitAnswer, finishTest, fetchLights, type TestStart, type LightCounts } from '../../lib/test';

type Verdict = { chosen: number; correct: boolean; correctIndex: number };

export default function TestScreen() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const levels = levelsOf(profile);

  const [test, setTest] = useState<TestStart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [result, setResult] = useState<{ correct: number; total: number; perfect: boolean } | null>(null);
  const [lights, setLights] = useState<LightCounts | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setTest(null);
    setIndex(0);
    setVerdict(null);
    setScore(0);
    setXp(0);
    setResult(null);
    setLights(null);
    const res = await startTest(levels);
    if (!res.ok) setError(res.error);
    else setTest(res.data);
    // levels is derived from profile; reloading on profile change is not needed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels.join(',')]);

  useEffect(() => { void load(); }, [load]);

  const choose = useCallback((chosen: number) => {
    if (!test || verdict || !user) return;
    const q = test.questions[index];
    // Verdict from the frozen snapshot: no waiting on the network.
    const correct = chosen === q.correct_index;
    setVerdict({ chosen, correct, correctIndex: q.correct_index });
    if (correct) setScore((s) => s + 1);

    // Send in the background. The server's XP is shown when it arrives.
    void submitAnswer(user.id, q.item_id, chosen)
      .then((r) => { if (r) setXp((x) => x + r.xp); });
  }, [test, verdict, index, user]);

  const next = useCallback(async () => {
    if (!test || !user) return;
    if (index + 1 < test.questions.length) {
      setIndex((i) => i + 1);
      setVerdict(null);
      return;
    }
    const done = await finishTest(user.id, test.attempt_id);
    const counts = await fetchLights(levels);
    setLights(counts.ok ? counts.data : null);
    setResult(done.ok
      ? { correct: done.data.correct, total: done.data.total, perfect: done.data.perfect_bonus }
      : { correct: score, total: test.questions.length, perfect: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, user, index, score, levels.join(',')]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t('Zurück', 'Back')}>
          <Text style={styles.backText}>{t('Zurück', 'Back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('Test', 'Test')}</Text>
        {test && !result && <Text style={styles.counter}>{index + 1} / {test.questions.length}</Text>}
      </View>

      {!test && !error && (
        <View style={styles.center}><ActivityIndicator color={Colors.textMuted} /></View>
      )}

      {error && (
        <View style={styles.center}>
          <Text style={styles.body}>{error}</Text>
          <PillButton label={t('Erneut versuchen', 'Try again')} onPress={() => { void load(); }} />
        </View>
      )}

      {test && result && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.resultScore}>{result.correct} / {result.total}</Text>
          <Text style={styles.body}>
            {result.perfect
              ? t('Alles richtig: +10 XP extra.', 'All correct: +10 bonus XP.')
              : t(`+${xp} XP in diesem Test`, `+${xp} XP from this test`)}
          </Text>
          {lights && lights.studied > 0 && (
            <View style={styles.lightsBox}>
              <Text style={styles.eyebrow}>{t('Dein Stand', 'Where you stand')}</Text>
              <LightBar counts={lights} />
              <Text style={styles.legend}>
                {t(`${lights.green} sicher · ${lights.yellow} auf dem Weg · ${lights.red} üben · ${lights.grey} noch nicht getestet`,
                   `${lights.green} secure · ${lights.yellow} on the way · ${lights.red} to practise · ${lights.grey} not tested yet`)}
              </Text>
            </View>
          )}
          <PillButton label={t('Nochmal testen', 'Test again')} onPress={() => { void load(); }} />
          <PillButton label={t('Fertig', 'Done')} variant="ghost" onPress={() => router.back()} />
        </ScrollView>
      )}

      {test && !result && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.prompt}>{t('Was bedeutet das?', 'What does this mean?')}</Text>
            <View style={styles.wordRow}>
              {test.questions[index].article && (
                <Text style={[styles.article, { color: ARTICLE_COLOR[test.questions[index].article!] }]}>
                  {test.questions[index].article}
                </Text>
              )}
              <Text style={styles.german}>{test.questions[index].german}</Text>
            </View>
          </View>

          {test.questions[index].options.map((opt, i) => {
            const isCorrect = verdict !== null && i === verdict.correctIndex;
            const isWrongChoice = verdict !== null && i === verdict.chosen && !verdict.correct;
            return (
              <TouchableOpacity
                key={`${index}-${i}`}
                onPress={() => choose(i)}
                disabled={verdict !== null}
                accessibilityRole="button"
                accessibilityLabel={opt}
                style={[
                  styles.option,
                  isCorrect && styles.optionCorrect,
                  isWrongChoice && styles.optionWrong,
                ]}
                activeOpacity={0.85}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            );
          })}

          {verdict && (
            <View style={styles.feedback}>
              <Text style={[styles.feedbackText, { color: verdict.correct ? Colors.green : Colors.red }]}>
                {verdict.correct ? t('Richtig!', 'Correct!') : t('Leider nicht.', 'Not quite.')}
              </Text>
              <PillButton
                label={index + 1 < test.questions.length ? t('Weiter', 'Next') : t('Ergebnis', 'Result')}
                onPress={() => { void next(); }}
              />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function LightBar({ counts }: { counts: LightCounts }) {
  const total = Math.max(counts.studied, 1);
  const seg = (n: number, color: string) => (
    <View key={color} style={{ flex: n / total, backgroundColor: color, height: 10 }} />
  );
  return (
    <View style={styles.bar}>
      {seg(counts.green, Colors.green)}
      {seg(counts.yellow, Colors.gold)}
      {seg(counts.red, Colors.red)}
      {seg(counts.grey, Colors.textMuted)}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space.gutter, paddingVertical: Space.md, gap: Space.md },
  back: { minHeight: HIT, justifyContent: 'center' },
  backText: { ...Type.body, color: Colors.purple },
  title: { ...Type.title, color: Colors.white, flex: 1 },
  counter: { ...Type.meta, color: Colors.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.gutter, gap: Space.md },
  content: { padding: Space.gutter, gap: Space.md, paddingBottom: 40 },
  card: { borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.textMuted, padding: Space.xl, gap: Space.sm },
  prompt: { ...Type.meta, color: Colors.textMuted },
  wordRow: { flexDirection: 'row', alignItems: 'baseline', gap: Space.sm, flexWrap: 'wrap' },
  article: { ...Type.word, fontWeight: '600' },
  german: { ...Type.word, color: Colors.white },
  option: {
    minHeight: HIT + 6, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.textMuted,
    paddingHorizontal: Space.lg, justifyContent: 'center',
  },
  optionCorrect: { borderColor: Colors.green, backgroundColor: Colors.greenBg },
  optionWrong: { borderColor: Colors.red, backgroundColor: Colors.redBg },
  optionText: { ...Type.body, color: Colors.white },
  feedback: { gap: Space.md, marginTop: Space.sm },
  feedbackText: { ...Type.title },
  body: { ...Type.body, color: Colors.textMuted, textAlign: 'center' },
  resultScore: { ...Type.display, color: Colors.white, textAlign: 'center' },
  lightsBox: { gap: Space.sm, padding: Space.lg, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.textMuted },
  eyebrow: { ...Type.meta, color: Colors.textMuted },
  bar: { flexDirection: 'row', borderRadius: Radius.pill, overflow: 'hidden', backgroundColor: Colors.textMuted },
  legend: { ...Type.caption, color: Colors.textMuted },
});
