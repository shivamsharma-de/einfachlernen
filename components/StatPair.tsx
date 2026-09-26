import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Type, Space } from '../constants/Colors';

/** The number-over-mono-label unit used on Home and Progress.
 *  `color` tints the value only — the label stays `textMuted` for contrast. */
export function StatPair({ value, label, color = Colors.white }: {
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  value: { ...Type.title, fontSize: 26, lineHeight: 30 },
  label: { ...Type.eyebrow, color: Colors.textMuted },
});
