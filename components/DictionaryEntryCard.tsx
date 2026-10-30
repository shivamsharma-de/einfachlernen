import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Type, Space, Radius, articleColor } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles, useTheme } from '../context/theme';
import { LevelBadge } from './LevelBadge';
import type { CEFRLevel } from '../types/index';

/** One dictionary entry, shown the same way for the master dictionary, the learner's own words,
 *  and an AI result. Every field the master dictionary keeps is shown when it exists. */
export interface EntryFields {
  article: string | null;
  german: string;
  word_type: string;
  english: string;
  level: CEFRLevel;
  example_de: string | null;
  example_en: string | null;
  synonyms: string[];
}

const TYPE_LABEL: Record<string, string> = {
  noun: 'Nomen',
  verb: 'Verb',
  adjective: 'Adjektiv',
  adverb: 'Adverb',
  phrase: 'Redewendung',
  conjunction: 'Konjunktion',
  preposition: 'Präposition',
  pronoun: 'Pronomen',
  number: 'Zahlwort',
  interjection: 'Interjektion',
};

export function EntryCard(props: EntryFields & { badge?: string; footer?: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const articleTint = props.article ? articleColor(colors)[props.article as keyof ReturnType<typeof articleColor>] : undefined;
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.eyebrow}>{TYPE_LABEL[props.word_type] ?? props.word_type}</Text>
        <View style={styles.badges}>
          {props.badge ? <Text style={styles.badge}>{props.badge}</Text> : null}
          <LevelBadge level={props.level} />
        </View>
      </View>
      <View style={styles.headRow}>
        {props.article ? <Text style={[styles.article, { color: articleTint }]}>{props.article}</Text> : null}
        <Text style={styles.german}>{props.german}</Text>
      </View>
      <Text style={styles.english}>{props.english}</Text>
      {props.example_de ? <Text style={styles.example}>{props.example_de}</Text> : null}
      {props.example_en ? <Text style={styles.exampleEn}>{props.example_en}</Text> : null}
      {props.synonyms.length > 0 && (
        <View style={styles.chips}>
          <Text style={styles.synLabel}>Synonyme</Text>
          {props.synonyms.map((s) => <Text key={s} style={styles.chip}>{s}</Text>)}
        </View>
      )}
      {props.footer}
    </View>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  card: {
    padding: Space.lg, gap: Space.xs, borderRadius: Radius.card, borderWidth: 1,
    borderColor: c.border, backgroundColor: c.surface,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badges: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  badge: { ...Type.meta, color: c.purple },
  eyebrow: { ...Type.eyebrow, color: c.textMuted },
  headRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: Space.sm, marginTop: Space.xs },
  article: { ...Type.word, fontWeight: '600' },
  german: { ...Type.word, color: c.text },
  english: { ...Type.bodyL, color: c.text },
  example: { ...Type.body, color: c.text, marginTop: Space.xs },
  exampleEn: { ...Type.caption, color: c.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs, alignItems: 'center', marginTop: Space.xs },
  synLabel: { ...Type.meta, color: c.textMuted, marginRight: Space.xs },
  chip: {
    ...Type.meta, color: c.textMuted, paddingHorizontal: Space.sm, paddingVertical: 2,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: c.border,
  },
});
