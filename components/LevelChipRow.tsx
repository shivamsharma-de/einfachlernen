import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Type, Radius, Space, HIT } from '../constants/Colors';
import { CEFRLevel } from '../types';

/** Horizontal level picker. Selected = `white` fill / `black` text, unselected =
 *  `border` outline — deliberately neutral so six saturated chips don't compete
 *  with the article colours (§2). */
export function LevelChipRow({ levels, value, onChange }: {
  levels: readonly CEFRLevel[];
  value: CEFRLevel;
  onChange: (level: CEFRLevel) => void;
}) {
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

const styles = StyleSheet.create({
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
  chipOn: { backgroundColor: Colors.white, borderColor: Colors.white },
  chipOff: { backgroundColor: 'transparent', borderColor: Colors.border },
  text: { ...Type.meta },
  textOn: { color: Colors.black },
  textOff: { color: Colors.textMuted },
});
