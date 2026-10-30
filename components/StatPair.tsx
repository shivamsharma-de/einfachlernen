import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Type, Space } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles, useTheme } from '../context/theme';

/** The number-over-mono-label unit used on Home and Progress.
 *  `color` tints the value only — the label stays `textMuted` for contrast. */
export function StatPair({ value, label, color: colorProp }: {
  value: string | number;
  label: string;
  color?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const color = colorProp ?? colors.text;
  return (
    <View style={styles.wrap}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  wrap: { gap: 2 },
  value: { ...Type.title, fontSize: 26, lineHeight: 30 },
  label: { ...Type.eyebrow, color: c.textMuted },
});
