/**
 * Fortschritt (plan §4, M3): what the learner has done, read from the account on the
 * server, so a reinstall shows the same numbers. Nothing here is computed on the device;
 * each figure comes from one server function.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Type, Space, Radius, HIT } from '../constants/Colors';
import { useAuth } from '../context/auth';
import { levelsOf } from '../lib/profile';
import { useI18n } from '../lib/i18n';
import { fetchToday, fetchRecent, fetchStreak, DAILY_MINUTES_GOAL, type DailyActivity } from '../lib/activity';
import { levelProgress, type LevelProgress } from '../lib/api';
import { fetchLights, type LightCounts } from '../lib/test';
import type { CEFRLevel } from '../types/index';

const pct = (part: number, whole: number) => (`${whole > 0 ? Math.min(100, (part / whole) * 100) : 0}%` as const);

export default function ProgressScreen() {
  const { user, profile } = useAuth();
  const { t, lang } = useI18n();
  const router = useRouter();
  const levels = levelsOf(profile);
  const levelKey = levels.join(',');

  const [today, setToday] = useState<DailyActivity | null>(null);
  const [week, setWeek] = useState<DailyActivity[]>([]);
  const [streak, setStreak] = useState(0);
  const [levelRows, setLevelRows] = useState<LevelProgress[]>([]);
  const [lights, setLights] = useState<LightCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const lvls = levelKey.split(',').filter(Boolean) as CEFRLevel[];
    setLoading(true);
    setError(null);
    Promise.all([fetchToday(user.id), fetchRecent(user.id, 7), fetchStreak(), levelProgress(), fetchLights(lvls)]).then(
      ([todayRow, weekRows, streakDays, levelResult, lightResult]) => {
        if (cancelled) return;
        setToday(todayRow);
        setWeek(weekRows);
        setStreak(streakDays);
        if (levelResult.ok) setLevelRows(levelResult.data);
        else setError(levelResult.error);
        if (lightResult.ok) setLights(lightResult.data);
        else setError(lightResult.error);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [user, levelKey]);

  const minutes = today?.minutes ?? 0;
  const weekMax = Math.max(1, ...week.map((d) => d.cards_reviewed));
  const weekday = (day: string) =>
    new Date(`${day}T12:00:00`).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { weekday: 'short' });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel={t('Zurück', 'Back')}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('Fortschritt', 'Progress')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.textMuted} style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Today */}
          <Text style={styles.eyebrow}>{t('HEUTE', 'TODAY')}</Text>
          <View style={styles.row}>
            <Stat value={`${minutes}/${DAILY_MINUTES_GOAL}`} label={t('Minuten', 'minutes')} color={Colors.purple} />
            <Stat value={String(today?.cards_reviewed ?? 0)} label={t('Karten', 'cards')} color={Colors.white} />
            <Stat value={String(today?.xp_earned ?? 0)} label="XP" color={Colors.gold} />
          </View>

          {/* Account totals */}
          <View style={styles.row}>
            <Stat value={String(streak)} label={t('Tage Serie', 'day streak')} color={Colors.gold} />
            <Stat value={String(profile?.xp ?? 0)} label={t('XP gesamt', 'XP total')} color={Colors.gold} />
          </View>

          {/* Last seven days */}
          <Text style={styles.eyebrow}>{t('LETZTE 7 TAGE', 'LAST 7 DAYS')}</Text>
          <View style={styles.card}>
            {week.length === 0 ? (
              <Text style={styles.muted}>{t('Noch keine Aktivität.', 'No activity yet.')}</Text>
            ) : (
              week.map((d) => (
                <View key={d.day} style={styles.weekRow}>
                  <Text style={styles.weekDay}>{weekday(d.day)}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: pct(d.cards_reviewed, weekMax) }]} />
                  </View>
                  <Text style={styles.weekCount}>{d.cards_reviewed}</Text>
                </View>
              ))
            )}
          </View>

          {/* Levels */}
          <Text style={styles.eyebrow}>{t('STUFEN', 'LEVELS')}</Text>
          <View style={styles.card}>
            {levelRows.map((r) => (
              <View key={r.level} style={styles.levelBlock}>
                <View style={styles.levelTop}>
                  <Text style={styles.levelName}>{r.level}</Text>
                  <Text style={styles.muted}>
                    {t(`${r.introduced} von ${r.total} eingeführt`, `${r.introduced} of ${r.total} introduced`)}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: pct(r.introduced, r.total) }]} />
                </View>
                <Text style={styles.muted}>
                  {t(`${r.mastered} gemeistert · ${r.due} fällig`, `${r.mastered} mastered · ${r.due} due`)}
                </Text>
              </View>
            ))}
          </View>

          {/* Traffic light */}
          <Text style={styles.eyebrow}>{t('TESTS', 'TESTS')}</Text>
          <View style={styles.card}>
            {lights ? (
              <>
                <LightLine color={Colors.green} n={lights.green} label={t('sicher (zweimal richtig)', 'secure (two in a row)')} />
                <LightLine color={Colors.gold} n={lights.yellow} label={t('einmal richtig', 'correct once')} />
                <LightLine color={Colors.red} n={lights.red} label={t('zuletzt falsch', 'recently wrong')} />
                <LightLine color={Colors.textMuted} n={lights.grey} label={t('noch nie getestet', 'never tested')} />
              </>
            ) : (
              <Text style={styles.muted}>{t('Noch keine Tests.', 'No tests yet.')}</Text>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LightLine({ color, n, label }: { color: string; n: number; label: string }) {
  return (
    <View style={styles.lightLine}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.lightLabel}>{label}</Text>
      <Text style={styles.lightCount}>{n}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingHorizontal: Space.lg, paddingVertical: Space.md },
  back: { minWidth: HIT, minHeight: HIT, alignItems: 'center', justifyContent: 'center' },
  backText: { ...Type.title, color: Colors.white },
  title: { ...Type.title, color: Colors.white },
  loader: { marginTop: Space.xl },
  content: { paddingHorizontal: Space.lg, paddingBottom: Space.xl, gap: Space.md },
  error: { ...Type.caption, color: Colors.red },
  eyebrow: { ...Type.eyebrow, color: Colors.textMuted, marginTop: Space.sm },
  row: { flexDirection: 'row', gap: Space.sm },
  stat: {
    flex: 1, padding: Space.md, borderRadius: Radius.card, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.surface, gap: 2,
  },
  statValue: { ...Type.title, fontSize: 22 },
  statLabel: { ...Type.caption, color: Colors.textMuted },
  card: {
    padding: Space.lg, borderRadius: Radius.card, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.surface, gap: Space.md,
  },
  muted: { ...Type.caption, color: Colors.textMuted },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  weekDay: { ...Type.caption, color: Colors.textMuted, width: 40 },
  weekCount: { ...Type.caption, color: Colors.white, width: 32, textAlign: 'right' },
  barTrack: { flex: 1, height: 8, borderRadius: Radius.pill, backgroundColor: Colors.surface3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: Colors.purple },
  levelBlock: { gap: Space.xs },
  levelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  levelName: { ...Type.bodyL, color: Colors.white },
  lightLine: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, minHeight: HIT },
  dot: { width: 12, height: 12, borderRadius: 6 },
  lightLabel: { ...Type.bodyL, color: Colors.white, flex: 1 },
  lightCount: { ...Type.bodyL, color: Colors.white },
});
