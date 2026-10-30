import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Type, Radius } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles } from '../context/theme';
import { CEFRLevel } from '../types';

/** Mono level tag: `surface2` fill, `textMuted` text. Neutral by design — the
 *  saturated levelA1…levelC2 colours are reserved for the Progress bars (§2). */
export function LevelBadge({ level }: { level: CEFRLevel }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{level}</Text>
    </View>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  badge: {
    backgroundColor: c.surface2,
    borderRadius: Radius.chip,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  text: { ...Type.meta, color: c.textMuted },
});
