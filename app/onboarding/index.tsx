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
import { completeOnboarding, levelsOf, updateLevels } from '../../lib/profile';
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
      setSaveError(result.error);
      setSaving(false);
      return;
    }

    track('onboarding_completed', { levels: selected.join(',') });
    await refreshProfile();
    router.replace('/(tabs)/deck');
  }, [user, selected, saving, alreadyOnboarded, refreshProfile, router]);

  return (
    <SafeAreaView style={styles.safe}>
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
            <Text style={styles.backLabel}>Zurück</Text>
          </TouchableOpacity>
        ) : (
          <Eyebrow>Schritt 1 von 1</Eyebrow>
        )}
        <Text style={styles.title}>Dein Niveau</Text>
        <Text style={styles.subtitle}>
          {alreadyOnboarded
            // F2.4 — say plainly that a change is not a reset.
            ? 'Ein neues Niveau ändert nur, welche neuen Wörter dazukommen. Dein Fortschritt bleibt erhalten.'
            : 'Wähle das Niveau, auf dem du lernen willst. Du kannst es später im Profil ändern.'}
        </Text>
        <Text style={styles.subtitleEn}>Choose the level you want to learn at.</Text>

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
        <Text style={styles.footnote}>Zahlen zeigen die freigegebenen Wörter je Niveau.</Text>

        {saveError && (
          <View style={styles.saveError}>
            <Text style={styles.saveErrorTitle}>Niveau konnte nicht gespeichert werden.</Text>
            <Text style={styles.saveErrorBody}>{saveError}</Text>
          </View>
        )}

        <PillButton
          label={saving ? 'Wird gespeichert…' : alreadyOnboarded ? 'Niveau speichern' : 'Los geht’s'}
          onPress={() => { void save(); }}
          disabled={selected.length === 0 || saving || !user}
          style={styles.cta}
        />
        {!user && (
          <Text style={styles.signedOut}>
            Melde dich an, um dein Niveau zu speichern.
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
            ? `${level}. ${copy.de}. Noch keine Wörter verfügbar`
            : `${level}. ${copy.de}. ${formatCountDe(count.total)} Wörter`
      }
    >
      <View style={styles.optionHead}>
        <LevelBadge level={level} />
        {count ? (
          <Text style={styles.count}>
            {empty ? 'Noch keine Wörter' : `${formatCountDe(count.total)} Wörter`}
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
      <Text style={styles.optionDe}>{copy.de}</Text>
      <Text style={styles.optionEn}>{copy.en}</Text>

      {estimated && (
        // F2.5 — most of this level's words were levelled by estimate, not by
        // the ensemble gate. Say so rather than implying exam-grade accuracy.
        <Text style={styles.estimatedNote}>Wortliste geschätzt</Text>
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
  signedOut: { ...Type.caption, color: Colors.textMuted, textAlign: 'center', marginTop: Space.sm },
});
