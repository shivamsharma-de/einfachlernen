import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Type, Space, Radius, THEMEN } from '../../constants/Colors';
import { Eyebrow, ProgressRing, StatPair, SectionShelf, WordRow } from '../../components';
import { fetchWordsByLevel, fetchWordCountsByLevel } from '../../lib/db';
import { useAuth } from '../../context/auth';
import { levelOf } from '../../lib/profile';
import { fetchDueWordIds } from '../../lib/deck';
import { fetchToday, fetchStreak, DAILY_MINUTES_GOAL } from '../../lib/activity';
import { stufe } from '../../lib/progress';
import { Word } from '../../types';

function greeting(hour: number): { de: string; en: string } {
  if (hour < 11) return { de: 'Guten Morgen', en: 'Good morning' };
  if (hour < 18) return { de: 'Guten Tag', en: 'Good afternoon' };
  return { de: 'Guten Abend', en: 'Good evening' };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Look up the English subtitle for a category when it matches a canonical
 *  Thema. Seed categories are not normalised yet (§7), so this misses often —
 *  by design, rather than guessing a translation. */
function themaEnglish(category: string): string | null {
  const match = THEMEN.find(t => t.de.toLowerCase() === category.toLowerCase());
  return match ? match.en : null;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  // Level is read-only here — it is chosen in Profil and nowhere else (PRD v2 D1).
  const level = levelOf(profile);

  const [words, setWords] = useState<Word[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [dueIds, setDueIds] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const allCounts = await fetchWordCountsByLevel();
      if (cancelled) return;
      setCounts(allCounts);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const [ids, today, streakValue] = await Promise.all([
        fetchDueWordIds(user.id), fetchToday(user.id), fetchStreak(),
      ]);
      if (cancelled) return;
      setDueIds(ids);
      setMinutes(today?.minutes ?? 0);
      setStreak(streakValue);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const rows = await fetchWordsByLevel([level]);
      if (cancelled) return;
      setWords(rows);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [level]);

  const now = new Date();
  const hello = greeting(now.getHours());

  // Themen shelf: real categories present at this level, largest first.
  const themen = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const w of words) byCategory.set(w.category, (byCategory.get(w.category) ?? 0) + 1);
    return [...byCategory.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [words]);

  // Continue card targets the largest Thema at this level. `done` counts the
  // words in it the learner has actually started a card for.
  const current = themen[0] ?? null;

  const due = useMemo(() => {
    const ids = new Set(dueIds);
    return words.filter(w => ids.has(w.id));
  }, [dueIds, words]);

  const currentDone = useMemo(() => {
    if (!current) return 0;
    const started = new Set(dueIds);
    return words.filter(w => w.category === current.category && started.has(w.id)).length;
  }, [current, words, dueIds]);

  // Due words all lead into the deck — that is where they get reviewed.
  const openWord = useCallback(() => router.push('/(tabs)/deck'), [router]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 1 — Greeting */}
        <View style={styles.gutter}>
          <View style={styles.greetingRow}>
            <View style={styles.greetingText}>
              <Text style={styles.date}>{formatDate(now)}</Text>
              <Text style={styles.hello}>
                {hello.de}<Text style={styles.period}>.</Text>
              </Text>
              <Text style={styles.helloEn}>{hello.en}</Text>
            </View>
            <View style={styles.levelCircle}>
              <Text style={styles.levelCircleText}>{level}</Text>
            </View>
          </View>
        </View>

        {/* 2 — Daily goal */}
        <View style={styles.gutter}>
          <View style={styles.card}>
            <View style={styles.goalTop}>
              <ProgressRing
                pct={minutes / DAILY_MINUTES_GOAL}
                size={64}
                color={Colors.gold}
                label={`${minutes}/${DAILY_MINUTES_GOAL}`}
              />
              <View style={styles.goalCopy}>
                <Eyebrow>Tagesziel</Eyebrow>
                <Text style={styles.goalMinutes}>
                  {minutes} von {DAILY_MINUTES_GOAL} Minuten
                </Text>
                <Text style={styles.goalDue}>
                  {due.length === 0 ? 'Keine Karten fällig' : `${due.length} Karten fällig`}
                </Text>
              </View>
            </View>
            <View style={styles.statRow}>
              <StatPair value={streak} label="Tage Serie" color={Colors.gold} />
              <StatPair value={profile?.xp ?? 0} label={`XP · Stufe ${stufe(profile?.xp ?? 0)}`} />
            </View>
          </View>
        </View>

        {/* 4 — Continue. The only violet-filled block on the screen (§6.1). */}
        {current && (
          <View style={styles.gutter}>
            <TouchableOpacity
              style={styles.continueCard}
              onPress={() => router.push('/(tabs)/deck')}
              accessibilityRole="button"
              accessibilityLabel={`Weiterlernen: ${current.category}`}
              activeOpacity={0.9}
            >
              <Text style={styles.continueEyebrow}>Weiterlernen</Text>
              <Text style={styles.continueTitle}>{current.category}</Text>
              {themaEnglish(current.category) && (
                <Text style={styles.continueSub}>{themaEnglish(current.category)}</Text>
              )}
              <Text style={styles.continueCount}>
                {currentDone} von {current.total} Wörtern
              </Text>
              <View style={styles.continueBarBg}>
                <View
                  style={[
                    styles.continueBarFill,
                    { width: `${current.total > 0 ? (currentDone / current.total) * 100 : 0}%` },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* 5 — Themen shelf */}
        {loading ? (
          <ActivityIndicator color={Colors.textMuted} style={styles.loader} />
        ) : themen.length > 0 && (
          <SectionShelf title={`Themen · ${level}`}>
            {themen.map(t => (
              <TouchableOpacity
                key={t.category}
                style={styles.tile}
                onPress={() => router.push('/(tabs)/deck')}
                accessibilityRole="button"
                accessibilityLabel={t.category}
                activeOpacity={0.85}
              >
                <View style={styles.tileArt}>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={[styles.stripe, { left: i * 26 - 20 }]} />
                  ))}
                </View>
                <Text style={styles.tileTitle} numberOfLines={2}>{t.category}</Text>
                <Text style={styles.tileCount}>{t.total} Wörter</Text>
              </TouchableOpacity>
            ))}
          </SectionShelf>
        )}

        {/* 6 — Fällig heute */}
        <View style={styles.gutter}>
          <Eyebrow right={<Text style={styles.dueTotal}>{counts[level] ?? 0} gesamt</Text>}>
            Fällig heute
          </Eyebrow>
          {due.length === 0 ? (
            <Text style={styles.empty}>
              Nichts fällig. Karten erscheinen hier, sobald du sie im Deck bewertet hast.
            </Text>
          ) : (
            due.map(word => <WordRow key={word.id} word={word} onPress={openWord} />)
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { paddingTop: Space.sm, paddingBottom: 40, gap: Space.xxl },
  gutter: { paddingHorizontal: Space.gutter },
  chipRow: { paddingLeft: Space.gutter },
  loader: { marginVertical: Space.xl },

  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: Space.lg },
  greetingText: { flex: 1, gap: 2 },
  date: { ...Type.eyebrow, color: Colors.textMuted },
  hello: { ...Type.title, color: Colors.white },
  period: { color: Colors.purple },
  helloEn: { ...Type.caption, color: Colors.textMuted },
  levelCircle: {
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  levelCircleText: { ...Type.meta, color: Colors.white },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: 18,
    gap: Space.lg,
  },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: Space.lg },
  goalCopy: { flex: 1 },
  goalMinutes: { ...Type.bodyL, color: Colors.white },
  goalDue: { ...Type.caption, color: Colors.textMuted, marginTop: 2 },
  statRow: {
    flexDirection: 'row', gap: Space.xxl,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
    paddingTop: Space.lg,
  },

  continueCard: {
    backgroundColor: Colors.purple,
    borderRadius: Radius.card,
    padding: 18,
    gap: Space.xs,
  },
  continueEyebrow: { ...Type.eyebrow, color: Colors.black },
  continueTitle: { ...Type.title, fontSize: 24, lineHeight: 28, color: Colors.black },
  continueSub: { ...Type.caption, color: Colors.black },
  continueCount: { ...Type.meta, color: Colors.black, marginTop: Space.sm },
  continueBarBg: {
    height: 4, borderRadius: 2, marginTop: Space.xs,
    backgroundColor: Colors.onPurpleTrack, overflow: 'hidden',
  },
  continueBarFill: { height: '100%', borderRadius: 2, backgroundColor: Colors.black },

  tile: {
    width: 150,
    gap: Space.sm,
  },
  tileArt: {
    height: 88,
    borderRadius: Radius.tile,
    backgroundColor: Colors.surface2,
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    top: -20, bottom: -20, width: 10,
    backgroundColor: Colors.surface3,
    transform: [{ rotate: '20deg' }],
  },
  tileTitle: { ...Type.bodyL, color: Colors.white },
  tileCount: { ...Type.meta, color: Colors.textMuted },

  dueTotal: { ...Type.eyebrow, color: Colors.textMuted },
  empty: { ...Type.body, color: Colors.textMuted, paddingVertical: Space.sm },
});
