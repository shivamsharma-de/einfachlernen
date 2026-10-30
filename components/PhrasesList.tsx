import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles, useTheme } from '../context/theme';
import { Phrase } from '../types';
import { fetchAllPhrases } from '../lib/db';
import { track } from '../lib/analytics';

const registerColor = (c: ColorTokens): Record<string, string> => ({
  formal: c.blue,
  informal: c.green,
  neutral: c.textMuted,
});

const usageColor = (c: ColorTokens): Record<string, string> => ({
  spoken: c.green,
  written: c.purple,
  both: c.gold,
});

const phraseLevelColor = (c: ColorTokens): Record<string, string> => ({
  A1: c.levelA1,
  A2: c.levelA2,
  B1: c.levelB1,
  B2: c.levelB2,
});

export function PhrasesList() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => { track('phrases_opened'); }, []);

  useEffect(() => {
    fetchAllPhrases()
      .then(setPhrases)
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(phrases.map(p => p.category))).sort()],
    [phrases],
  );
  const filtered = useMemo(
    () => activeCategory === 'All' ? phrases : phrases.filter(p => p.category === activeCategory),
    [phrases, activeCategory],
  );

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.gold} size="large" />
          <Text style={styles.loadingText}>Loading phrases…</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            <HeroStat value={String(phrases.length)} label="Phrases" />
            <HeroStat value={String(categories.length - 1)} label="Categories" />
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
          {categories.map(cat => (
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
  const styles = useThemedStyles(makeStyles);
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
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity style={styles.card} onPress={onToggle} activeOpacity={0.8}>
      <Text style={styles.cardDe}>{phrase.german}</Text>
      <Text style={styles.cardEn}>{phrase.english}</Text>
      <View style={styles.tagsRow}>
        <Tag text={phrase.level}        color={phraseLevelColor(colors)[phrase.level] ?? colors.textMuted} />
        <Tag text={phrase.register}     color={registerColor(colors)[phrase.register]} />
        <Tag text={phrase.usage_context} color={usageColor(colors)[phrase.usage_context]} />
      </View>
      {expanded && (
        <View style={styles.expandedContent}>
          {phrase.example_de && (
            <View style={styles.exampleBox}>
              <Text style={styles.exampleLabel}>Example</Text>
              <Text style={styles.exampleDe}>„{phrase.example_de}"</Text>
              {phrase.example_en && <Text style={styles.exampleEn}>{phrase.example_en}</Text>}
            </View>
          )}
          {phrase.tip && (
            <View style={styles.tipBox}>
              <Text style={styles.tipLabel}>💡 Tip</Text>
              <Text style={styles.tipText}>{phrase.tip}</Text>
            </View>
          )}
          {phrase.cultural_context && (
            <View style={styles.culturalBox}>
              <Text style={styles.culturalLabel}>🌍 Cultural note</Text>
              <Text style={styles.culturalText}>{phrase.cultural_context}</Text>
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
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.tag, { backgroundColor: color + '20', borderColor: color + '44' }]}>
      <Text style={[styles.tagText, { color }]}>{text}</Text>
    </View>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: c.textMuted, fontSize: 14 },

  hero: { margin: 20, marginBottom: 4, backgroundColor: c.purpleBg, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: c.purple + '44' },
  heroLabel: { color: c.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  heroTitle: { color: c.text, fontSize: 22, fontWeight: '900', marginBottom: 6 },
  heroDesc: { color: c.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 14 },
  heroStats: { flexDirection: 'row', gap: 20 },
  heroStat: {},
  heroStatValue: { color: c.text, fontSize: 18, fontWeight: '800' },
  heroStatLabel: { color: c.textMuted, fontSize: 11 },

  tabsScroll: { marginTop: 14 },
  tabsContent: { paddingHorizontal: 20, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  tabActive: { backgroundColor: c.purple, borderColor: c.purple },
  tabText: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: c.onAccent },

  cards: { paddingHorizontal: 20, paddingTop: 14, gap: 10 },
  card: { backgroundColor: c.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.border, borderLeftWidth: 3, borderLeftColor: c.purple },
  cardDe: { color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardEn: { color: c.textMuted, fontSize: 13, marginBottom: 10 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tagText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  expandedContent: { marginTop: 14, gap: 10 },
  exampleBox: { backgroundColor: c.surface2, borderRadius: 10, padding: 12, borderLeftWidth: 2, borderLeftColor: c.gold },
  exampleLabel: { color: c.goldText, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  exampleDe: { color: c.text, fontSize: 13, fontStyle: 'italic', marginBottom: 4 },
  exampleEn: { color: c.textMuted, fontSize: 12 },
  tipBox: { backgroundColor: c.goldBg, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: c.gold + '33' },
  tipLabel: { color: c.goldText, fontSize: 10, fontWeight: '700', marginBottom: 4 },
  tipText: { color: c.goldText, fontSize: 12, lineHeight: 18 },
  culturalBox: { backgroundColor: c.surface2, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: c.blue + '33' },
  culturalLabel: { color: c.blue, fontSize: 10, fontWeight: '700', marginBottom: 4 },
  culturalText: { color: c.textMuted, fontSize: 12, lineHeight: 18 },

  expandHint: { alignItems: 'flex-end', marginTop: 10 },
  expandHintText: { color: c.textDim, fontSize: 11 },
});
