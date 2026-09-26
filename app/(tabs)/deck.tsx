import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView } from 'react-native';
import { Colors, Type, Space, Radius } from '../../constants/Colors';
import { Eyebrow, GradeRow, PillButton, WordCard } from '../../components';
import { useAuth } from '../../context/auth';
import { useSRS } from '../../hooks/useSRS';
import { useEnrichment } from '../../hooks/useEnrichment';
import { fetchAllWords } from '../../lib/db';
import { levelOf } from '../../lib/profile';
import { createSessionTimer } from '../../lib/activity';
import { Grade } from '../../lib/srs';
import { Word } from '../../types';

export default function DeckScreen() {
  const { user, profile } = useAuth();
  const level = levelOf(profile);
  const [words, setWords] = useState<Word[]>([]);
  const [wordsLoading, setWordsLoading] = useState(true);

  const timer = useRef(createSessionTimer());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const all = await fetchAllWords();
      if (cancelled) return;
      setWords(all);
      setWordsLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const srs = useSRS(words, level, user?.id ?? null);

  // Enrichment is requested only once the card is flipped, so a session the
  // learner abandons early does not generate entries it never shows.
  const { enrichment, loading: enriching } = useEnrichment(srs.current?.id, srs.revealed);

  // Time on this screen is study time. Flush on unmount so a backgrounded
  // session still counts, and so minutes are never double-logged.
  useEffect(() => {
    const t = timer.current;
    t.start();
    return () => { void t.stop(); };
  }, []);

  useEffect(() => {
    if (srs.done && srs.reviewed > 0) void srs.finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srs.done]);

  const pct = useMemo(
    () => (srs.total > 0 ? srs.position / srs.total : 0),
    [srs.position, srs.total],
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Nicht angemeldet</Text>
          <Text style={styles.emptyBody}>Melde dich an, um dein Deck zu synchronisieren.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (wordsLoading || srs.loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={Colors.textMuted} /></View>
      </SafeAreaView>
    );
  }

  if (srs.empty) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Nichts zu wiederholen</Text>
          <Text style={styles.emptyBody}>
            Alle Karten für heute sind erledigt. Neue Wörter findest du unter Wörter und Scan.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (srs.done || !srs.current) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.doneXp}>+{srs.sessionXp} XP</Text>
          <Text style={styles.emptyTitle}>Sitzung beendet</Text>
          <Text style={styles.emptyBody}>{srs.reviewed} Karten wiederholt.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Eyebrow right={<Text style={styles.xp}>+{srs.sessionXp} XP</Text>}>
            {`${srs.position} von ${srs.total}`}
          </Eyebrow>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
          </View>
        </View>

        <WordCard
          word={srs.current}
          revealed={srs.revealed}
          onFlip={srs.reveal}
          enrichment={enrichment}
          enriching={enriching}
        />

        <View style={styles.footer}>
          {srs.revealed ? (
            <GradeRow
              intervals={srs.intervals}
              onGrade={(g) => { void srs.grade(g as Grade); }}
            />
          ) : (
            <PillButton label="Aufdecken" variant="ghost" onPress={srs.reveal} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.gutter, gap: Space.xl, flexGrow: 1, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.gutter, gap: Space.sm },

  header: { gap: Space.sm },
  xp: { ...Type.meta, color: Colors.gold },
  barBg: { height: 4, borderRadius: 2, backgroundColor: Colors.surface3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2, backgroundColor: Colors.purple },

  footer: { gap: Space.md },

  emptyTitle: { ...Type.title, fontSize: 24, lineHeight: 28, color: Colors.white, textAlign: 'center' },
  emptyBody: { ...Type.body, color: Colors.textMuted, textAlign: 'center' },
  doneXp: { ...Type.display, fontSize: 44, lineHeight: 48, color: Colors.gold },
});
