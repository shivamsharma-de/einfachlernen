import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { track } from '../../lib/analytics';

interface Player {
  rank: number;
  name: string;
  flag: string;
  level: string;
  streak: number;
  xp: number;
  avatar: string;
  isMe?: boolean;
}

const GLOBAL_PLAYERS: Player[] = [
  { rank: 1, name: 'Lena K.',   flag: '🇩🇪', level: 'A2', streak: 42, xp: 14800, avatar: '🧑' },
  { rank: 2, name: 'Priya R.',  flag: '🇮🇳', level: 'A2', streak: 30, xp: 12200, avatar: '👩' },
  { rank: 3, name: 'Carlos M.', flag: '🇧🇷', level: 'A2', streak: 21, xp: 11050, avatar: '👨' },
  { rank: 4, name: 'Sara T.',   flag: '🇹🇷', level: 'A1', streak: 18, xp: 9800,  avatar: '🧕' },
  { rank: 5, name: 'Alex M.',   flag: '🇬🇧', level: 'A2', streak: 14, xp: 8340,  avatar: '🧑‍🎓', isMe: true },
  { rank: 6, name: 'Felix W.',  flag: '🇦🇹', level: 'A2', streak: 9,  xp: 7100,  avatar: '🧑‍💻' },
  { rank: 7, name: 'Mei L.',    flag: '🇨🇳', level: 'A1', streak: 7,  xp: 5900,  avatar: '👩‍🎓' },
  { rank: 8, name: 'Ivan P.',   flag: '🇷🇺', level: 'A1', streak: 5,  xp: 4300,  avatar: '👨‍🦱' },
];

const FRIENDS_PLAYERS: Player[] = [
  { rank: 1, name: 'Jake P.',  flag: '🇺🇸', level: 'A1', streak: 5,  xp: 3200, avatar: '🧑‍🤝‍🧑' },
  { rank: 2, name: 'Alex M.', flag: '🇬🇧', level: 'A2', streak: 14, xp: 2340, avatar: '🧑‍🎓', isMe: true },
  { rank: 3, name: 'Mia S.',  flag: '🇫🇷', level: 'A1', streak: 2,  xp: 1100, avatar: '👧' },
];

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

type BoardTab = 'global' | 'friends';

