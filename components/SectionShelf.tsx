import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Space } from '../constants/Colors';
import { Eyebrow } from './Eyebrow';

/** Horizontal scroll container with the standard gutters: 12px gaps between
 *  items, 20px end padding (§4).
 *
 *  Renders edge-to-edge, so the parent should NOT apply the screen gutter to
 *  it — the shelf applies its own, letting tiles bleed off the right edge. */
export function SectionShelf({ title, right, children }: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View>
      <View style={styles.header}>
        <Eyebrow right={right}>{title}</Eyebrow>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Space.gutter },
  content: { gap: Space.md, paddingHorizontal: Space.gutter },
});
