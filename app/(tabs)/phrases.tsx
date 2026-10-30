/**
 * Wörter: the master dictionary and the learner's own words, searched together.
 *
 * A search matches German or English in both. If nothing matches, the word is looked up with
 * the AI model, and the result can be saved to the learner's own dictionary with every field
 * the dictionary keeps (article, part of speech, level, meaning, examples, synonyms).
 * The Redemittel list stays available as the second segment.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Type, Space, Radius, HIT } from '../../constants/Colors';
import type { ColorTokens } from '../../constants/Colors';
import { useThemedStyles, useTheme } from '../../context/theme';
import { PillButton, Eyebrow } from '../../components';
import { EntryCard } from '../../components/DictionaryEntryCard';
import { PhrasesList } from '../../components/PhrasesList';
import { useAuth } from '../../context/auth';
import { levelsOf } from '../../lib/profile';
import { searchDictionary, cleanQuery, type DictionaryEntry } from '../../lib/dictionary';
import { lookupWord, importScanWords, type Candidate } from '../../lib/ocr';
import { track } from '../../lib/analytics';

type Segment = 'dictionary' | 'phrases';

export default function WoerterScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { profile } = useAuth();
  const level = levelsOf(profile)[0];

  const [segment, setSegment] = useState<Segment>('dictionary');
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<DictionaryEntry[] | null>(null);
  const [ai, setAi] = useState<{ word: string; candidate: Candidate | null; note: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDefault = useCallback(async () => {
    setLoading(true);
    const res = await searchDictionary('');
    setLoading(false);
    if (res.ok) setEntries(res.data);
    else setError(res.error);
  }, []);

  useEffect(() => { void loadDefault(); }, [loadDefault]);

  const search = useCallback(async () => {
    const word = cleanQuery(query);
    setError(null);
    setAi(null);
    setSaved(false);
    if (!word) {
      await loadDefault();
      return;
    }
    setLoading(true);
    const res = await searchDictionary(word);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEntries(res.data);
    track('word_looked_up', { found: res.data.length > 0 ? 'catalogue' : 'none' });
    if (res.data.length > 0) return;

    // Nothing in either dictionary: ask the AI model.
    setAiLoading(true);
    const looked = await lookupWord(word, level);
    setAiLoading(false);
    if (!looked.ok) {
      setAi({ word, candidate: null, note: looked.error });
      track('word_looked_up', { found: 'none' });
      return;
    }
    const candidate = looked.data.candidates[0] ?? null;
    const master = looked.data.catalogue[0];
    if (master) {
      setAi({ word, candidate: null, note: `„${master.german}“ steht im Wörterbuch. Suche noch einmal, um es zu finden.` });
      track('word_looked_up', { found: 'catalogue' });
      return;
    }
    if (!candidate) {
      setAi({ word, candidate: null, note: looked.data.alreadyYours > 0 ? 'Dieses Wort hast du schon.' : 'Kein Eintrag gefunden.' });
      track('word_looked_up', { found: 'none' });
      return;
    }
    setAi({ word, candidate, note: null });
    track('word_looked_up', { found: 'candidate' });
  }, [query, level, loadDefault]);

  const saveAi = useCallback(async () => {
    if (!ai?.candidate) return;
    setSaving(true);
    const res = await importScanWords(null, [], [ai.candidate]);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSaved(true);
    await loadDefault();
  }, [ai, loadDefault]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Wörter</Text>
        <View style={styles.segment}>
          <SegmentButton label="Wörterbuch" active={segment === 'dictionary'} onPress={() => setSegment('dictionary')} />
          <SegmentButton label="Redemittel" active={segment === 'phrases'} onPress={() => setSegment('phrases')} />
        </View>
      </View>

      {segment === 'phrases' ? (
        <PhrasesList />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => { void search(); }}
              placeholder="Deutsch oder Englisch suchen"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={styles.input}
              accessibilityLabel="Wörter suchen"
            />
            <PillButton label="Suchen" variant="ghost" onPress={() => { void search(); }} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading && <ActivityIndicator color={colors.textMuted} />}

          {!loading && entries !== null && (
            <>
              <Eyebrow>{query.trim() ? `Treffer · ${entries.length}` : `Wörterbuch · ${entries.length}`}</Eyebrow>
              {entries.length === 0 && !aiLoading && !ai && (
                <Text style={styles.muted}>Keine Treffer.</Text>
              )}
              {entries.map((e) => (
                <EntryCard
                  key={`${e.source}-${e.id}`}
                  article={e.article}
                  german={e.german}
                  word_type={e.word_type}
                  english={e.english}
                  level={e.level}
                  example_de={e.example_de}
                  example_en={e.example_en}
                  synonyms={e.synonyms}
                  badge={e.source === 'personal' ? 'Du' : undefined}
                />
              ))}
            </>
          )}

          {aiLoading && (
            <View style={styles.aiBox}>
              <ActivityIndicator color={colors.textMuted} />
              <Text style={styles.muted}>Die KI sucht „{query.trim()}“…</Text>
            </View>
          )}

          {ai && (
            <>
              <Eyebrow>KI-Suche</Eyebrow>
              {ai.candidate ? (
                <EntryCard
                  article={ai.candidate.article}
                  german={ai.candidate.german}
                  word_type={ai.candidate.word_type}
                  english={ai.candidate.english}
                  level={ai.candidate.level}
                  example_de={ai.candidate.example_de}
                  example_en={ai.candidate.example_en}
                  synonyms={ai.candidate.synonyms}
                  badge={ai.candidate.uncertain ? 'KI · unsicher' : 'KI'}
                  footer={
                    saved ? (
                      <Text style={styles.saved}>In deinem Wörterbuch gespeichert.</Text>
                    ) : (
                      <PillButton
                        label={saving ? 'Speichere…' : 'In mein Wörterbuch speichern'}
                        onPress={() => { if (!saving) void saveAi(); }}
                      />
                    )
                  }
                />
              ) : (
                <Text style={styles.muted}>{ai.note}</Text>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SegmentButton(props: { label: string; active: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: props.active }}
      style={[styles.segmentButton, props.active && styles.segmentActive]}
    >
      <Text style={[styles.segmentText, props.active && styles.segmentTextActive]}>{props.label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: { paddingHorizontal: Space.gutter, paddingVertical: Space.md, gap: Space.md },
  title: { ...Type.title, color: c.text },
  segment: {
    flexDirection: 'row', padding: 4, borderRadius: Radius.pill, borderWidth: 1,
    borderColor: c.border, backgroundColor: c.surface,
  },
  segmentButton: { flex: 1, minHeight: HIT - 8, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill },
  segmentActive: { backgroundColor: c.purple },
  segmentText: { ...Type.body, color: c.textMuted },
  segmentTextActive: { color: c.onAccent, fontWeight: '600' },
  content: { padding: Space.gutter, gap: Space.md, paddingBottom: 40 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  input: {
    flex: 1, minHeight: HIT, borderRadius: Radius.card, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surface, paddingHorizontal: Space.lg, color: c.text, ...Type.body,
  },
  error: { ...Type.caption, color: c.red },
  muted: { ...Type.body, color: c.textMuted },
  saved: { ...Type.body, color: c.green },
  aiBox: { alignItems: 'center', gap: Space.sm, padding: Space.lg },
});
