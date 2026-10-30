/**
 * Scan (scanner v2). The page photo goes to the server, which asks the configured model for the
 * words. The learner reviews the list, ticks what they want, and the chosen words go into their
 * own dictionary (and, for catalogue words, the deck).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Type, Space, Radius, HIT, ARTICLE_COLOR } from '../../constants/Colors';
import { Eyebrow, LevelBadge, PillButton, ScanProgress } from '../../components';
import { useAuth } from '../../context/auth';
import { levelsOf } from '../../lib/profile';
import {
  preparePhoto, scanPhoto, importScanWords, setScanConsent,
  type ScanOutcome, type Candidate, type CatalogueHit,
} from '../../lib/ocr';
import type { CEFRLevel } from '../../types/index';
import { track, timer, type ErrorCode } from '../../lib/analytics';
import { measurePage, getLastMeasureError } from '../../lib/pageMeasure';
import { fetchScanTotals } from '../../lib/dictionary';
import { decidePage, GATE_MESSAGES, type BlockReason } from '../../lib/pageGate';

type Phase = 'idle' | 'busy' | 'review' | 'saved';

/** Analytics codes for gate blocks. Codes only: no photo data, no content. */
const GATE_CODE: Record<BlockReason, ErrorCode> = {
  unavailable: 'gate_unavailable',
  explicit: 'gate_explicit',
  people: 'gate_people',
  no_text: 'gate_no_text',
};

/** Selection keys: catalogue words by id, candidates by their lower-case German. */
const candidateKey = (c: Candidate) => `c:${c.german.toLowerCase()}`;
const catalogueKey = (w: CatalogueHit) => `m:${w.id}`;

