/**
 * Test (plan §3): German word, four English meanings. The learner picks how many questions
 * a round has (10, 20, 50, or every studied word at once), and can start another round at
 * the same size or pick a different one.
 *
 * The correct answer comes from the snapshot the server froze when the test started,
 * so feedback is instant and works offline. The answer is sent in the background, and a
 * failed send is kept on the device and retried. The result screen shows the traffic lights
 * after the round, so the learner sees what changed.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Type, Space, Radius, HIT, articleColor } from '../../constants/Colors';
import type { ColorTokens } from '../../constants/Colors';
import { useThemedStyles, useTheme } from '../../context/theme';
import { PillButton } from '../../components';
import { useAuth } from '../../context/auth';
import { levelsOf } from '../../lib/profile';
import { useI18n } from '../../lib/i18n';
import { startTest, submitAnswer, finishTest, fetchLights, type TestStart, type LightCounts } from '../../lib/test';
import { track, timer } from '../../lib/analytics';

type Verdict = { chosen: number; correct: boolean; correctIndex: number };

/** Round sizes. ALL asks the server for more than any learner has studied, so every eligible word is used. */
const SIZES = [10, 20, 50] as const;
const ALL = 1000;

export default function TestScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const levels = levelsOf(profile);
  const levelKey = levels.join(',');

  const [size, setSize] = useState<number | null>(null);
  const [studied, setStudied] = useState<number | null>(null);
  const [test, setTest] = useState<TestStart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [result, setResult] = useState<{ correct: number; total: number; perfect: boolean } | null>(null);
  const [lights, setLights] = useState<LightCounts | null>(null);
  // Timing for analytics: round length, and how long each question was on screen.
  const roundElapsed = useRef<(() => number) | null>(null);
  const questionElapsed = useRef<(() => number) | null>(null);

  // Starts the think-time clock each time a new question is shown.
  useEffect(() => {
    if (test && !result) questionElapsed.current = timer();
  }, [test, index, result]);

  // The error text is shown from state; the event carries only its code.
  useEffect(() => {
    if (error) track('error_shown', { area: 'test', error_code: 'start_failed' });
  }, [error]);

  // How many studied words the learner has, so the setup step can say what "all" means.
  useEffect(() => {
    let cancelled = false;
    void fetchLights(levels).then((r) => {
      if (!cancelled && r.ok) setStudied(r.data.studied);
    });
    return () => { cancelled = true; };
  }, [levelKey]);

  const start = useCallback(async (requested: number) => {
    setSize(requested);
    setError(null);
    setTest(null);
    setIndex(0);
    setVerdict(null);
    setScore(0);
    setXp(0);
    setResult(null);
    setLights(null);
    const loadElapsed = timer();
    // "All" means every studied word. Ask for exactly that many: the server only tops a round up
    // from the wider catalogue when the count is larger than the studied words (migration 021),
    // and asking for 1000 made it build questions for the whole catalogue, which never came back.
    let count = requested;
    if (requested === ALL) {
      const lights = await fetchLights(levels);
      if (!lights.ok) {
        setError(lights.error);
        return;
      }
      count = lights.data.studied;
    }
    const res = await startTest(levels, count);
    if (!res.ok) setError(res.error);
    else {
      setTest(res.data);
      roundElapsed.current = timer();
      track('test_started', { size: res.data.questions.length, mode: res.data.mode, load_ms: loadElapsed() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelKey]);

  /** Back to the setup step, to choose a different size. */
  const reset = useCallback(() => {
    setSize(null);
    setTest(null);
    setError(null);
    setResult(null);
    setVerdict(null);
  }, []);

  const choose = useCallback((chosen: number) => {
    if (!test || verdict || !user) return;
    const q = test.questions[index];
    // Verdict from the frozen snapshot: no waiting on the network.
    const correct = chosen === q.correct_index;
    setVerdict({ chosen, correct, correctIndex: q.correct_index });
    if (correct) setScore((s) => s + 1);
    track('test_answered', { correct, think_ms: questionElapsed.current?.() ?? 0 });

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
    const finished = done.ok
      ? { correct: done.data.correct, total: done.data.total, perfect: done.data.perfect_bonus }
      : { correct: score, total: test.questions.length, perfect: false };
    track('test_finished', {
      correct: finished.correct,
      total: finished.total,
      perfect: finished.perfect,
      duration_ms: roundElapsed.current?.() ?? 0,
    });
    setResult(finished);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, user, index, score, levelKey]);

  const sizeLabel = (n: number) => (n === ALL ? t('Alle', 'All') : String(n));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t('Zurück', 'Back')}>
          <Text style={styles.backText}>{t('Zurück', 'Back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('Test', 'Test')}</Text>
        {test && !result && <Text style={styles.counter}>{index + 1} / {test.questions.length}</Text>}
      </View>

      {/* Setup: pick a round size */}
      {size === null && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.body}>
            {studied === null
              ? t('Lade deine Wörter…', 'Loading your words…')
              : studied === 0
                ? t('Lerne zuerst ein paar Karten, dann kannst du dich testen.', 'Study a few cards first, then you can test yourself.')
                : t(`${studied} gelernte Wörter. Wie viele Fragen möchtest du?`,
                    `${studied} studied words. How many questions do you want?`)}
          </Text>
          {SIZES.map((n) => (
            <PillButton key={n} label={t(`${n} Fragen`, `${n} questions`)} onPress={() => { void start(n); }} />
          ))}
          <PillButton
            label={t('Alle gelernten Wörter, in einer Runde', 'Every studied word, in one round')}
            variant="ghost"
            onPress={() => { void start(ALL); }}
          />
        </ScrollView>
      )}

      {size !== null && !test && !error && (
        <View style={styles.center}><ActivityIndicator color={colors.textMuted} /></View>
      )}

      {size !== null && error && (
        <View style={styles.center}>
          <Text style={styles.body}>{error}</Text>
          <PillButton label={t('Erneut versuchen', 'Try again')} onPress={() => { void start(size); }} />
          <PillButton label={t('Anderer Umfang', 'Different size')} variant="ghost" onPress={reset} />
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
          <PillButton label={t(`Nochmal (${sizeLabel(size!)})`, `Again (${sizeLabel(size!)})`)} onPress={() => { void start(size!); }} />
          <PillButton label={t('Anderer Umfang', 'Different size')} variant="ghost" onPress={reset} />
          <PillButton label={t('Fertig', 'Done')} variant="ghost" onPress={() => router.back()} />
        </ScrollView>
      )}

      {test && !result && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.prompt}>{t('Was bedeutet das?', 'What does this mean?')}</Text>
            <View style={styles.wordRow}>
              {test.questions[index].article && (
                <Text style={[styles.article, { color: articleColor(colors)[test.questions[index].article!] }]}>
                  {test.questions[index].article}
                </Text>
              )}
              <Text style={styles.german}>{test.questions[index].german}</Text>
            </View>
          </View>

          {test.studied !== undefined && test.total > test.studied && (
            <Text style={styles.legend}>
              {t(
                `${test.studied} aus deinen gelernten Wörtern · ${test.total - test.studied} aus deinem Niveau`,
                `${test.studied} from words you studied · ${test.total - test.studied} from your level`,
              )}
            </Text>
          )}

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
              <Text style={[styles.feedbackText, { color: verdict.correct ? colors.green : colors.red }]}>
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
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const total = Math.max(counts.studied, 1);
  const seg = (n: number, color: string) => (
    <View key={color} style={{ flex: n / total, backgroundColor: color, height: 10 }} />
  );
  return (
    <View style={styles.bar}>
      {seg(counts.green, colors.green)}
      {seg(counts.yellow, colors.gold)}
      {seg(counts.red, colors.red)}
      {seg(counts.grey, colors.textMuted)}
    </View>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space.gutter, paddingVertical: Space.md, gap: Space.md },
  back: { minHeight: HIT, justifyContent: 'center' },
  backText: { ...Type.body, color: c.purple },
  title: { ...Type.title, color: c.text, flex: 1 },
  counter: { ...Type.meta, color: c.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.gutter, gap: Space.md },
  content: { padding: Space.gutter, gap: Space.md, paddingBottom: 40 },
  card: { borderRadius: Radius.card, borderWidth: 1, borderColor: c.textMuted, padding: Space.xl, gap: Space.sm, minHeight: 120, justifyContent: 'center' },
  prompt: { ...Type.meta, color: c.textMuted },
  wordRow: { flexDirection: 'row', alignItems: 'baseline', gap: Space.sm, flexWrap: 'wrap' },
  article: { ...Type.word, fontWeight: '600' },
  german: { ...Type.word, color: c.text },
  option: {
    minHeight: HIT + 6, borderRadius: Radius.card, borderWidth: 1, borderColor: c.textMuted,
    paddingHorizontal: Space.lg, paddingVertical: Space.md, justifyContent: 'center',
  },
  optionCorrect: { borderColor: c.green, backgroundColor: c.greenBg },
  optionWrong: { borderColor: c.red, backgroundColor: c.redBg },
  optionText: { ...Type.body, color: c.text, flexShrink: 1 },
  feedback: { gap: Space.md, marginTop: Space.sm },
  feedbackText: { ...Type.title },
  body: { ...Type.body, color: c.textMuted, textAlign: 'center' },
  resultScore: { ...Type.display, color: c.text, textAlign: 'center' },
  lightsBox: { gap: Space.sm, padding: Space.lg, borderRadius: Radius.card, borderWidth: 1, borderColor: c.textMuted },
  eyebrow: { ...Type.meta, color: c.textMuted },
  bar: { flexDirection: 'row', borderRadius: Radius.pill, overflow: 'hidden', backgroundColor: c.textMuted },
  legend: { ...Type.caption, color: c.textMuted },
});
