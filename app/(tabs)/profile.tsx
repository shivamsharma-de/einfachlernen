import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TextInput,
  ActivityIndicator, TouchableOpacity,
  Alert, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Type, Space, Radius, HIT } from '../../constants/Colors';
import type { ColorTokens } from '../../constants/Colors';
import { useThemedStyles, useTheme } from '../../context/theme';
import type { ThemeMode } from '../../lib/theme';
import { SegmentedToggle } from '../../components/SegmentedToggle';
import { Eyebrow, PillButton, StatPair } from '../../components';
import { useAuth } from '../../context/auth';
import { levelsOf, updateLevels, updateDisplayName } from '../../lib/profile';
import { setScanConsent } from '../../lib/ocr';
import { saveSessionTracking } from '../../lib/profile';
import { supabase } from '../../lib/supabase';
import { LanguageToggle, useI18n } from '../../lib/i18n';
import { track } from '../../lib/analytics';
import { fetchToday, fetchStreak, DAILY_MINUTES_GOAL } from '../../lib/activity';
import { stufe } from '../../lib/progress';
import { CEFRLevel } from '../../types';

const LEVELS: readonly CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const LEVEL_NAMES_DE: Record<CEFRLevel, string> = {
  A1: 'Anfänger', A2: 'Grundlagen', B1: 'Mittelstufe',
  B2: 'Gute Mittelstufe', C1: 'Fortgeschritten', C2: 'Muttersprachlich',
};
const LEVEL_NAMES_EN: Record<CEFRLevel, string> = {
  A1: 'Absolute beginner', A2: 'Elementary', B1: 'Intermediate',
  B2: 'Upper intermediate', C1: 'Advanced', C2: 'Mastery',
};

