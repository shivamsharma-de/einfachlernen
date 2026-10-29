import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Type, Space, Radius, THEMEN } from '../../constants/Colors';
import { themeForCategory } from '../../constants/Themes';
import { SvgXml } from 'react-native-svg';
import { Eyebrow, ProgressRing, StatPair, SectionShelf, WordRow, PillButton } from '../../components';
import { fetchLights, type LightCounts } from '../../lib/test';
import { useI18n } from '../../lib/i18n';
import { countByLevel, levelThemes, dueWords, type ThemeSummary } from '../../lib/api';
import type { DeckWord } from '../../types/contracts';
import { useAuth } from '../../context/auth';
import { levelsOf } from '../../lib/profile';
import { fetchToday, fetchStreak, DAILY_MINUTES_GOAL } from '../../lib/activity';
import { stufe } from '../../lib/progress';
import { track } from '../../lib/analytics';
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

/** WordRow renders a Word; the server returns a DeckWord. Only display fields are needed. */
function toWordRow(w: DeckWord): Word {
  return {
    id: w.id,
    level: w.level,
    category: w.thema ?? 'Allgemein',
    word_type: w.word_type,
    german: w.german,
    article: w.article,
    english: w.english,
    pronunciation: null,
    cultural_context: null,
    synonyms: [],
    antonyms: [],
    forms: w.forms as Word['forms'],
    hint: null,
    example_de: w.example_de,
    example_en: w.example_en,
    distractors: [],
    source: w.origin,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  useEffect(() => { track('home_opened'); }, []);

  // Level is read-only here — it is chosen in Profil and nowhere else (PRD v2 D1).
  const levels = levelsOf(profile);
  const levelKey = levels.join(',');
  const levelLabel = levels.join(' · ');

  const [themes, setThemes] = useState<ThemeSummary[]>([]);
  const [due, setDue] = useState<DeckWord[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [minutes, setMinutes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lights, setLights] = useState<LightCounts | null>(null);
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);

  // Catalogue size per level: server-counted, so it is correct past 1,000 rows.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await countByLevel();
      if (cancelled || !result.ok) return;
      setCounts(Object.fromEntries(Object.entries(result.data).map(([k, v]) => [k, v.total])));
    })();
    return () => { cancelled = true; };
  }, []);

  // Today's activity and streak. Due cards are loaded with the level below.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const [today, streakValue] = await Promise.all([fetchToday(user.id), fetchStreak()]);
      if (cancelled) return;
      setMinutes(today?.minutes ?? 0);
      setStreak(streakValue);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Themen shelf and due list. Both come from the server, so neither is capped.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const lvls = levelKey.split(',') as typeof levels;
      const [themeResult, dueResult, lightResult] = await Promise.all([levelThemes(lvls), dueWords(), fetchLights(lvls)]);
      if (lightResult.ok) setLights(lightResult.data);
      if (cancelled) return;
      setThemes(themeResult.ok ? themeResult.data : []);
      setDue(dueResult.ok ? dueResult.data : []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [levelKey, user]);

  const now = new Date();
  const hello = greeting(now.getHours());

  // Themen shelf: server-side totals, largest theme first.
  const themen = useMemo(
    () => themes.map(t => ({ category: t.thema, total: t.total, started: t.started })),
    [themes],
  );

  // Continue card targets the largest Thema at this level. `done` is the
  // server's count of words in it the learner has actually started.
  const current = themen[0] ?? null;
  const currentDone = current ? themes[0]?.started ?? 0 : 0;

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
              <Text style={styles.levelCircleText}>{levels.length > 1 ? `${levels.length}×` : levels[0]}</Text>
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

        {/* 4b — Test. Counts come from the traffic light, so it shows only what the learner has studied. */}
        {!loading && (
          <View style={styles.gutter}>
            <View style={styles.testCard}>
              <Eyebrow>{t('Test dich', 'Test yourself')}</Eyebrow>
              {lights && lights.studied > 0 ? (
                <>
                  <View style={styles.testBar}>
                    {[
                      { n: lights.green, c: Colors.green },
                      { n: lights.yellow, c: Colors.gold },
                      { n: lights.red, c: Colors.red },
                      { n: lights.grey, c: Colors.textMuted },
                    ].map((seg, i) => (
                      <View key={i} style={{ flex: Math.max(seg.n, 0) / lights.studied, backgroundColor: seg.c, height: 8 }} />
                    ))}
                  </View>
                  <Text style={styles.testLegend}>
                    {t(`${lights.green} sicher · ${lights.yellow} auf dem Weg · ${lights.red} üben · ${lights.grey} neu`,
                       `${lights.green} secure · ${lights.yellow} on the way · ${lights.red} to practise · ${lights.grey} new`)}
                  </Text>
                  <PillButton label={t('10 Fragen starten', 'Start 10 questions')} variant="ghost" onPress={() => router.push('/test')} />
                </>
              ) : (
                <Text style={styles.testLegend}>
                  {t('Lerne zuerst ein paar Karten, dann kannst du dich testen.', 'Study a few cards first, then you can test yourself.')}
                </Text>
              )}
              <PillButton label={t('Fortschritt ansehen', 'View progress')} variant="ghost" onPress={() => router.push('/progress')} />
            </View>
          </View>
        )}

        {/* 5 — Themen shelf */}
        {loading ? (
          <ActivityIndicator color={Colors.textMuted} style={styles.loader} />
        ) : themen.length > 0 && (
          <SectionShelf title={`Themen · ${levelLabel}`}>
            {themen.map(t => (
              <TouchableOpacity
                key={t.category}
                style={styles.tile}
                onPress={() => {
                  const theme = themeForCategory(t.category);
                  if (theme) track('theme_opened', { theme_id: theme.id, band: theme.band });
                  router.push('/(tabs)/deck');
                }}
                accessibilityRole="button"
                accessibilityLabel={t.category}
                activeOpacity={0.85}
              >
                {(() => {
                  const theme = themeForCategory(t.category);
                  return (
                    <View style={[styles.tileArt, { backgroundColor: theme?.bg ?? Colors.surface2 }]}>
                      {theme && <Text style={[styles.tileBand, { color: theme.fg }]}>{theme.band}</Text>}
                      {theme && (
                        <View style={styles.tileIcon}>
                          <SvgXml xml={theme.xml} width={56} height={56} color={theme.fg} />
                        </View>
                      )}
                    </View>
                  );
                })()}
                <Text style={styles.tileTitle} numberOfLines={2}>{t.category}</Text>
                <Text style={styles.tileCount}>{t.total} Wörter</Text>
              </TouchableOpacity>
            ))}
          </SectionShelf>
        )}

        {/* 6 — Fällig heute */}
        <View style={styles.gutter}>
          <Eyebrow right={<Text style={styles.dueTotal}>{levels.reduce((sum, l) => sum + (counts[l] ?? 0), 0)} gesamt</Text>}>
            Fällig heute
          </Eyebrow>
          {due.length === 0 ? (
            <Text style={styles.empty}>
              Nichts fällig. Karten erscheinen hier, sobald du sie im Deck bewertet hast.
            </Text>
          ) : (
            due.map(word => <WordRow key={word.id} word={toWordRow(word)} onPress={openWord} />)
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  testCard: { gap: Space.md, padding: Space.lg, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.textMuted },
  testBar: { flexDirection: 'row', borderRadius: Radius.pill, overflow: 'hidden', backgroundColor: Colors.textMuted },
  testLegend: { ...Type.caption, color: Colors.textMuted },
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
    height: 96,
    borderRadius: Radius.tile,
    overflow: 'hidden',
  },
  tileBand: { ...Type.meta, position: 'absolute', top: Space.sm, left: Space.md },
  tileIcon: { position: 'absolute', right: Space.sm, bottom: Space.sm },
  tileTitle: { ...Type.bodyL, color: Colors.white },
  tileCount: { ...Type.meta, color: Colors.textMuted },

  dueTotal: { ...Type.eyebrow, color: Colors.textMuted },
  empty: { ...Type.body, color: Colors.textMuted, paddingVertical: Space.sm },
});
