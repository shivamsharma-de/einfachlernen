/**
 * Mein Wörterbuch: the learner's private dictionary. Words are shown in the same structure as
 * the master dictionary (German, article, meaning, example, synonyms). Only the learner sees
 * these rows (RLS). A word can be added by typing it; the model writes its entry.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Type, Space, Radius, HIT, ARTICLE_COLOR } from '../constants/Colors';
import { Eyebrow, LevelBadge, PillButton } from '../components';
import { useAuth } from '../context/auth';
import { levelsOf } from '../lib/profile';
import { fetchMyWords, deleteMyWord, type PersonalWord } from '../lib/dictionary';
import { lookupWord, importScanWords, type Candidate } from '../lib/ocr';
import type { CEFRLevel } from '../types/index';

export default function MyWordsScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const level = levelsOf(profile)[0];

  const [words, setWords] = useState<PersonalWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [looking, setLooking] = useState(false);
  const [preview, setPreview] = useState<Candidate | null>(null);
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchMyWords();
    if (res.ok) {
      setWords(res.data);
      setError(null);
    } else {
      setError(res.error);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const lookup = useCallback(async () => {
    const word = query.trim();
    if (!word) return;
    setLooking(true);
    setError(null);
    setPreview(null);
    setLookupNote(null);
    const res = await lookupWord(word, level);
    setLooking(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.data.catalogue.length > 0) {
      setLookupNote(`„${res.data.catalogue[0].german}“ ist schon im Wörterbuch.`);
      return;
    }
    if (res.data.candidates.length === 0) {
      setLookupNote(res.data.alreadyYours > 0 ? 'Dieses Wort hast du schon.' : 'Kein Eintrag gefunden.');
      return;
    }
    setPreview(res.data.candidates[0]);
  }, [query, level]);

  const save = useCallback(async () => {
    if (!preview) return;
    setSaving(true);
    setError(null);
    const res = await importScanWords(null, [], [preview]);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPreview(null);
    setQuery('');
    await load();
  }, [preview, load]);

  const remove = useCallback((w: PersonalWord) => {
    Alert.alert(
      'Wort löschen?',
      `„${w.german}“ wird aus deinem Wörterbuch und aus dem Deck entfernt. Deine bisherigen Antworten bleiben erhalten.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const res = await deleteMyWord(w.id);
              if (!res.ok) {
                setError(res.error);
                return;
              }
              await load();
            })();
          },
        },
      ],
    );
  }, [load]);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Zurück">
          <Text style={styles.backText}>Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mein Wörterbuch</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Eyebrow>Wort hinzufügen</Eyebrow>
        <View style={styles.addRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="z. B. Zauberstab"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => { void lookup(); }}
            style={styles.input}
            accessibilityLabel="Deutsches Wort eingeben"
          />
          <PillButton label="Nachschlagen" variant="ghost" onPress={() => { void lookup(); }} />
        </View>
        {looking && <ActivityIndicator color={Colors.textMuted} />}
        {lookupNote && <Text style={styles.note}>{lookupNote}</Text>}
        {preview && (
          <View style={styles.card}>
            <WordFields
              article={preview.article}
              german={preview.german}
              level={preview.level}
              english={preview.english}
              example={preview.example_de}
              exampleEn={preview.example_en}
              synonyms={preview.synonyms}
              badge={preview.uncertain ? 'KI · unsicher' : 'KI'}
            />
            <PillButton label={saving ? 'Speichere…' : 'In mein Wörterbuch'} onPress={() => { if (!saving) void save(); }} />
          </View>
        )}

        <Eyebrow>{words ? `Meine Wörter · ${words.length}` : 'Meine Wörter'}</Eyebrow>
        {words === null && !error && <ActivityIndicator color={Colors.textMuted} />}
        {words !== null && words.length === 0 && (
          <Text style={styles.empty}>Noch keine eigenen Wörter. Scanne eine Seite oder schlage oben ein Wort nach.</Text>
        )}
        {words?.map((w) => (
          <View key={w.id} style={styles.card}>
            <WordFields
              article={w.article}
              german={w.german}
              level={w.level}
              english={w.english}
              example={w.example_de ?? ''}
              exampleEn={w.example_en ?? ''}
              synonyms={w.synonyms}
              badge={w.meaning_source === 'user' ? 'Du' : w.uncertain ? 'KI · unsicher' : 'KI'}
            />
            <TouchableOpacity onPress={() => remove(w)} accessibilityRole="button" accessibilityLabel={`${w.german} löschen`} style={styles.delete}>
              <Text style={styles.deleteText}>Löschen</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function WordFields(props: {
  article: string | null; german: string; level: CEFRLevel; english: string;
  example: string; exampleEn: string; synonyms: string[]; badge?: string;
}) {
  return (
    <View style={styles.fields}>
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
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space.gutter, paddingVertical: Space.md, gap: Space.md },
  back: { minHeight: HIT, justifyContent: 'center' },
  backText: { ...Type.body, color: Colors.purple },
  title: { ...Type.title, color: Colors.white, flex: 1 },
  content: { padding: Space.gutter, gap: Space.md, paddingBottom: 40 },
  error: { ...Type.caption, color: Colors.red },
  note: { ...Type.body, color: Colors.textMuted },
  empty: { ...Type.body, color: Colors.textMuted },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  input: {
    flex: 1, minHeight: HIT, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, paddingHorizontal: Space.lg, color: Colors.white, ...Type.body,
  },
  card: {
    padding: Space.lg, gap: Space.md, borderRadius: Radius.card, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  fields: { gap: Space.xs },
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
  delete: { alignSelf: 'flex-end', minHeight: HIT, justifyContent: 'center' },
  deleteText: { ...Type.body, color: Colors.red },
});
