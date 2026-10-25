import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TextInput,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Type, Space, Radius, HIT } from '../../constants/Colors';
import { Eyebrow, PillButton, StatPair } from '../../components';
import { useAuth } from '../../context/auth';
import { levelsOf, updateLevels, updateDisplayName } from '../../lib/profile';
import { fetchToday, fetchStreak, DAILY_MINUTES_GOAL } from '../../lib/activity';
import { stufe } from '../../lib/progress';
import { CEFRLevel } from '../../types';

const LEVELS: readonly CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const LEVEL_NAMES: Record<CEFRLevel, string> = {
  A1: 'Anfänger', A2: 'Grundlagen', B1: 'Mittelstufe',
  B2: 'Gute Mittelstufe', C1: 'Fortgeschritten', C2: 'Muttersprachlich',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();

  const [name, setName] = useState('');
  const [savingLevel, setSavingLevel] = useState(false);
  const [minutes, setMinutes] = useState(0);
  const [cards, setCards] = useState(0);
  const [streak, setStreak] = useState(0);

  const levels = levelsOf(profile);

  useEffect(() => {
    setName(profile?.display_name ?? '');
  }, [profile?.display_name]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const [today, streakValue] = await Promise.all([fetchToday(user.id), fetchStreak()]);
      if (cancelled) return;
      setMinutes(today?.minutes ?? 0);
      setCards(today?.cards_reviewed ?? 0);
      setStreak(streakValue);
    })();
    return () => { cancelled = true; };
  }, [user]);

  /** Tap a level to add or remove it. At least one must stay selected. */
  const toggleLevel = useCallback(async (target: CEFRLevel) => {
    if (!user) return;
    const next = levels.includes(target)
      ? levels.filter((l) => l !== target)
      : [...levels, target];
    if (next.length === 0) return;
    setSavingLevel(true);
    await updateLevels(user.id, next);
    await refreshProfile();
    setSavingLevel(false);
  }, [user, levels, refreshProfile]);

  const saveName = useCallback(async () => {
    if (!user) return;
    if ((profile?.display_name ?? '') === name.trim()) return;
    await updateDisplayName(user.id, name);
    await refreshProfile();
  }, [user, name, profile?.display_name, refreshProfile]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={Colors.textMuted} /></View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Nicht angemeldet</Text>
          <Text style={styles.emptyBody}>
            Melde dich an, um dein Niveau und deinen Fortschritt zu speichern.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.gutter}>
          <Text style={styles.title}>Profil</Text>
          <Text style={styles.email}>{user.email ?? 'Angemeldet'}</Text>
        </View>

        {/* Name */}
        <View style={styles.gutter}>
          <Eyebrow>Name</Eyebrow>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            onSubmitEditing={saveName}
            placeholder="Dein Name"
            placeholderTextColor={Colors.textMuted}
            returnKeyType="done"
            accessibilityLabel="Anzeigename"
          />
        </View>

        {/* Level — the single source of truth */}
        <View>
          <View style={styles.gutter}>
            <Eyebrow right={savingLevel ? <ActivityIndicator size="small" color={Colors.textMuted} /> : undefined}>
              Niveau
            </Eyebrow>
          </View>
          <View style={styles.chipRow}>
            {LEVELS.map((l) => {
              const on = levels.includes(l);
              return (
                <TouchableOpacity
                  key={l}
                  onPress={() => { void toggleLevel(l); }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${l}, ${on ? 'ausgewählt' : 'nicht ausgewählt'}`}
                  style={[styles.levelChip, on && styles.levelChipOn]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.levelChipText, on && styles.levelChipTextOn]}>{l}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.gutter}>
            <Text style={styles.levelName}>{levels.map((l) => LEVEL_NAMES[l]).join(' + ')}</Text>
            <Text style={styles.levelHint}>
              Bestimmt, welche Wörter du im Deck und beim Scannen bekommst.
            </Text>
            {/* The chips change the level in one tap; the full picker is where
                the real word counts and the "Wortliste geschätzt" note live. */}
            <TouchableOpacity
              onPress={() => router.push('/onboarding')}
              style={styles.levelLink}
              accessibilityRole="link"
              accessibilityLabel="Alle Niveaus mit Wortzahlen ansehen"
            >
              <Text style={styles.levelLinkText}>Alle Niveaus mit Wortzahlen ansehen</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today */}
        <View style={styles.gutter}>
          <Eyebrow>Heute</Eyebrow>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <StatPair value={streak} label="Tage Serie" color={Colors.gold} />
              <StatPair value={`${minutes}/${DAILY_MINUTES_GOAL}`} label="Minuten" />
              <StatPair value={cards} label="Karten" />
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <StatPair
                value={profile?.xp ?? 0}
                label={`XP · Stufe ${stufe(profile?.xp ?? 0)}`}
              />
            </View>
          </View>
        </View>

        {/* Ranks lives inside Profil per design-spec.md §6.6 */}
        <View style={styles.gutter}>
          <Eyebrow>Mehr</Eyebrow>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/(tabs)/leaderboard')}
            accessibilityRole="button"
            accessibilityLabel="Rangliste öffnen"
          >
            <Text style={styles.linkLabel}>Rangliste</Text>
            <Text style={styles.linkChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gutter}>
          <PillButton label="Abmelden" variant="ghost" onPress={() => { void signOut(); }} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingTop: Space.lg, paddingBottom: 40, gap: Space.xxl },
  gutter: { paddingHorizontal: Space.gutter, gap: Space.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, paddingHorizontal: Space.gutter },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.gutter, gap: Space.sm },

  title: { ...Type.title, color: Colors.white },
  email: { ...Type.caption, color: Colors.textMuted },

  input: {
    minHeight: HIT,
    backgroundColor: Colors.surface,
    borderRadius: Radius.tile,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingHorizontal: Space.lg,
    ...Type.body,
    color: Colors.white,
  },

  levelChip: {
    minWidth: HIT, minHeight: HIT, paddingHorizontal: Space.md,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.textMuted,
  },
  levelChipOn: { borderColor: Colors.purple, backgroundColor: Colors.purpleBg },
  levelChipText: { ...Type.meta, color: Colors.textMuted },
  levelChipTextOn: { color: Colors.white },
  levelName: { ...Type.bodyL, color: Colors.white },
  levelHint: { ...Type.caption, color: Colors.textMuted },
  levelLink: { minHeight: HIT, justifyContent: 'center' },
  levelLinkText: { ...Type.caption, color: Colors.purple },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: 18,
    gap: Space.lg,
  },
  statRow: { flexDirection: 'row', gap: Space.xxl, flexWrap: 'wrap' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },

  linkRow: {
    minHeight: HIT,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  linkLabel: { ...Type.body, color: Colors.white },
  linkChevron: { ...Type.title, fontSize: 22, lineHeight: 24, color: Colors.textMuted },

  emptyTitle: { ...Type.title, fontSize: 24, lineHeight: 28, color: Colors.white, textAlign: 'center' },
  emptyBody: { ...Type.body, color: Colors.textMuted, textAlign: 'center' },
});
