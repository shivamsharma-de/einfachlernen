import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Type, Space, HIT, articleColor } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles, useTheme } from '../context/theme';
import { LevelBadge } from './LevelBadge';
import { Word } from '../types';

/** A single vocabulary row: article in its colour, German in serif, English
 *  caption beneath, level badge right.
 *
 *  The article is always spelled out — colour is never the only signal (§8) —
 *  and text wraps rather than truncating, because German compounds are long. */
export function WordRow({ word, right, onPress }: {
  word: Word;
  right?: React.ReactNode;
  onPress?: (word: Word) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const article = word.article;
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress ? () => onPress(word) : undefined}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${article ? article + ' ' : ''}${word.german}, ${word.english}`}
      activeOpacity={0.7}
    >
      <View style={styles.main}>
        <View style={styles.germanLine}>
          {article && (
            <Text style={[styles.article, { color: articleColor(colors)[article] }]}>{article}</Text>
          )}
          <Text style={styles.german}>{word.german}</Text>
        </View>
        <Text style={styles.english}>{word.english}</Text>
      </View>
      {right ?? <LevelBadge level={word.level} />}
    </TouchableOpacity>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  row: {
    minHeight: HIT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: Space.md,
    // Rows are separated by a hairline, not by gaps (§4).
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  main: { flex: 1, gap: 2 },
  germanLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  article: { ...Type.meta },
  german: { ...Type.word, color: c.text, flexShrink: 1 },
  english: { ...Type.caption, color: c.textMuted },
});