export default function ProfileScreen() {
  const { colors, mode, setMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const { lang, t } = useI18n();
  const LEVEL_NAMES = lang === 'de' ? LEVEL_NAMES_DE : LEVEL_NAMES_EN;

  const [name, setName] = useState('');
  const [savingLevel, setSavingLevel] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
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

  /** Permanent (App Review 5.1.1(v)). Removes the account and every row keyed to it. */
  const confirmDelete = useCallback(() => {
    Alert.alert(
      t('Konto löschen?', 'Delete account?'),
      t(
        'Dein Konto, dein Lernfortschritt und deine Scans werden dauerhaft gelöscht. Das kann nicht rückgängig gemacht werden.',
        'Your account, your progress and your scans will be permanently deleted. This cannot be undone.',
      ),
      [
        { text: t('Abbrechen', 'Cancel'), style: 'cancel' },
        {
          text: t('Endgültig löschen', 'Delete permanently'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const { error } = await supabase.functions.invoke('delete-account');
              if (error) {
                track('error_shown', { area: 'account', error_code: 'delete_failed' });
                Alert.alert(
                  t('Löschen fehlgeschlagen', 'Deletion failed'),
                  t('Bitte versuche es erneut. Dein Konto wurde nicht gelöscht.', 'Please try again. Your account was not deleted.'),
                );
                return;
              }
              track('account_deleted');
              await signOut();
            })();
          },
        },
      ],
    );
  }, [signOut, t]);

  /** Tap a level to add or remove it. At least one must stay selected. */
  const toggleLevel = useCallback(async (target: CEFRLevel) => {
    if (!user) return;
    const next = levels.includes(target)
      ? levels.filter((l) => l !== target)
      : [...levels, target];
    if (next.length === 0) return;
    setSavingLevel(true);
    const res = await updateLevels(user.id, next);
    if (!res.error) track('levels_changed', { levels_count: next.length });
    await refreshProfile();
    setSavingLevel(false);
  }, [user, levels, refreshProfile]);

  const saveName = useCallback(async () => {
    if (!user) return;
    if ((profile?.display_name ?? '') === name.trim()) return;
    await updateDisplayName(user.id, name);
    await refreshProfile();
  }, [user, name, profile?.display_name, refreshProfile]);

  const toggleSessionTracking = useCallback(async () => {
    if (!user) return;
    const res = await saveSessionTracking(user.id, !profile?.replay_consent_at);
    if (res.error) setConsentError(res.error);
    await refreshProfile();
  }, [user, profile?.replay_consent_at, refreshProfile]);

  /** Turning consent on is immediate. Turning it off asks first, because scanning stops at once. */
  const saveConsent = useCallback(async (granted: boolean) => {
    if (!user) return;
    setConsentBusy(true);
    setConsentError(null);
    const result = await setScanConsent(user.id, granted);
    if (result.ok) track('scan_consent_changed', { granted });
    else {
      track('error_shown', { area: 'scan', error_code: 'save_failed' });
      setConsentError(result.error);
    }
    await refreshProfile();
    setConsentBusy(false);
  }, [user, refreshProfile]);

  const toggleScanConsent = useCallback(() => {
    if (!user || !profile) return;
    if (!profile.scan_consent_at) {
      void saveConsent(true);
      return;
    }
    Alert.alert(
      t('Zustimmung widerrufen?', 'Withdraw consent?'),
      t(
        'Ab sofort werden keine Fotos mehr zur Auswertung gesendet. Scannen ist dann nicht möglich. Deine gespeicherten Wörter bleiben erhalten.',
        'From now on, photos are no longer sent for analysis, and scanning stops. Words you have saved stay.',
      ),
      [
        { text: t('Abbrechen', 'Cancel'), style: 'cancel' },
        { text: t('Widerrufen', 'Withdraw'), style: 'destructive', onPress: () => { void saveConsent(false); } },
      ],
    );
  }, [user, profile, saveConsent, t]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={colors.textMuted} /></View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{t('Nicht angemeldet', 'Not signed in')}</Text>
          <Text style={styles.emptyBody}>
            {t('Melde dich an, um dein Niveau und deinen Fortschritt zu speichern.', 'Sign in to save your level and progress.')}
          </Text>
          <PillButton
            label={t('Anmelden', 'Sign in')}
            variant="ghost"
            onPress={() => router.push('/(auth)/login')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.gutter}>
          <LanguageToggle />
          <Text style={styles.title}>{t('Profil', 'Profile')}</Text>
          <Text style={styles.email}>{user.email ?? t('Angemeldet', 'Signed in')}</Text>
        </View>

        {/* Name */}
        <View style={styles.gutter}>
          <Eyebrow>{t('Name', 'Name')}</Eyebrow>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            onSubmitEditing={saveName}
            placeholder="Dein Name"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            accessibilityLabel="Anzeigename"
          />
        </View>

        {/* Level — the single source of truth */}
        <View>
          <View style={styles.gutter}>
            <Eyebrow right={savingLevel ? <ActivityIndicator size="small" color={colors.textMuted} /> : undefined}>
              {t('Niveau', 'Level')}
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
              {t('Bestimmt, welche Wörter du im Deck und beim Scannen bekommst.', 'Decides which words you get in the deck and when scanning.')}
            </Text>
            {/* The chips change the level in one tap; the full picker is where
                the real word counts and the "Wortliste geschätzt" note live. */}
            <TouchableOpacity
              onPress={() => router.push('/onboarding')}
              style={styles.levelLink}
              accessibilityRole="link"
              accessibilityLabel="Alle Niveaus mit Wortzahlen ansehen"
            >
              <Text style={styles.levelLinkText}>{t('Alle Niveaus mit Wortzahlen ansehen', 'See all levels with word counts')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today */}
        <View style={styles.gutter}>
          <Eyebrow>{t('Heute', 'Today')}</Eyebrow>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <StatPair value={streak} label={t('Tage Serie', 'Day streak')} color={colors.gold} />
              <StatPair value={`${minutes}/${DAILY_MINUTES_GOAL}`} label={t('Minuten', 'Minutes')} />
              <StatPair value={cards} label={t('Karten', 'Cards')} />
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <StatPair
                value={profile?.xp ?? 0}
                label={`Punkte · Stufe ${stufe(profile?.xp ?? 0)}`}
              />
            </View>
          </View>
        </View>

        <View style={styles.gutter}>
          <Eyebrow>{t('Session-Tracking', 'Session tracking')}</Eyebrow>
          <View style={styles.consentRow}>
            <Text style={styles.consentText}>
              {profile?.replay_consent_at
                ? t('Session-Tracking: an', 'Session tracking: on')
                : t('Session-Tracking: aus', 'Session tracking: off')}
            </Text>
            <PillButton
              label={profile?.replay_consent_at ? t('Ausschalten', 'Turn off') : t('Einschalten', 'Turn on')}
              variant="ghost"
              onPress={() => { void toggleSessionTracking(); }}
            />
          </View>
        </View>

        {/* Darstellung: follow the phone, or force light or dark. Kept on this device. */}
        <View style={styles.gutter}>
          <Eyebrow>{t('Darstellung', 'Appearance')}</Eyebrow>
          <SegmentedToggle<ThemeMode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'system', label: t('System', 'System') },
              { value: 'light', label: t('Hell', 'Light') },
              { value: 'dark', label: t('Dunkel', 'Dark') },
            ]}
          />
        </View>

        <View style={styles.gutter}>
          <Eyebrow>{t('Fotos auswerten', 'Photo analysis')}</Eyebrow>
          <View style={styles.consentRow}>
            <Text style={styles.consentText}>
              {t(
                'Beim Scannen wird das Foto zur Auswertung an einen KI-Dienst gesendet, ebenso jedes Wort, das du nachschlägst. Gespeichert werden nur die erkannten Wörter.',
                'When you scan, the photo is sent to an AI service for analysis, and so is any word you look up. Only the words found are saved.',
              )}
            </Text>
            {consentBusy
              ? <ActivityIndicator color={colors.textMuted} />
              : (
                <Switch
                  value={!!profile?.scan_consent_at}
                  onValueChange={toggleScanConsent}
                  trackColor={{ false: colors.surface3, true: colors.purple }}
                  thumbColor={colors.inverseFill}
                  accessibilityRole="switch"
                  accessibilityLabel={t('Fotos zur Auswertung senden', 'Send photos for analysis')}
                />
              )}
          </View>
          {consentError ? <Text style={styles.consentError}>{consentError}</Text> : null}
        </View>


        <View style={styles.gutter}>
          <PillButton label={t('Abmelden', 'Sign out')} variant="ghost" onPress={() => { void signOut(); }} />
          <PillButton label={t('Konto löschen', 'Delete account')} variant="ghost" onPress={confirmDelete} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  consentText: { ...Type.caption, color: c.textMuted, flex: 1 },
  consentError: { ...Type.caption, color: c.red },
  safe: { flex: 1, backgroundColor: c.bg },
  content: { paddingTop: Space.lg, paddingBottom: 40, gap: Space.xxl },
  gutter: { paddingHorizontal: Space.gutter, gap: Space.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, paddingHorizontal: Space.gutter },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.gutter, gap: Space.sm },

  title: { ...Type.title, color: c.text },
  email: { ...Type.caption, color: c.textMuted },

  input: {
    minHeight: HIT,
    backgroundColor: c.surface,
    borderRadius: Radius.tile,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: Space.lg,
    ...Type.body,
    color: c.text,
  },

  levelChip: {
    minWidth: HIT, minHeight: HIT, paddingHorizontal: Space.md,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.pill, borderWidth: 1, borderColor: c.textMuted,
  },
  levelChipOn: { borderColor: c.purple, backgroundColor: c.purpleBg },
  levelChipText: { ...Type.meta, color: c.textMuted },
  levelChipTextOn: { color: c.text },
  levelName: { ...Type.bodyL, color: c.text },
  levelHint: { ...Type.caption, color: c.textMuted },
  levelLink: { minHeight: HIT, justifyContent: 'center' },
  levelLinkText: { ...Type.caption, color: c.purple },

  card: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 18,
    gap: Space.lg,
  },
  statRow: { flexDirection: 'row', gap: Space.xxl, flexWrap: 'wrap' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border },

  linkRow: {
    minHeight: HIT,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  linkLabel: { ...Type.body, color: c.text },
  linkChevron: { ...Type.title, fontSize: 22, lineHeight: 24, color: c.textMuted },

  emptyTitle: { ...Type.title, fontSize: 24, lineHeight: 28, color: c.text, textAlign: 'center' },
  emptyBody: { ...Type.body, color: c.textMuted, textAlign: 'center' },
});
