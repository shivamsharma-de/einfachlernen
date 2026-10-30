import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Type } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles, useTheme } from '../context/theme';

/** Progress ring drawn with an SVG stroke arc.
 *
 *  The web prototype uses a conic gradient; §5 is explicit that RN should not
 *  try to reproduce it, so this is a flat two-circle stroke instead: a track
 *  plus a dash-offset arc.
 *
 *  @param pct 0–1. Clamped, so a >100% day renders as a full ring.
 */
export function ProgressRing({ pct, size = 64, color: colorProp, stroke = 5, label }: {
  pct: number;
  size?: number;
  color?: string;
  stroke?: number;
  label?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const color = colorProp ?? colors.gold;
  const safe = Number.isFinite(pct) ? Math.min(1, Math.max(0, pct)) : 0;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center} cy={center} r={r}
          stroke={colors.surface3} strokeWidth={stroke} fill="none"
        />
        <Circle
          cx={center} cy={center} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safe)}
          strokeLinecap="round"
          // Start the arc at 12 o'clock instead of 3 o'clock.
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {label !== undefined && (
        <View style={[StyleSheet.absoluteFill, styles.labelWrap]}>
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  labelWrap: { alignItems: 'center', justifyContent: 'center' },
  label: { ...Type.meta, color: c.text },
});
