import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Type, Space, Radius } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles } from '../context/theme';
import { estimatedProgress, stageLabel, tipAt } from '../lib/scanTips';

/** Progress while a page is being read. The bar is a time-based estimate, not a measurement;
 *  it only jumps to done when the answer arrives (the screen then leaves this view). */
export function ScanProgress() {
  const styles = useThemedStyles(makeStyles);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed((Date.now() - started) / 1000), 250);
    return () => clearInterval(timer);
  }, []);

  const progress = estimatedProgress(elapsed);
  const percent = Math.round(progress * 100);
  const tip = tipAt(Math.floor(elapsed / 5));

  return (
    <View style={styles.wrap}>
      <Text style={styles.stage}>{stageLabel(progress)}</Text>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        accessibilityLabel="Fortschritt"
      >
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.meta}>{percent} % · {Math.round(elapsed)} s</Text>
      <View style={styles.tipBox}>
        <Text style={styles.tipLabel}>Wusstest du?</Text>
        <Text style={styles.tip}>{tip}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  wrap: { width: '86%', gap: Space.sm, alignItems: 'stretch' },
  stage: { ...Type.bodyL, color: c.text, textAlign: 'center' },
  track: { height: 8, borderRadius: Radius.pill, backgroundColor: c.surface3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill, backgroundColor: c.purple },
  meta: { ...Type.meta, color: c.textMuted, textAlign: 'center' },
  tipBox: {
    marginTop: Space.md, padding: Space.lg, gap: Space.xs, borderRadius: Radius.card,
    borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
  },
  tipLabel: { ...Type.eyebrow, color: c.textMuted },
  tip: { ...Type.body, color: c.text },
});
