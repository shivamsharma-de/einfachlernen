import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Type, Radius, Space, articleColor } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles, useTheme } from '../context/theme';
import { WordEnrichment } from '../lib/ai';
import { Word } from '../types';

/** Deck card. `surface` fill with a `border` hairline, min 264px, tap anywhere
 *  to reveal (§6.4). Front is article + serif German; the back adds a divider,
 *  English, grammar in mono, and one example sentence.
 *
 *  `enrichment` is the AI entry (PRD v2 D3) and is optional throughout: the card
 *  renders fully from seeded data, and AI content only replaces a field when it
 *  actually arrived. A failed or slow generation never blanks the card. */
export function WordCard({ word, revealed, onFlip, enrichment, enriching }: {
  word: Word;
  revealed: boolean;
  onFlip: () => void;
  enrichment?: WordEnrichment | null;
  enriching?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const article = word.article;

  // Prefer AI grammar, fall back to the seeded `forms` blob.
  const seededPlural = typeof word.forms?.plural === 'string' ? word.forms.plural : null;
  const grammar = enrichment?.grammar?.plural ?? seededPlural;

  const meaning = enrichment?.meaning ?? word.english;
  const example = enrichment?.examples?.[0]
    ?? (word.example_de ? { de: word.example_de, en: word.example_en ?? '' } : null);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onFlip}
      accessibilityRole="button"
      accessibilityLabel={revealed ? 'Karte umdrehen' : `${word.german}, aufdecken`}
      activeOpacity={0.9}
    >
      <View style={styles.front}>
        {article && (
          <Text style={[styles.article, { color: articleColor(colors)[article] }]}>{article}</Text>
        )}
        <Text style={styles.german}>{word.german}</Text>
      </View>

      {revealed && (
        <View style={styles.back}>
          <Text style={styles.english}>{meaning}</Text>
          {grammar && <Text style={styles.grammar}>{grammar}</Text>}

          {enrichment?.description && (
            <Text style={styles.description}>{enrichment.description}</Text>
          )}

          {example && (
            <View style={styles.example}>
              <Text style={styles.exampleDe}>{example.de}</Text>
              {example.en.length > 0 && <Text style={styles.exampleEn}>{example.en}</Text>}
            </View>
          )}

          {enriching && !enrichment && (
            <ActivityIndicator size="small" color={colors.textDim} />
          )}
        </View>
      )}

      <Text style={styles.hint}>
        {revealed ? 'Wie gut hast du es gewusst?' : 'Tippen zum Umdrehen'}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  card: {
    minHeight: 264,
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 18,
    justifyContent: 'center',
    gap: Space.lg,
  },
  front: { alignItems: 'center', gap: Space.xs },
  article: { ...Type.meta },
  german: { ...Type.headword, color: c.text, textAlign: 'center' },
  back: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingTop: Space.lg,
    gap: Space.sm,
    alignItems: 'center',
  },
  english: { ...Type.body, fontSize: 19, lineHeight: 24, color: c.text, textAlign: 'center' },
  grammar: { ...Type.meta, color: c.textMuted, textAlign: 'center' },
  description: { ...Type.caption, color: c.textMuted, textAlign: 'center' },
  example: { gap: 2, marginTop: Space.sm },
  exampleDe: { ...Type.body, color: c.text, textAlign: 'center' },
  exampleEn: { ...Type.caption, color: c.textMuted, textAlign: 'center' },
  hint: { ...Type.eyebrow, color: c.textMuted, textAlign: 'center' },
});
