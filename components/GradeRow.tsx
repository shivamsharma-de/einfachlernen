import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Type, Radius, gradesFor, HIT } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles, useTheme } from '../context/theme';

/** The four SRS grade buttons: Nochmal / Schwer / Gut / Leicht.
 *
 *  `intervals` is required and must be the real next-interval computed by
 *  useSRS for the card on screen — §6.4 is explicit that the prototype's
 *  "1 MIN / 2 TAGE / 6 TAGE / 18 TAGE" is placeholder copy and the button has
 *  to tell the truth. Indexed to match GRADES, so onGrade receives 0..3.
 */
export function GradeRow({ intervals, onGrade }: {
  intervals: readonly [string, string, string, string];
  onGrade: (grade: 0 | 1 | 2 | 3) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      {gradesFor(colors).map((grade, i) => (
        <TouchableOpacity
          key={grade.key}
          style={[styles.button, { backgroundColor: grade.bg, borderColor: grade.color + '66' }]}
          onPress={() => onGrade(i as 0 | 1 | 2 | 3)}
          accessibilityRole="button"
          accessibilityLabel={`${grade.de}, nächste Wiederholung ${intervals[i]}`}
          activeOpacity={0.8}
        >
          <Text style={[styles.label, { color: grade.color }]}>{grade.de}</Text>
          <Text style={styles.interval}>{intervals[i]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  // 4-column grid, 7px gaps (§4).
  row: { flexDirection: 'row', gap: 7 },
  button: {
    flex: 1,
    minHeight: HIT,
    borderRadius: Radius.tile,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: { ...Type.bodyL, fontSize: 13.5, textAlign: 'center' },
  interval: { ...Type.eyebrow, color: c.textMuted, textAlign: 'center' },
});
