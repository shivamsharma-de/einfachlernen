/**
 * Level selection — PRD F2.1, F2.2, F2.4, F2.5.
 *
 * Six options A1–C2, each with a one-line German description and the **real**
 * word count for that level, read from the `deck_words` view (the same rows the
 * deck serves) rather than a hard-coded "~650 Wörter".
 *
 * The route is `app/onboarding/index.tsx`, not `(onboarding)/index` — CONTRACTS
 * §6 is explicit that a route-group index resolves to `/` and would collide
 * with `(tabs)/index`. The old, unrouted copy in `_screens_auth/(onboarding)/`
 * is left alone: moving it is part of the auth-gate milestone.
 *
 * `LevelOption` and `EstimatedNote` (CONTRACTS §5) have not shipped from the
 * design agent yet, so both are composed inline from existing primitives with
 * the contracted props, ready to swap.
 */
import React, { useCallback, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, HIT, Radius, Space, Type } from '../../constants/Colors';
import { Eyebrow, LevelBadge, PillButton } from '../../components';
import { useAuth } from '../../context/auth';
import { CEFR_LEVELS, isMostlyEstimated, useLevelCounts, type LevelCount } from '../../hooks/useLevelCounts';
import { formatCountDe } from '../../hooks/grammar';
import { completeOnboarding, levelsOf, saveReplayConsent, updateLevels } from '../../lib/profile';
import { LanguageToggle, useI18n } from '../../lib/i18n';
import { track } from '../../lib/analytics';
import type { CEFRLevel } from '../../types';

/** German first, English second (design-spec §6.6). One line each, per F2.1. */
const LEVEL_COPY: Record<CEFRLevel, { de: string; en: string }> = {
  A1: { de: 'Grundlagen — erste Wörter und einfache Sätze', en: 'Absolute beginner' },
  A2: { de: 'Alltag — kurze Gespräche über Vertrautes', en: 'Elementary' },
  B1: { de: 'Selbstständig — Meinungen, Pläne, Erfahrungen', en: 'Intermediate' },
  B2: { de: 'Fortgeschritten — Diskussionen und längere Texte', en: 'Upper intermediate' },
  C1: { de: 'Souverän — Nuancen in Beruf und Studium', en: 'Advanced' },
  C2: { de: 'Muttersprachlich — alles, mühelos', en: 'Mastery' },
};

