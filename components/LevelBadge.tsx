import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Type, Radius } from '../constants/Colors';
import { CEFRLevel } from '../types';

/** Mono level tag: `surface2` fill, `textMuted` text. Neutral by design — the
 *  saturated levelA1…levelC2 colours are reserved for the Progress bars (§2). */
export function LevelBadge({ level }: { level: CEFRLevel }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.surface2,
    borderRadius: Radius.chip,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  text: { ...Type.meta, color: Colors.textMuted },
});
