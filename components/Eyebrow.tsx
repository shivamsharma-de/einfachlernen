import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Type, Space } from '../constants/Colors';

/** The uppercase mono section label. Smallest type in the system — §3 says it
 *  must never drop below `textMuted`, so the colour is not overridable. */
export function Eyebrow({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space.sm,
  },
  // Wraps rather than truncates — German section labels are long (§8).
  label: { ...Type.eyebrow, color: Colors.textMuted, flexShrink: 1 },
});
