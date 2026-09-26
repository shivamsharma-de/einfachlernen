import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Type, Radius, Space, HIT } from '../constants/Colors';

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
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.8}
    >
      <Text style={[styles.label, labelStyles[variant]]} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: HIT,
    borderRadius: Radius.pill,
    paddingVertical: 13,
    paddingHorizontal: Space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: Colors.purple },
  light: { backgroundColor: Colors.white },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border },
  disabled: { opacity: 0.4 },
  label: { ...Type.bodyL, textAlign: 'center' },
});

const labelStyles = StyleSheet.create({
  primary: { color: Colors.black },
  light: { color: Colors.black },
  ghost: { color: Colors.white },
});
