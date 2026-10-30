import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Type, Space } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles } from '../context/theme';

/** The uppercase mono section label. Smallest type in the system — §3 says it
 *  must never drop below `textMuted`, so the colour is not overridable. */
export function Eyebrow({ children, right }: { children: string; right?: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{children}</Text>
      {right}
    </View>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space.sm,
  },
  // Wraps rather than truncates — German section labels are long (§8).
  label: { ...Type.eyebrow, color: c.textMuted, flexShrink: 1 },
});
