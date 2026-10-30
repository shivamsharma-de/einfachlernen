import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Type, Radius, Space, HIT } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles, useTheme } from '../context/theme';

export type PillVariant = 'primary' | 'ghost' | 'light';

/** primary = violet fill + black text (§5). Violet is only ever a *fill* behind
 *  black text, never small text on the dark ground (§8). */
export function PillButton({ label, variant = 'primary', onPress, disabled, style }: {
  label: string;
  variant?: PillVariant;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.8}
    >
      <Text style={[styles.label, styles[labelKey[variant]]]} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  base: {
    minHeight: HIT,
    borderRadius: Radius.pill,
    paddingVertical: 13,
    paddingHorizontal: Space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: c.purple },
  light: { backgroundColor: c.inverseFill },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border },
  disabled: { opacity: 0.4 },
  label: { ...Type.bodyL, textAlign: 'center' },
  labelPrimary: { color: c.onAccent },
  labelLight: { color: c.inverseText },
  labelGhost: { color: c.text },
});

const labelKey = { primary: 'labelPrimary', light: 'labelLight', ghost: 'labelGhost' } as const;