export default function LevelSelectionScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { lang, t } = useI18n();
  const router = useRouter();
  const { counts, loading: countsLoading, error: countsError } = useLevelCounts();

  const alreadyOnboarded = profile?.onboarding_complete === true;
  const [selected, setSelected] = useState<CEFRLevel[]>(
    alreadyOnboarded ? levelsOf(profile) : [],
  );

  const toggle = useCallback((level: CEFRLevel) => {
    setSelected((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    );
  }, []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // First run only: the learner chooses whether screen recording is allowed, before finishing.
  const [askRecording, setAskRecording] = useState(false);

  const save = useCallback(async () => {
    if (!user || selected.length === 0 || saving) return;
    setSaving(true);
    setSaveError(null);

    // F2.4: changing levels later must not touch progress — `updateLevels`
    // writes the level selection and nothing else.
    const result = alreadyOnboarded
      ? await updateLevels(user.id, selected)
      : await completeOnboarding(user.id, selected);

    if (result.error) {
      track('error_shown', { area: 'onboarding', error_code: 'save_failed' });
      setSaveError(result.error);
      setSaving(false);
      return;
    }

    // Onboarding is also the full level picker from Profil; only the first run is onboarding.
    if (alreadyOnboarded) track('levels_changed', { levels_count: selected.length });
    else track('onboarding_completed', { levels_count: selected.length });
    await refreshProfile();
    router.replace('/(tabs)/deck');
  }, [user, selected, saving, alreadyOnboarded, refreshProfile, router]);

  const chooseRecording = useCallback(async (granted: boolean) => {
    if (!user) return;
    setAskRecording(false);
    await saveReplayConsent(user.id, granted);
    await save();
  }, [user, save]);

  const onStart = useCallback(() => {
    if (alreadyOnboarded) void save();
    else setAskRecording(true);
  }, [alreadyOnboarded, save]);

  return (
    <SafeAreaView style={styles.safe}>
      <Modal visible={askRecording} transparent animationType="fade" onRequestClose={() => setAskRecording(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('Bildschirmaufzeichnung', 'Screen recording')}</Text>
            <Text style={styles.modalBody}>
              {t(
                'Wir teilen Analysedaten mit unserem Dienstleister PostHog (Server in der EU), damit wir verstehen, wo Lernende hängen bleiben. Dazu gehören Bildschirmaufzeichnungen, bei denen Text und Bilder auf deinem Gerät unkenntlich gemacht werden. Verwendet wird deine Konto-ID, nicht dein Name oder deine E-Mail-Adresse. Du kannst deine Entscheidung jederzeit in Profil ändern.',
                'We share analytics with our provider PostHog (EU servers), so we can see where learners get stuck. This includes screen recordings, with text and images blacked out on your device. We use your account ID, not your name or email address. You can change this at any time in Profil.',
              )}
            </Text>
            <PillButton label={t('Zustimmen', 'Agree')} onPress={() => { void chooseRecording(true); }} />
            <PillButton label={t('Nicht jetzt', 'Not now')} variant="ghost" onPress={() => { void chooseRecording(false); }} />
          </View>
        </View>
      </Modal>
      <ScrollView contentContainerStyle={styles.scroll}>
        {alreadyOnboarded ? (
          // Reached from Profil, so this is a change rather than a setup step —
          // and the stack has no header, so this is the only way back out.
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Zurück"
          >
            <Ionicons name="chevron-back" size={18} color={Colors.textMuted} />
            <Text style={styles.backLabel}>{t('Zurück', 'Back')}</Text>
          </TouchableOpacity>
        ) : (
          <Eyebrow>{t('Schritt 1 von 1', 'Step 1 of 1')}</Eyebrow>
        )}
        <LanguageToggle />
        <Text style={styles.title}>{t('Dein Niveau', 'Your level')}</Text>
        <Text style={styles.subtitle}>
          {alreadyOnboarded
            // F2.4 — say plainly that a change is not a reset.
            ? t(
                'Ein neues Niveau ändert nur, welche neuen Wörter dazukommen. Dein Fortschritt bleibt erhalten.',
                'A new level only changes which new words you get. Your progress stays.',
              )
            : t(
                'Wähle das Niveau, auf dem du lernen willst. Du kannst es später im Profil ändern.',
                'Choose the level you want to learn at. You can change it later in your profile.',
              )}
        </Text>

        {countsError && (
          <Text style={styles.countsError}>
            {countsError} — die Auswahl funktioniert trotzdem.
          </Text>
        )}

        <View style={styles.list}>
          {CEFR_LEVELS.map((level) => (
            <LevelOption
              key={level}
              level={level}
              selected={selected.includes(level)}
              count={counts?.[level]}
              countsLoading={countsLoading}
              onPress={() => toggle(level)}
            />
          ))}
        </View>

        {/* The counts are of released words, not of the raw catalogue, so the
            number on a tile is what the deck can actually serve today. */}
        <Text style={styles.footnote}>
          {t('Zahlen zeigen die freigegebenen Wörter je Niveau.', 'Numbers show the released words per level.')}
        </Text>

        {saveError && (
          <View style={styles.saveError}>
            <Text style={styles.saveErrorTitle}>{t('Niveau konnte nicht gespeichert werden.', 'Your level could not be saved.')}</Text>
            <Text style={styles.saveErrorBody}>{saveError}</Text>
          </View>
        )}

        <PillButton
          label={saving ? t('Wird gespeichert…', 'Saving…') : alreadyOnboarded ? t('Niveau speichern', 'Save level') : t('Los geht’s', 'Let’s go')}
          onPress={onStart}
          disabled={selected.length === 0 || saving || !user}
          style={styles.cta}
        />
        {!user && (
          <Text style={styles.signedOut}>
            {t('Melde dich an, um dein Niveau zu speichern.', 'Sign in to save your level.')}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Stands in for `LevelOption` from CONTRACTS §5 (same fields, `count` carries
 *  both the total and the estimated share so F2.5 can be decided per level). */
function LevelOption({ level, selected, count, countsLoading, onPress }: {
  level: CEFRLevel;
  selected: boolean;
  count: LevelCount | undefined;
  countsLoading: boolean;
  onPress: () => void;
}) {
  const { lang, t } = useI18n();
  const copy = LEVEL_COPY[level];
  const estimated = isMostlyEstimated(count);
  // The catalogue is reviewed level by level, so a level can legitimately have
  // nothing released yet (C2, today). Say so rather than printing "0 Wörter"
  // and letting the learner discover it on an empty deck.
  const empty = count !== undefined && count.total === 0;

  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={
        !count
          ? `${level}. ${copy.de}`
          : empty
            ? `${level}. ${copy.de}. ${t('Noch keine Wörter verfügbar', 'No words available yet')}`
            : `${level}. ${copy.de}. ${formatCountDe(count.total)} ${t('Wörter', 'words')}`
      }
    >
      <View style={styles.optionHead}>
        <LevelBadge level={level} />
        {count ? (
          <Text style={styles.count}>
            {empty ? t('Noch keine Wörter', 'No words yet') : `${formatCountDe(count.total)} ${t('Wörter', 'words')}`}
          </Text>
        ) : countsLoading ? (
          <View style={styles.countSkeleton} />
        ) : (
          <Text style={styles.count}>—</Text>
        )}
        <View style={styles.optionSpacer} />
        {selected && <Ionicons name="checkmark-circle" size={22} color={Colors.purple} />}
      </View>

      {/* Wraps rather than truncates — German descriptions are long (§8). */}
      <Text style={styles.optionDe}>{lang === 'de' ? copy.de : copy.en}</Text>
      <Text style={styles.optionEn}>{lang === 'de' ? copy.en : copy.de}</Text>

      {estimated && (
        // F2.5 — most of this level's words were levelled by estimate, not by
        // the ensemble gate. Say so rather than implying exam-grade accuracy.
        <Text style={styles.estimatedNote}>{t('Wortliste geschätzt', 'Estimated word list')}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Space.gutter, paddingTop: Space.xxl, paddingBottom: 40, gap: Space.sm },

  back: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    minHeight: HIT, alignSelf: 'flex-start', paddingRight: Space.md,
  },
  backLabel: { ...Type.eyebrow, color: Colors.textMuted },

  title: { ...Type.title, color: Colors.white },
  subtitle: { ...Type.body, color: Colors.white, marginTop: Space.xs },
  subtitleEn: { ...Type.caption, color: Colors.textMuted },
  countsError: { ...Type.caption, color: Colors.textMuted, marginTop: Space.sm },

  list: { gap: Space.md, marginTop: Space.xl },
  option: {
    minHeight: HIT,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Space.lg,
    gap: 3,
  },
  optionSelected: { borderColor: Colors.purple, backgroundColor: Colors.purpleBg },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, marginBottom: Space.xs },
  optionSpacer: { flex: 1 },
  count: { ...Type.meta, color: Colors.textMuted },
  countSkeleton: { width: 74, height: 11, borderRadius: 4, backgroundColor: Colors.surface3 },
  optionDe: { ...Type.bodyL, color: Colors.white },
  optionEn: { ...Type.caption, color: Colors.textMuted },
  estimatedNote: { ...Type.eyebrow, color: Colors.textMuted, marginTop: Space.sm },
  footnote: { ...Type.caption, color: Colors.textMuted, marginTop: Space.md },

  saveError: {
    marginTop: Space.lg,
    backgroundColor: Colors.redBg,
    borderRadius: Radius.tile,
    padding: Space.md,
    gap: 2,
  },
  saveErrorTitle: { ...Type.bodyL, fontSize: 13.5, color: Colors.red },
  saveErrorBody: { ...Type.caption, color: Colors.textMuted },

  cta: { marginTop: Space.xl },
  modalBackdrop: { flex: 1, backgroundColor: Colors.black, alignItems: 'center', justifyContent: 'center', padding: Space.gutter },
  modalCard: {
    width: '100%', gap: Space.md, padding: Space.xl, borderRadius: Radius.card,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  modalTitle: { ...Type.title, color: Colors.white },
  modalBody: { ...Type.body, color: Colors.textMuted },
  signedOut: { ...Type.caption, color: Colors.textMuted, textAlign: 'center', marginTop: Space.sm },
});
