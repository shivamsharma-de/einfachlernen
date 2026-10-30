import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Type, Radius, Space, HIT } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles } from '../context/theme';
import { CEFRLevel } from '../types';

/** Horizontal level picker. Selected = `white` fill / `black` text, unselected =
 *  `border` outline — deliberately neutral so six saturated chips don't compete
 *  with the article colours (§2). */
export function LevelChipRow({ levels, value, onChange }: {
  levels: readonly CEFRLevel[];
  value: CEFRLevel;
  onChange: (level: CEFRLevel) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {levels.map(level => {
        const selected = level === value;
        return (
          <TouchableOpacity
            key={level}
            style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
            onPress={() => onChange(level)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Niveau ${level}`}
            activeOpacity={0.8}
          >
            <Text style={[styles.text, selected ? styles.textOn : styles.textOff]}>{level}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  content: { gap: Space.sm, paddingRight: Space.xl },
  chip: {
    minHeight: HIT,
    minWidth: 54,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipOn: { backgroundColor: c.inverseFill, borderColor: c.inverseFill },
  chipOff: { backgroundColor: 'transparent', borderColor: c.border },
  text: { ...Type.meta },
  textOn: { color: c.inverseText },
  textOff: { color: c.textMuted },
});
