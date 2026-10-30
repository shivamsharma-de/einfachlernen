import React from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Type, Space, Radius, HIT } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles } from '../context/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Spoken name for screen readers, when the label alone is not enough (e.g. "DE" -> "Deutsch"). */
  accessibilityLabel?: string;
}

/**
 * A row of pills where exactly one is selected. Used for the language switch and the
 * System / Hell / Dunkel setting. Every option is at least 44pt tall.
 */
export function SegmentedToggle<T extends string>({ options, value, onChange }: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={opt.accessibilityLabel ?? opt.label}
            style={[styles.option, on && styles.optionOn]}
            activeOpacity={0.85}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  row: { flexDirection: 'row', alignSelf: 'center', gap: Space.xs },
  option: {
    minWidth: HIT, minHeight: HIT, paddingHorizontal: Space.md,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.pill, borderWidth: 1, borderColor: c.textMuted,
  },
  optionOn: { borderColor: c.purple, backgroundColor: c.purpleBg },
  label: { ...Type.meta, color: c.textMuted },
  labelOn: { color: c.text },
});
