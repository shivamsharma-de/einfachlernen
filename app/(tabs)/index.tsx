import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { CEFRLevel } from '../../data/vocabulary';

const { width } = Dimensions.get('window');

const LEVELS: { id: CEFRLevel; label: string; name: string; color: string; total: number; done: number; locked: boolean }[] = [
  { id: 'A1', label: 'A1', name: 'Beginner',    color: Colors.levelA1, total: 120, done: 120, locked: false },
  { id: 'A2', label: 'A2', name: 'Elementary',  color: Colors.levelA2, total: 200, done: 147, locked: false },
  { id: 'B1', label: 'B1', name: 'Intermediate',color: Colors.levelB1, total: 300, done: 0,   locked: true },
  { id: 'B2', label: 'B2', name: 'Upper-Int.',  color: Colors.levelB2, total: 350, done: 0,   locked: true },
  { id: 'C1', label: 'C1', name: 'Advanced',    color: Colors.levelC1, total: 400, done: 0,   locked: true },
  { id: 'C2', label: 'C2', name: 'Mastery',     color: Colors.levelC2, total: 500, done: 0,   locked: true },
];

const ALL_CHIPS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function HomeScreen() {
  const router = useRouter();
  const [selectedChips, setSelectedChips] = useState<CEFRLevel[]>(['A1', 'A2']);

  const toggleChip = (level: CEFRLevel) => {
    const unlocked = LEVELS.find(l => l.id === level);
    if (unlocked?.locked) return;
    setSelectedChips(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level],
    );
  };

  const startQuiz = (levels: CEFRLevel[]) => {
    const param = levels.join(',');
    router.push({ pathname: '/(tabs)/quiz', params: { levels: param } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Einfach<Text style={{ color: Colors.gold }}>Lernen</Text></Text>
          <View style={styles.headerRight}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 14</Text>
            </View>
            <Text style={styles.xpText}>⚡ 2,340 XP</Text>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarEmoji}>🧑‍🎓</Text></View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Alex M.</Text>
            <Text style={styles.profileLevel}>A2 · Elementary</Text>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: '73%' }]} />
            </View>
            <Text style={styles.xpBarLabel}>2,340 / 3,000 XP to B1</Text>
          </View>
        </View>

        {/* Quick Play */}
        <TouchableOpacity style={styles.quickPlay} onPress={() => startQuiz(['A2'])}>
          <Text style={styles.quickPlayIcon}>⚡</Text>
          <View style={styles.quickPlayText}>
            <Text style={styles.quickPlayTitle}>Continue A2 — Unit 5</Text>
            <Text style={styles.quickPlaySub}>Shopping & directions vocab</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.green} />
        </TouchableOpacity>

        {/* Section: Levels */}
        <Text style={styles.sectionTitle}>Choose a Level</Text>
        <View style={styles.levelsGrid}>
          {LEVELS.map(level => {
            const pct = level.total > 0 ? (level.done / level.total) * 100 : 0;
            return (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.levelCard,
                  level.locked && styles.levelCardLocked,
                  !level.locked && { borderColor: level.color + '44' },
                ]}
                onPress={() => !level.locked && startQuiz([level.id])}
                activeOpacity={level.locked ? 1 : 0.7}
              >
                <Text style={[styles.levelBadge, { color: level.color }]}>{level.label}</Text>
                <Text style={styles.levelName}>{level.name}</Text>
                {level.locked ? (
                  <Text style={styles.levelProgress}>🔒</Text>
                ) : level.done === level.total ? (
                  <Text style={[styles.levelProgress, { color: Colors.green }]}>✓ Done</Text>
                ) : (
                  <>
                    <View style={styles.miniBarBg}>
                      <View style={[styles.miniBarFill, { width: `${pct}%`, backgroundColor: level.color }]} />
                    </View>
                    <Text style={styles.levelProgress}>{level.done}/{level.total}</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Mix & Match */}
        <View style={styles.comboCard}>
          <Text style={styles.comboTitle}>🎯 Mix & Match Levels</Text>
          <Text style={styles.comboDesc}>Combine multiple CEFR levels into one session.</Text>
          <View style={styles.chipsRow}>
            {ALL_CHIPS.map(chip => {
              const locked = LEVELS.find(l => l.id === chip)?.locked;
              const selected = selectedChips.includes(chip);
              return (
                <TouchableOpacity
                  key={chip}
                  style={[
                    styles.chip,
                    selected && styles.chipSelected,
                    locked && styles.chipLocked,
                  ]}
                  onPress={() => toggleChip(chip)}
                  activeOpacity={locked ? 1 : 0.7}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected, locked && styles.chipTextLocked]}>
                    {chip}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.comboBtn, selectedChips.length === 0 && styles.comboBtnDisabled]}
            onPress={() => selectedChips.length > 0 && startQuiz(selectedChips)}
          >
            <Text style={styles.comboBtnText}>
              Start Mixed Session — {selectedChips.join(' + ')} →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Daily Goals */}
        <Text style={styles.sectionTitle}>Today's Goals</Text>
        <View style={styles.goalsRow}>
          <GoalCard icon="📚" label="Words" value="23" total="30" />
          <GoalCard icon="🎯" label="Accuracy" value="87" total="%" suffix />
          <GoalCard icon="⏱️" label="Time" value="18" total="min" suffix />
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalCard({ icon, label, value, total, suffix }: {
  icon: string; label: string; value: string; total: string; suffix?: boolean;
}) {
  return (
    <View style={styles.goalCard}>
      <Text style={styles.goalIcon}>{icon}</Text>
      <Text style={styles.goalLabel}>{label}</Text>
      <Text style={styles.goalValue}>
        {value}
        <Text style={styles.goalTotal}>{suffix ? total : `/${total}`}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  logo: { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakBadge: { backgroundColor: Colors.surface2, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  streakText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  xpText: { color: Colors.gold, fontSize: 13, fontWeight: '700' },

  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.goldBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.gold + '44',
  },
  avatarEmoji: { fontSize: 26 },
  profileInfo: { flex: 1 },
  profileName: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  profileLevel: { color: Colors.gold, fontSize: 12, fontWeight: '600', marginTop: 2 },
  xpBarBg: { height: 5, backgroundColor: Colors.surface3, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  xpBarLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },

  quickPlay: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.green + '33',
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 20,
  },
  quickPlayIcon: { fontSize: 28 },
  quickPlayText: { flex: 1 },
  quickPlayTitle: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  quickPlaySub: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },

  sectionTitle: {
    color: Colors.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 12, marginTop: 4,
  },

  levelsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, marginBottom: 20,
  },
  levelCard: {
    width: (width - 60) / 3,
    backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14,
    alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    gap: 4,
  },
  levelCardLocked: { opacity: 0.35 },
  levelBadge: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  levelName: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
  levelProgress: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  miniBarBg: { width: '90%', height: 3, backgroundColor: Colors.surface3, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  miniBarFill: { height: '100%', borderRadius: 2 },

  comboCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.purple + '44',
    marginBottom: 20,
  },
  comboTitle: { color: Colors.white, fontWeight: '700', fontSize: 16, marginBottom: 4 },
  comboDesc: { color: Colors.textMuted, fontSize: 13, marginBottom: 14 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  chipSelected: { borderColor: Colors.purple, backgroundColor: Colors.purpleBg },
  chipLocked: { opacity: 0.35 },
  chipText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
  chipTextSelected: { color: '#c084fc' },
  chipTextLocked: { color: Colors.textDim },
  comboBtn: {
    backgroundColor: Colors.purple, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  comboBtnDisabled: { opacity: 0.4 },
  comboBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },

  goalsRow: { flexDirection: 'row', gap: 10 },
  goalCard: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    gap: 4,
  },
  goalIcon: { fontSize: 20 },
  goalLabel: { color: Colors.textMuted, fontSize: 11 },
  goalValue: { color: Colors.white, fontSize: 20, fontWeight: '800' },
  goalTotal: { color: Colors.textMuted, fontSize: 12, fontWeight: '400' },
});
