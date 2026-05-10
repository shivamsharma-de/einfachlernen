import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { redemittel, PHRASE_CATEGORIES, PhraseCategory, Phrase } from '../../data/redemittel';

const REGISTER_COLOR: Record<string, string> = {
  formal: Colors.blue,
  informal: Colors.green,
  neutral: Colors.textMuted,
};

const USAGE_COLOR: Record<string, string> = {
  spoken: Colors.green,
  written: Colors.purple,
  both: Colors.gold,
};

const LEVEL_COLOR: Record<string, string> = {
  A1: Colors.levelA1,
  A2: Colors.levelA2,
  B1: Colors.levelB1,
  B2: Colors.levelB2,
};

export default function PhrasesScreen() {
  const [activeCategory, setActiveCategory] = useState<PhraseCategory | 'All'>('All');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const filtered = activeCategory === 'All'
    ? redemittel
    : redemittel.filter(p => p.category === activeCategory);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>🗣 REDEMITTEL & PHRASES</Text>
          <Text style={styles.heroTitle}>Speak Like a Native</Text>
          <Text style={styles.heroDesc}>
            Useful phrase patterns used in real German — formal, informal, written, spoken.
          </Text>
          <View style={styles.heroStats}>
            <HeroStat value={String(redemittel.length)} label="Phrases" />
            <HeroStat value={String(PHRASE_CATEGORIES.length)} label="Categories" />
            <HeroStat value="A1→B2" label="All Levels" />
          </View>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {(['All', ...PHRASE_CATEGORIES] as (PhraseCategory | 'All')[]).map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.tab, activeCategory === cat && styles.tabActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Phrase Cards */}
        <View style={styles.cards}>
          {filtered.map(phrase => (
            <PhraseCard
              key={phrase.id}
              phrase={phrase}
              expanded={expandedIds.has(phrase.id)}
              onToggle={() => toggleExpand(phrase.id)}
            />
          ))}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function PhraseCard({ phrase, expanded, onToggle }: {
  phrase: Phrase; expanded: boolean; onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      {/* German phrase */}
      <Text style={styles.cardDe}>{phrase.german}</Text>
      <Text style={styles.cardEn}>{phrase.english}</Text>

      {/* Tags */}
      <View style={styles.tagsRow}>
        <Tag text={phrase.level} color={LEVEL_COLOR[phrase.level]} />
        <Tag text={phrase.register} color={REGISTER_COLOR[phrase.register]} />
        <Tag text={phrase.usage} color={USAGE_COLOR[phrase.usage]} />
      </View>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.exampleBox}>
            <Text style={styles.exampleLabel}>Example</Text>
            <Text style={styles.exampleDe}>„{phrase.exampleDe}"</Text>
            <Text style={styles.exampleEn}>{phrase.exampleEn}</Text>
          </View>
          {phrase.tip && (
            <View style={styles.tipBox}>
              <Text style={styles.tipLabel}>💡 Tip</Text>
              <Text style={styles.tipText}>{phrase.tip}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.expandHint}>
        <Text style={styles.expandHintText}>{expanded ? '▲ Less' : '▼ Example'}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: color + '20', borderColor: color + '44' }]}>
      <Text style={[styles.tagText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  hero: {
    margin: 20, marginBottom: 4,
    backgroundColor: '#1a0d2e', borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: Colors.purple + '44',
  },
  heroLabel: { color: '#c084fc', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  heroTitle: { color: Colors.white, fontSize: 22, fontWeight: '900', marginBottom: 6 },
  heroDesc: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 14 },
  heroStats: { flexDirection: 'row', gap: 20 },
  heroStat: {},
  heroStatValue: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  heroStatLabel: { color: Colors.textMuted, fontSize: 11 },

  tabsScroll: { marginTop: 14 },
  tabsContent: { paddingHorizontal: 20, gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: Colors.purple, borderColor: Colors.purple },
  tabText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: Colors.white },

  cards: { paddingHorizontal: 20, paddingTop: 14, gap: 10 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 3, borderLeftColor: Colors.purple,
  },
  cardDe: { color: Colors.white, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardEn: { color: Colors.textMuted, fontSize: 13, marginBottom: 10 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tagText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  expandedContent: { marginTop: 14, gap: 10 },
  exampleBox: {
    backgroundColor: Colors.surface2, borderRadius: 10, padding: 12,
    borderLeftWidth: 2, borderLeftColor: Colors.gold,
  },
  exampleLabel: { color: Colors.gold, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  exampleDe: { color: Colors.white, fontSize: 13, fontStyle: 'italic', marginBottom: 4 },
  exampleEn: { color: Colors.textMuted, fontSize: 12 },
  tipBox: { backgroundColor: '#1e1a0d', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.gold + '33' },
  tipLabel: { color: Colors.gold, fontSize: 10, fontWeight: '700', marginBottom: 4 },
  tipText: { color: '#e8d89a', fontSize: 12, lineHeight: 18 },

  expandHint: { alignItems: 'flex-end', marginTop: 10 },
  expandHintText: { color: Colors.textDim, fontSize: 11 },
});
