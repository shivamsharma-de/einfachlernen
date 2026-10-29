import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Type, Space, Radius, HIT, ARTICLE_COLOR } from '../../constants/Colors';
import { Eyebrow, LevelBadge, PillButton } from '../../components';
import { useAuth } from '../../context/auth';
import { levelsOf } from '../../lib/profile';
import { preparePhoto, scanImage, ScanOutcome } from '../../lib/ocr';
import { addToDeck } from '../../lib/deck';
import { Word } from '../../types';

type Phase = 'idle' | 'busy' | 'done';

/** Word type → the German group heading used in design-spec.md §6.2. */
const GROUPS: { key: string; label: string; types: string[] }[] = [
  { key: 'nomen', label: 'Nomen', types: ['noun'] },
  { key: 'verben', label: 'Verben', types: ['verb'] },
  { key: 'adjektive', label: 'Adjektive', types: ['adjective', 'adverb'] },
];

export default function ScanScreen() {
  const { user, profile } = useAuth();
  // Scan relevance is 'at or above' a floor; with several levels, the lowest is that floor.
  const level = levelsOf(profile)[0];

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  const capture = useCallback(async () => {
    if (!cameraRef.current) return;
    setError(null);
    setPhase('busy');

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1, skipProcessing: true });

      if (!photo?.uri) {
        setError('Aufnahme fehlgeschlagen.');
        setPhase('idle');
        return;
      }

      const base64 = await preparePhoto(photo.uri);
      const result = await scanImage(base64, level);
      if (!result.ok) {
        setError(result.error);
        setPhase('idle');
        return;
      }

      setOutcome(result.data);
      // Every match starts checked (§6.2).
      setSelected(new Set(result.data.words.map(w => w.id)));
      setImported(null);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
      setPhase('idle');
    }
  }, [level]);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const importSelected = useCallback(async () => {
    if (!user || selected.size === 0) return;
    const added = await addToDeck(user.id, [...selected]);
    setImported(added);
  }, [user, selected]);

  const reset = useCallback(() => {
    setPhase('idle');
    setOutcome(null);
    setSelected(new Set());
    setImported(null);
    setError(null);
  }, []);

  // ─── Permission gates ─────────────────────────────────────────────────────

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={Colors.textMuted} /></View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Kamera benötigt</Text>
          <Text style={styles.emptyBody}>
            Erlaube den Kamerazugriff, um Wörter von einer Seite zu scannen.
          </Text>
          <PillButton label="Zugriff erlauben" onPress={() => { void requestPermission(); }} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Harvest ──────────────────────────────────────────────────────────────

  if (phase === 'done' && outcome) {
    const grouped = GROUPS
      .map(g => ({ ...g, words: outcome.words.filter(w => g.types.includes(w.word_type)) }))
      .filter(g => g.words.length > 0);

    const others = outcome.words.filter(
      w => !GROUPS.some(g => g.types.includes(w.word_type)),
    );

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.harvest} showsVerticalScrollIndicator={false}>
          <View style={styles.gutter}>
            <Text style={styles.title}>Gefundene Wörter</Text>
            <Text style={styles.status}>
              {outcome.totalDetected} Wörter erkannt · {outcome.words.length} über {level}
              {outcome.atOrBelowLevel > 0 && ` · ${outcome.atOrBelowLevel} auf deinem Niveau`}
              {outcome.unmatched > 0 && ` · ${outcome.unmatched} unbekannt`}
            </Text>
          </View>

          {outcome.words.length === 0 && (
            <View style={styles.gutter}>
              <Text style={styles.emptyBody}>
                Nichts über deinem Niveau gefunden. Versuche eine andere Seite.
              </Text>
            </View>
          )}

          {[...grouped, ...(others.length ? [{ key: 'weitere', label: 'Weitere', words: others }] : [])]
            .map(group => (
              <View key={group.key} style={styles.gutter}>
                <Eyebrow>{group.label}</Eyebrow>
                {group.words.map(word => (
                  <ScanRow
                    key={word.id}
                    word={word}
                    checked={selected.has(word.id)}
                    onToggle={() => toggle(word.id)}
                  />
                ))}
              </View>
            ))}

          <View style={styles.gutter}>
            {imported === null ? (
              <PillButton
                label={`${selected.size} Wörter ins Deck importieren`}
                onPress={() => { void importSelected(); }}
                disabled={selected.size === 0}
              />
            ) : (
              <PillButton label={`${imported} Wörter im Deck ✓`} variant="light" disabled />
            )}
            <View style={{ height: Space.md }} />
            <PillButton label="Neu scannen" variant="ghost" onPress={reset} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Viewfinder ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.viewfinderWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <View style={styles.frame} pointerEvents="none" />
        <View style={styles.overlay} pointerEvents="box-none">
          <Text style={styles.statusPill}>
            {phase === 'busy' ? 'Erkenne Wörter…' : 'Bereit'}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        {error && <Text style={styles.error}>{error}</Text>}
        {phase === 'busy' ? (
          <ActivityIndicator color={Colors.purple} />
        ) : (
          <PillButton label="Scannen" variant="light" onPress={() => { void capture(); }} />
        )}
      </View>
    </SafeAreaView>
  );
}

function ScanRow({ word, checked, onToggle }: {
  word: Word; checked: boolean; onToggle: () => void;
}) {
  const meta = word.article
    ? `${word.article} · ${typeof word.forms?.plural === 'string' ? word.forms.plural : '—'}`
    : word.word_type;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${word.german}, ${word.english}`}
    >
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.rowMain}>
        <View style={styles.germanLine}>
          {word.article && (
            <Text style={[styles.article, { color: ARTICLE_COLOR[word.article] }]}>{word.article}</Text>
          )}
          <Text style={styles.german}>{word.german}</Text>
        </View>
        <Text style={styles.english}>{word.english}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <LevelBadge level={word.level} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.gutter, gap: Space.md },
  gutter: { paddingHorizontal: Space.gutter, gap: Space.sm },
  harvest: { paddingTop: Space.lg, paddingBottom: 40, gap: Space.xl },

  title: { ...Type.title, color: Colors.white },
  status: { ...Type.meta, color: Colors.textMuted },

  viewfinderWrap: { flex: 1, margin: Space.gutter, borderRadius: Radius.card, overflow: 'hidden', backgroundColor: Colors.black },
  frame: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    margin: Space.xl,
    borderWidth: 2,
    borderColor: Colors.purple,
    borderRadius: Radius.tile,
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'flex-end', padding: Space.xl,
  },
  statusPill: {
    ...Type.eyebrow,
    color: Colors.black,
    backgroundColor: Colors.white,
    paddingHorizontal: Space.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },

  controls: { padding: Space.gutter, gap: Space.md, minHeight: 96, justifyContent: 'center' },
  error: { ...Type.caption, color: Colors.red, textAlign: 'center' },

  row: {
    minHeight: HIT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: Space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: Radius.chip,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Colors.purple, borderColor: Colors.purple },
  checkmark: { ...Type.meta, color: Colors.black },
  rowMain: { flex: 1, gap: 2 },
  germanLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  article: { ...Type.meta },
  german: { ...Type.word, color: Colors.white, flexShrink: 1 },
  english: { ...Type.caption, color: Colors.textMuted },
  meta: { ...Type.meta, color: Colors.textMuted },

  emptyTitle: { ...Type.title, fontSize: 24, lineHeight: 28, color: Colors.white, textAlign: 'center' },
  emptyBody: { ...Type.body, color: Colors.textMuted, textAlign: 'center' },
});