export default function LeaderboardScreen() {
  useEffect(() => { track('leaderboard_opened'); }, []);
  const [tab, setTab] = useState<BoardTab>('global');
  const players = tab === 'global' ? GLOBAL_PLAYERS : FRIENDS_PLAYERS;

  const top3 = GLOBAL_PLAYERS.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <Text style={styles.title}>Leaderboard 🏆</Text>
        <Text style={styles.sub}>Week 19 · May 2026</Text>

        {/* Podium — only on global tab */}
        {tab === 'global' && (
          <View style={styles.podium}>
            {/* 2nd */}
            <View style={[styles.podiumPlayer, { marginTop: 24 }]}>
              <Text style={styles.podiumAvatar}>{top3[1].avatar}</Text>
              <Text style={styles.podiumMedal}>🥈</Text>
              <Text style={styles.podiumName}>{top3[1].name.split(' ')[0]}</Text>
              <Text style={styles.podiumXp}>{(top3[1].xp / 1000).toFixed(1)}k</Text>
              <View style={[styles.podiumBar, { height: 60, backgroundColor: Colors.medalSilver }]} />
            </View>
            {/* 1st */}
            <View style={styles.podiumPlayer}>
              <Text style={styles.podiumAvatar}>{top3[0].avatar}</Text>
              <Text style={styles.podiumMedal}>🥇</Text>
              <Text style={styles.podiumName}>{top3[0].name.split(' ')[0]}</Text>
              <Text style={styles.podiumXp}>{(top3[0].xp / 1000).toFixed(1)}k</Text>
              <View style={[styles.podiumBar, { height: 80, backgroundColor: Colors.medalGold }]} />
            </View>
            {/* 3rd */}
            <View style={[styles.podiumPlayer, { marginTop: 40 }]}>
              <Text style={styles.podiumAvatar}>{top3[2].avatar}</Text>
              <Text style={styles.podiumMedal}>🥉</Text>
              <Text style={styles.podiumName}>{top3[2].name.split(' ')[0]}</Text>
              <Text style={styles.podiumXp}>{(top3[2].xp / 1000).toFixed(1)}k</Text>
              <View style={[styles.podiumBar, { height: 44, backgroundColor: Colors.medalBronze }]} />
            </View>
          </View>
        )}

        {/* Tab Selector */}
        <View style={styles.tabs}>
          {(['global', 'friends'] as BoardTab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {t === 'global' ? '🌍 Global' : '👥 Friends'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* My rank summary */}
        <View style={styles.myRankCard}>
          <Text style={styles.myRankLabel}>Your rank this week</Text>
          <View style={styles.myRankRow}>
            <Text style={styles.myRankNum}>#5</Text>
            <View>
              <Text style={styles.myRankXp}>8,340 XP</Text>
              <Text style={styles.myRankGap}>1,460 XP to reach #4</Text>
            </View>
          </View>
        </View>

        {/* Player List */}
        <View style={styles.board}>
          {players.map(player => (
            <PlayerRow key={player.rank} player={player} />
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PlayerRow({ player }: { player: Player }) {
  return (
    <View style={[styles.row, player.isMe && styles.rowMe]}>
      <Text style={[
        styles.rank,
        player.rank === 1 && { color: Colors.medalGold },
        player.rank === 2 && { color: Colors.medalSilver },
        player.rank === 3 && { color: Colors.medalBronze },
      ]}>
        {MEDAL[player.rank] ?? player.rank}
      </Text>

      <View style={[styles.avatarCircle, player.isMe && styles.avatarCircleMe]}>
        <Text style={styles.avatarEmoji}>{player.avatar}</Text>
      </View>

      <View style={styles.rowInfo}>
        <View style={styles.rowNameRow}>
          <Text style={styles.rowName}>{player.name}</Text>
          {player.isMe && <View style={styles.youBadge}><Text style={styles.youBadgeText}>You</Text></View>}
        </View>
        <Text style={styles.rowMeta}>{player.flag} {player.level} · 🔥 {player.streak} days</Text>
      </View>

      <Text style={styles.rowXp}>{player.xp.toLocaleString()} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 16 },

  title: { color: Colors.white, fontSize: 24, fontWeight: '900' },
  sub: { color: Colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: 20 },

  podium: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    gap: 12, marginBottom: 24,
  },
  podiumPlayer: { alignItems: 'center', width: 90 },
  podiumAvatar: { fontSize: 32, marginBottom: 4 },
  podiumMedal: { fontSize: 20, marginBottom: 4 },
  podiumName: { color: Colors.white, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  podiumXp: { color: Colors.gold, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  podiumBar: { width: 60, borderRadius: 6 },

  tabs: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  tabBtnText: { color: Colors.textMuted, fontWeight: '700', fontSize: 14 },
  tabBtnTextActive: { color: Colors.black },

  myRankCard: {
    backgroundColor: Colors.goldBg, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.gold + '44', marginBottom: 16,
  },
  myRankLabel: { color: Colors.gold, fontSize: 11, fontWeight: '700', marginBottom: 8 },
  myRankRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  myRankNum: { color: Colors.gold, fontSize: 36, fontWeight: '900' },
  myRankXp: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  myRankGap: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  board: {
    backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.surface3,
  },
  rowMe: { backgroundColor: Colors.goldBg },
  rank: { width: 28, textAlign: 'center', color: Colors.textMuted, fontSize: 16, fontWeight: '800' },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  avatarCircleMe: { backgroundColor: Colors.goldBg, borderWidth: 1, borderColor: Colors.gold + '55' },
  avatarEmoji: { fontSize: 20 },
  rowInfo: { flex: 1 },
  rowNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  youBadge: { backgroundColor: Colors.gold, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  youBadgeText: { color: Colors.black, fontSize: 10, fontWeight: '800' },
  rowMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  rowXp: { color: Colors.gold, fontSize: 13, fontWeight: '700' },
});