export default function ScanScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  // The scan keeps words above the learner's lowest selected level.
  const level = levelsOf(profile)[0];

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [consentBusy, setConsentBusy] = useState(false);
  const [totals, setTotals] = useState<{ saved: number; detected: number } | null>(null);
  const [saving, setSaving] = useState(false);

  /** Shows an error and records its code. The text itself is never tracked. */
  const fail = useCallback((text: string, code: ErrorCode) => {
    track('error_shown', { area: 'scan', error_code: code });
    setError(text);
  }, []);

  const capture = useCallback(async () => {
    if (!cameraRef.current) return;
    setError(null);
    setPhase('busy');
    const sinceCapture = timer();
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1, skipProcessing: true });
      if (!photo?.uri) {
        fail('Aufnahme fehlgeschlagen.', 'capture_failed');
        setPhase('idle');
        return;
      }
      // The strict gate runs on the phone first. A photo that is not clearly a page of text
      // is never sent. Any failed check blocks the photo (fail closed).
      const prepElapsed = timer();
      const prepared = await preparePhoto(photo.uri);
      const prep_ms = prepElapsed();
      track('scan_photo_taken', { image_kb: Math.round((prepared.base64.length * 3) / 4 / 1024) });
      const gateElapsed = timer();
      const measured = await measurePage(prepared);
      const gate = decidePage(measured);
      const gate_ms = gateElapsed();
      if (__DEV__) {
        // Development only: numbers, never the photo or any words, for tuning the gate.
        console.log('page gate', gate.allow ? 'allow' : gate.reason, measured && {
          text: measured.textCoverage.toFixed(2),
          words: measured.wordCount,
          people: measured.humanCoverage.toFixed(3),
          explicit: measured.nsfw && (measured.nsfw.porn + measured.nsfw.hentai + measured.nsfw.sexy).toFixed(3),
        });
      }
      if (!gate.allow) {
        track('scan_result', {
          candidates: 0, catalogue: 0, already_yours: 0,
          duration_ms: sinceCapture(), prep_ms, gate_ms, network_ms: 0,
          ok: false, error_code: GATE_CODE[gate.reason],
        });
        setError(GATE_MESSAGES[gate.reason] + (__DEV__ && getLastMeasureError() ? `\n(dev: ${getLastMeasureError()})` : ''));
        setPhase('idle');
        return;
      }
      const result = await scanPhoto(prepared.base64, level, { prep_ms, gate_ms, sinceCapture });
      if (!result.ok) {
        fail(result.error, result.code);
        setPhase('idle');
        return;
      }
      setOutcome(result.data);
      // Everything the model offers starts ticked; the learner unticks what they do not want.
      setSelected(new Set([
        ...result.data.catalogue.map(catalogueKey),
        ...result.data.candidates.map(candidateKey),
      ]));
      setPhase('review');
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Unbekannter Fehler.', 'unknown');
      setPhase('idle');
    }
  }, [level, fail]);

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    if (!outcome) return;
    const catalogueIds = outcome.catalogue.filter((w) => selected.has(catalogueKey(w))).map((w) => w.id);
    const candidates = outcome.candidates.filter((c) => selected.has(candidateKey(c)));
    if (catalogueIds.length + candidates.length === 0) return;

    setError(null);
    setSaving(true);
    const result = await importScanWords(outcome.scanId, catalogueIds, candidates);
    setSaving(false);
    if (!result.ok) {
      fail(result.error, 'save_failed');
      return;
    }
    track('scan_saved', { count: catalogueIds.length + candidates.length });
    setSavedCount(catalogueIds.length + candidates.length);
    setPhase('saved');
  }, [outcome, selected, fail]);

  const grant = useCallback(async () => {
    if (!user) return;
    setConsentBusy(true);
    const result = await setScanConsent(user.id, true);
    setConsentBusy(false);
    if (!result.ok) {
      fail(result.error, 'save_failed');
      return;
    }
    track('scan_consent_changed', { granted: true });
    await refreshProfile();
  }, [user, refreshProfile, fail]);

  const again = useCallback(() => {
    setPhase('idle');
    setOutcome(null);
    setSelected(new Set());
    setError(null);
  }, []);

  useEffect(() => { track('scan_opened'); }, []);

  // Cumulative totals for this learner, refreshed when the screen state changes.
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const res = await fetchScanTotals();
      if (res.ok) setTotals({ saved: res.saved, detected: res.detected });
    })();
  }, [user, phase]);

  // ─── Permissions and consent ─────────────────────────────────────────────

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
          <Text style={styles.emptyBody}>Erlaube den Kamerazugriff, um Wörter von einer Seite zu scannen.</Text>
          <PillButton label="Zugriff erlauben" onPress={() => { void requestPermission(); }} />
        </View>
      </SafeAreaView>
    );
  }

  if (profile && !profile.scan_consent_at) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Fotos auswerten</Text>
          <Text style={styles.emptyBody}>
            Zum Erkennen der Wörter wird dein Foto an einen KI-Dienst gesendet, ebenso jedes Wort, das du
            nachschlägst. Gespeichert werden nur die erkannten Wörter, nicht das Foto. Du kannst deine Zustimmung jederzeit widerrufen.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {consentBusy
            ? <ActivityIndicator color={Colors.textMuted} />
            : <PillButton label="Zustimmen und scannen" onPress={() => { void grant(); }} />}
        </View>
      </SafeAreaView>
    );
  }

  // ─── Review ──────────────────────────────────────────────────────────────

  if (phase === 'review' && outcome) {
    const chosen = selected.size;
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.review} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Gefundene Wörter</Text>
          <Text style={styles.status}>
            {outcome.totalDetected} erkannt · {outcome.candidates.length} neu für dich
            {outcome.catalogue.length > 0 && ` · ${outcome.catalogue.length} im Wörterbuch`}
            {outcome.alreadyYours > 0 && ` · ${outcome.alreadyYours} schon in deinem Wörterbuch`}
            {outcome.belowLevel > 0 && ` · ${outcome.belowLevel} auf deinem Niveau`}
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {outcome.candidates.length > 0 && (
            <>
              <Eyebrow>Neu für dein Wörterbuch</Eyebrow>
              {outcome.candidates.map((c) => {
                const key = candidateKey(c);
                return (
                  <WordCardRow
                    key={key}
                    on={selected.has(key)}
                    onPress={() => toggle(key)}
                    article={c.article}
                    german={c.german}
                    english={c.english}
                    level={c.level}
                    example={c.example_de}
                    exampleEn={c.example_en}
                    synonyms={c.synonyms}
                    badge={c.uncertain ? 'KI · unsicher' : 'KI'}
                  />
                );
              })}
            </>
          )}

          {outcome.catalogue.length > 0 && (
            <>
              <Eyebrow>Im Wörterbuch</Eyebrow>
              {outcome.catalogue.map((w) => {
                const key = catalogueKey(w);
                return (
                  <WordCardRow
                    key={key}
                    on={selected.has(key)}
                    onPress={() => toggle(key)}
                    article={w.article}
                    german={w.german}
                    english={w.english}
                    level={w.level}
                    example={w.example_de ?? ''}
                    exampleEn={w.example_en ?? ''}
                    synonyms={w.synonyms}
                  />
                );
              })}
            </>
          )}

          {outcome.candidates.length === 0 && outcome.catalogue.length === 0 && (
            <Text style={styles.emptyBody}>Keine neuen Wörter über deinem Niveau.</Text>
          )}

          <PillButton
            label={saving ? 'Speichere…' : chosen > 0 ? `${chosen} Wörter speichern` : 'Keine Wörter gewählt'}
            onPress={() => { if (chosen > 0) void save(); }}
          />
          <PillButton label="Anderes Foto" variant="ghost" onPress={again} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Saved ───────────────────────────────────────────────────────────────

  if (phase === 'saved') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{savedCount} Wörter gespeichert</Text>
          <Text style={styles.emptyBody}>Sie stehen in deinem Wörterbuch und im Deck.</Text>
          <PillButton label="Mein Wörterbuch" onPress={() => router.push('/my-words')} />
          <PillButton label="Weiter scannen" variant="ghost" onPress={again} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Camera ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        {phase === 'busy' && (
          <View style={styles.busy}>
            <ScanProgress />
          </View>
        )}
      </View>
      <View style={styles.controls}>
        {error ? <Text style={styles.error}>{error}</Text> : <Text style={styles.hint}>Halte die Seite ruhig ins Bild.</Text>}
        {totals && (
          <Text style={styles.totals}>
            Insgesamt: {totals.saved} Wörter in deinem Wörterbuch · {totals.detected} erkannt in allen Scans
          </Text>
        )}
        <PillButton label="Foto aufnehmen" onPress={() => { if (phase === 'idle') void capture(); }} />
        <PillButton label="Mein Wörterbuch" variant="ghost" onPress={() => router.push('/my-words')} />
      </View>
    </SafeAreaView>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function WordCardRow(props: {
  on: boolean; onPress: () => void; article: string | null; german: string; english: string;
  level: CEFRLevel; example: string; exampleEn: string; synonyms: string[]; badge?: string;
}) {
  return (
    <TouchableOpacity
      onPress={props.onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: props.on }}
      accessibilityLabel={`${props.article ? props.article + ' ' : ''}${props.german}, ${props.english}`}
      style={[styles.row, props.on && styles.rowOn]}
      activeOpacity={0.85}
    >
      <View style={[styles.box, props.on && styles.boxOn]}>
        {props.on && <Text style={styles.tick}>✓</Text>}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          {props.article ? <Text style={[styles.article, { color: ARTICLE_COLOR[props.article as keyof typeof ARTICLE_COLOR] }]}>{props.article}</Text> : null}
          <Text style={styles.german}>{props.german}</Text>
          <LevelBadge level={props.level} />
          {props.badge ? <Text style={styles.badge}>{props.badge}</Text> : null}
        </View>
        <Text style={styles.english}>{props.english}</Text>
        {props.example ? <Text style={styles.example}>{props.example}</Text> : null}
        {props.exampleEn ? <Text style={styles.exampleEn}>{props.exampleEn}</Text> : null}
        {props.synonyms.length > 0 && (
          <View style={styles.chips}>
            {props.synonyms.map((s) => <Text key={s} style={styles.chip}>{s}</Text>)}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.gutter, gap: Space.md },
  emptyTitle: { ...Type.title, color: Colors.white, textAlign: 'center' },
  emptyBody: { ...Type.body, color: Colors.textMuted, textAlign: 'center' },
  error: { ...Type.caption, color: Colors.red, textAlign: 'center' },
  hint: { ...Type.caption, color: Colors.textMuted, textAlign: 'center' },
  totals: { ...Type.meta, color: Colors.white, textAlign: 'center' },
  cameraWrap: { flex: 1, overflow: 'hidden', borderRadius: Radius.card, margin: Space.gutter, backgroundColor: Colors.surface },
  busy: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: Space.sm, backgroundColor: Colors.bg },
  controls: { padding: Space.gutter, gap: Space.md },
  review: { padding: Space.gutter, gap: Space.md, paddingBottom: 40 },
  title: { ...Type.title, color: Colors.white },
  status: { ...Type.caption, color: Colors.textMuted },
  row: {
    flexDirection: 'row', gap: Space.md, padding: Space.md, minHeight: HIT,
    borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  rowOn: { borderColor: Colors.purple },
  box: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.textMuted,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  boxOn: { backgroundColor: Colors.purple, borderColor: Colors.purple },
  tick: { color: Colors.black, fontWeight: '700' },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: Space.sm },
  article: { ...Type.word, fontWeight: '600' },
  german: { ...Type.word, color: Colors.white },
  badge: { ...Type.meta, color: Colors.purple },
  english: { ...Type.bodyL, color: Colors.white },
  example: { ...Type.body, color: Colors.white },
  exampleEn: { ...Type.caption, color: Colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs },
  chip: {
    ...Type.meta, color: Colors.textMuted, paddingHorizontal: Space.sm, paddingVertical: 2,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border,
  },
});
