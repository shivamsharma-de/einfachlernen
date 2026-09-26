/**
 * Deck — the swipe review screen (PRD F3, decision D13).
 *
 * D13 reverses design-spec §6.4: the card runs **English → German**. The front
 * carries the English meaning and the level badge and nothing else, because the
 * learner has to *produce* the German, article included. The back is the German
 * headword with its article, the grammar line and the examples.
 *
 * Grading is a horizontal swipe — right "Gelernt" (grade 2), left "Nochmal"
 * (grade 0, re-inserted 3–5 cards later by the API) — built on React Native's
 * own `PanResponder` + `Animated`. `react-native-reanimated` and
 * `react-native-gesture-handler` are not installed and must not be added. The
 * `GradeRow` buttons stay on screen as the accessible equivalent: a swipe is
 * not operable by every learner (design-spec §8), so grading is never
 * swipe-only.
 *
 * Components this screen composes inline because `components/**` (design agent)
 * has not shipped them yet: `WordCardBack`, `GrammarLine`, `ExampleSentence`,
 * `OriginTag`, `EmptyState`, `Skeleton`. They are requested in
 * docs/agents/status/frontend.md and each inline piece here matches the props
 * in CONTRACTS §5, so the swap is mechanical.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { ARTICLE_COLOR, Colors, Radius, Space, Type } from '../../constants/Colors';
import { Eyebrow, GradeRow, LevelBadge, PillButton } from '../../components';
import { useAuth } from '../../context/auth';
import { useDeckSession } from '../../hooks/useDeckSession';
import { examplesFor, grammarLine, wordTypeLabel } from '../../hooks/grammar';
import { levelOf } from '../../lib/profile';
import type { DeckCard, Grade, WordEnrichment } from '../../types/contracts';

const GRADE_LEARNED: Grade = 2; // swipe right → Gut
const GRADE_AGAIN: Grade = 0;   // swipe left  → Nochmal

export default function DeckScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const level = levelOf(profile);
  const deck = useDeckSession(user?.id ?? null, level);
  const { height } = useWindowDimensions();

  // 264px is the design-spec §6.4 floor; the rest is breathing room on tall
  // phones without ever pushing the grade buttons off screen.
  const cardHeight = Math.max(264, Math.min(420, Math.round(height * 0.46)));

  const { grade } = deck;
  const onSwipeRight = useCallback(() => { void grade(GRADE_LEARNED); }, [grade]);
  const onSwipeLeft = useCallback(() => { void grade(GRADE_AGAIN); }, [grade]);

  if (deck.status === 'signed-out') {
    return (
      <StateScreen
        title="Nicht angemeldet"
        body="Melde dich an, um dein Deck zu synchronisieren."
      />
    );
  }

  if (deck.status === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.textMuted} />
          <Text style={styles.stateBody}>Deck wird geladen…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (deck.status === 'error') {
    return (
      <StateScreen
        title="Deck nicht verfügbar"
        // Already German — it comes straight out of Result.error.
        body={deck.error ?? 'Unbekannter Fehler.'}
        action={{ label: 'Erneut versuchen', onPress: deck.retry }}
      />
    );
  }

  if (deck.status === 'empty') {
    return (
      <StateScreen
        title="Nichts fällig heute"
        // Verbatim from the API when it said so — it is already German (F3.8).
        body={
          deck.nothingDue ??
          'Heute ist nichts fällig. Auf deinem Niveau sind auch keine neuen Wörter mehr übrig.'
        }
        // An empty queue means both halves of the builder came back empty: no
        // due cards and no unseen words left at this level. "Neue Wörter lernen"
        // would rebuild the same empty session, so the honest offers are to
        // check again and to move up a level.
        action={{ label: 'Erneut prüfen', onPress: deck.rebuild }}
        secondary={{ label: 'Niveau ändern', onPress: () => router.push('/onboarding') }}
      />
    );
  }

  if (deck.status === 'finished' || !deck.current) {
    return (
      <StateScreen
        eyebrow={`+${deck.sessionXp} XP`}
        title="Sitzung beendet"
        body={`${deck.reviewed} ${deck.reviewed === 1 ? 'Karte' : 'Karten'} wiederholt.`}
        action={{ label: 'Weiter lernen', onPress: deck.rebuild }}
      />
    );
  }

  const card = deck.current;
  const progress = deck.total > 0 ? deck.position / deck.total : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Eyebrow right={<Text style={styles.xp}>+{deck.sessionXp} XP</Text>}>
          {`${deck.position} von ${deck.total}`}
        </Eyebrow>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <View style={styles.cardArea}>
        <View style={[styles.cardStack, { height: cardHeight }]}>
          {/* A hint of the rest of the queue, peeking out below the live card. */}
          {deck.total - deck.position > 1 && (
            <View style={styles.stackPeek} pointerEvents="none" />
          )}

          <SwipeCard
            // Remounting per graded card resets the pan and the flip in one
            // step, so the next card always starts centred and face-down.
            key={`${deck.session?.id ?? 'session'}:${deck.reviewed}:${card.word.id}`}
            cycle={deck.reviewed}
            card={card}
            // facingBack drives which side is CURRENTLY shown and toggles
            // freely once revealed; revealed itself (below) only ever turns on
            // — it gates grading, not the animation, so flipping back to
            // re-read the English never disables swiping or hides GradeRow.
            facingBack={deck.facingBack}
            enrichment={deck.enrichment}
            enriching={deck.enriching}
            height={cardHeight}
            swipeEnabled={deck.revealed && !deck.grading}
            onFlip={deck.flip}
            onSwipeRight={onSwipeRight}
            onSwipeLeft={onSwipeLeft}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.hintRow}>
          <Text style={styles.hint}>
            {deck.revealed ? 'Wischen oder bewerten' : 'Tippen zum Umdrehen'}
          </Text>
          <TouchableOpacity
            onPress={deck.shuffle}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Restliche Karten mischen"
            style={styles.shuffle}
          >
            <Ionicons name="shuffle" size={13} color={Colors.white} />
            <Text style={styles.shuffleLabel}>Mischen</Text>
          </TouchableOpacity>
        </View>

        {deck.revealed ? (
          <GradeRow
            intervals={card.intervals}
            onGrade={(g) => { void deck.grade(g); }}
          />
        ) : (
          <PillButton label="Aufdecken" variant="ghost" onPress={deck.flip} />
        )}
      </View>
    </SafeAreaView>
  );
}

// ───────────────────────────────────────────────────────── swipe card ──

function SwipeCard({
  card, cycle, facingBack, enrichment, enriching, height, swipeEnabled,
  onFlip, onSwipeRight, onSwipeLeft,
}: {
  card: DeckCard;
  /** Increments once per graded card; see the reset effect below. */
  cycle: number;
  /** Which face is currently showing — toggles freely once grading is unlocked. */
  facingBack: boolean;
  enrichment: WordEnrichment | null;
  enriching: boolean;
  height: number;
  swipeEnabled: boolean;
  onFlip: () => void;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}) {
  const { width } = useWindowDimensions();
  const threshold = Math.min(120, width * 0.28);

  // Pan is JS-driven: PanResponder events cannot feed the native driver. The
  // flip below is native-driven, which is legal because it animates a different
  // view — one view may not mix drivers, two may.
  const pan = useRef(new Animated.ValueXY()).current;
  const flip = useRef(new Animated.Value(0)).current;

  // Read inside the PanResponder, which is created once.
  const enabled = useRef(swipeEnabled);
  enabled.current = swipeEnabled;
  const handlers = useRef({ onSwipeRight, onSwipeLeft });
  handlers.current = { onSwipeRight, onSwipeLeft };

  // The card flies off screen on a commit and the remount normally brings the
  // next one back centred. "Nochmal" on the last card of a queue is the one
  // case where it cannot: the API re-inserts that card at the only index left,
  // so the same word and the same cycle count come back and React reuses this
  // instance — with `pan` still parked off screen. Recentring on every cycle
  // covers it, and is a no-op on a fresh mount.
  //
  // `flip` is snapped shut here too, synchronously via `setValue`, rather than
  // animated. Starting an ANIMATED, native-driven transition on the same
  // render its backing value is created can race the native view registering
  // with the native animated graph and silently no-op — a known
  // useNativeDriver gotcha, and exactly the shape of "the first card's flip
  // works, a later one doesn't": the screen's very first mount has different
  // timing than a mid-session remount racing a just-committed fly-off
  // animation. `pan` never had this bug because it already used `setValue`.
  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
    flip.setValue(0);
  }, [cycle, card.word.id, pan, flip]);

  // The actual reveal/un-reveal animation. Runs on a genuine user action (tap
  // to reveal) or on "Mischen" un-revealing the same card in place (no
  // remount) — never on mount, since the effect above has already snapped the
  // value by the time this one's dependency (`facingBack`) is first read here.
  useEffect(() => {
    // 130ms: fast enough to read as instant (NFR: flip < 100ms perceived — the
    // face swaps at the halfway point, so the answer is legible at ~65ms).
    Animated.timing(flip, {
      toValue: facingBack ? 1 : 0,
      duration: 130,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [facingBack, flip]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Never claim the touch on start — taps must reach the flip Pressable.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) =>
          enabled.current && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_e, g) => {
          const right = g.dx > threshold || (g.vx > 0.8 && g.dx > 40);
          const left = g.dx < -threshold || (g.vx < -0.8 && g.dx < -40);

          if (right || left) {
            Animated.timing(pan, {
              toValue: { x: (right ? 1 : -1) * width * 1.4, y: g.dy },
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }).start(() => {
              if (right) handlers.current.onSwipeRight();
              else handlers.current.onSwipeLeft();
            });
            return;
          }

          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            tension: 90,
            useNativeDriver: false,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false,
          }).start();
        },
      }),
    [pan, threshold, width],
  );

  const rotate = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-9deg', '0deg', '9deg'],
    extrapolate: 'clamp',
  });
  const learnedOpacity = pan.x.interpolate({
    inputRange: [24, threshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const againOpacity = pan.x.interpolate({
    inputRange: [-threshold, -24],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  // backfaceVisibility alone is unreliable on Android, so opacity switches too.
  const frontOpacity = flip.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity = flip.interpolate({ inputRange: [0, 0.499, 0.5, 1], outputRange: [0, 0, 1, 1] });

  return (
    <Animated.View
      style={[
        styles.cardWrap,
        { height, transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] },
      ]}
      {...panResponder.panHandlers}
    >
      <Pressable
        onPress={onFlip}
        style={styles.pressArea}
        accessibilityRole="button"
        // Label follows the face CURRENTLY showing, so VoiceOver reads the
        // English again after flipping back rather than repeating the German.
        // Hint follows whether grading is unlocked (swipeEnabled), which stays
        // true regardless of which face the learner is looking at.
        accessibilityLabel={
          facingBack
            ? `${card.word.article ? `${card.word.article} ` : ''}${card.word.german}`
            : `${card.word.english}. Karte umdrehen`
        }
        accessibilityHint={
          swipeEnabled
            ? 'Nach rechts wischen für gelernt, nach links für nochmal. Oder die Knöpfe darunter benutzen. Erneut tippen, um zwischen den Seiten zu wechseln.'
            : 'Tippen, um die deutsche Seite zu sehen'
        }
      >
        <Animated.View
          style={[
            styles.face,
            { transform: [{ perspective: 1000 }, { rotateY: frontRotate }], opacity: frontOpacity },
          ]}
        >
          <CardFront card={card} />
        </Animated.View>

        <Animated.View
          style={[
            styles.face,
            { transform: [{ perspective: 1000 }, { rotateY: backRotate }], opacity: backOpacity },
          ]}
        >
          <CardBack card={card} enrichment={enrichment} enriching={enriching} />
        </Animated.View>
      </Pressable>

      {/* Swipe affordances — outside the flipping faces so they read on both. */}
      <Animated.View
        style={[styles.stamp, styles.stampRight, { opacity: learnedOpacity }]}
        pointerEvents="none"
      >
        <Text style={[styles.stampText, { color: Colors.green }]}>Gelernt</Text>
      </Animated.View>
      <Animated.View
        style={[styles.stamp, styles.stampLeft, { opacity: againOpacity }]}
        pointerEvents="none"
      >
        <Text style={[styles.stampText, { color: Colors.red }]}>Nochmal</Text>
      </Animated.View>
    </Animated.View>
  );
}

/** D13: English meaning + level badge. Nothing else — the German is the answer. */
function CardFront({ card }: { card: DeckCard }) {
  return (
    <View style={styles.frontInner}>
      <LevelBadge level={card.word.level} />
      <Text style={styles.english}>{card.word.english}</Text>
    </View>
  );
}

function CardBack({ card, enrichment, enriching }: {
  card: DeckCard;
  enrichment: WordEnrichment | null;
  enriching: boolean;
}) {
  const word = card.word;
  const grammar = grammarLine(word, enrichment);
  const examples = examplesFor(word, enrichment);

  const speak = useCallback(() => {
    void Speech.stop();
    Speech.speak(word.german, { language: 'de-DE' });
  }, [word.german]);

  return (
    <ScrollView
      style={styles.backScroll}
      contentContainerStyle={styles.backInner}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.metaRow}>
        <Text style={styles.wordType}>{wordTypeLabel(word.word_type)}</Text>
        {word.origin === 'scan' && (
          <View style={styles.originTag}><Text style={styles.originTagText}>Scan</Text></View>
        )}
        <View style={styles.metaSpacer} />
        <TouchableOpacity
          onPress={speak}
          style={styles.speak}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`${word.german} anhören`}
        >
          <Ionicons name="volume-medium-outline" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.headwordBlock}>
        {word.article && (
          <Text style={[styles.article, { color: ARTICLE_COLOR[word.article] }]}>{word.article}</Text>
        )}
        {/* Never truncated — German compounds wrap instead (design-spec §8). */}
        <Text style={styles.headword}>{word.german}</Text>
      </View>

      {grammar && <Text style={styles.grammar}>{grammar}</Text>}

      {examples.length > 0 ? (
        <View style={styles.examples}>
          {examples.map((example, i) => (
            <View key={`${example.de}-${i}`} style={styles.example}>
              <Text style={styles.exampleDe}>{example.de}</Text>
              {example.en.length > 0 && <Text style={styles.exampleEn}>{example.en}</Text>}
            </View>
          ))}
        </View>
      ) : (
        // enrichment === null is a normal render state, never an error (F3.6).
        enriching ? (
          <View style={styles.examples}>
            <View style={[styles.skeleton, styles.skeletonWide]} />
            <View style={[styles.skeleton, styles.skeletonNarrow]} />
          </View>
        ) : null
      )}
    </ScrollView>
  );
}

// ───────────────────────────────────────────────────── shared states ──

/** Stands in for `EmptyState` from CONTRACTS §5 until design ships it. */
function StateScreen({ eyebrow, title, body, action, secondary }: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        {eyebrow && <Text style={styles.stateXp}>{eyebrow}</Text>}
        <Text style={styles.stateTitle}>{title}</Text>
        {body && <Text style={styles.stateBody}>{body}</Text>}
        {action && (
          <PillButton label={action.label} onPress={action.onPress} style={styles.stateAction} />
        )}
        {secondary && (
          <PillButton
            label={secondary.label}
            variant="ghost"
            onPress={secondary.onPress}
            style={styles.stateSecondary}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Space.gutter, gap: Space.sm,
  },

  header: { paddingHorizontal: Space.gutter, paddingTop: Space.md, gap: Space.sm },
  xp: { ...Type.meta, color: Colors.gold },
  barBg: { height: 4, borderRadius: 2, backgroundColor: Colors.surface3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2, backgroundColor: Colors.purple },

  cardArea: {
    flex: 1, justifyContent: 'center',
    paddingHorizontal: Space.gutter, paddingVertical: Space.lg,
  },
  cardStack: { justifyContent: 'center' },
  // Sits behind the live card (it is painted first) and shows only where it
  // extends past it — 8px of a second card below, so the queue reads as a deck.
  stackPeek: {
    position: 'absolute',
    left: 10, right: 10, top: 8, bottom: -8,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },

  cardWrap: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  pressArea: { flex: 1 },
  // Spelled out rather than `StyleSheet.absoluteFillObject`: RN 0.86's types no
  // longer declare it, and `absoluteFill` is a registered ID, not a style object.
  face: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backfaceVisibility: 'hidden' },

  frontInner: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Space.xl, gap: Space.lg,
  },
  english: { ...Type.title, fontSize: 28, lineHeight: 34, color: Colors.white, textAlign: 'center' },

  backScroll: { flex: 1 },
  backInner: { padding: Space.xl, gap: Space.md, flexGrow: 1, justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  metaSpacer: { flex: 1 },
  wordType: { ...Type.eyebrow, color: Colors.textMuted },
  originTag: {
    backgroundColor: Colors.purpleBg,
    borderRadius: Radius.chip,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  originTagText: { ...Type.eyebrow, color: Colors.white },
  speak: {
    width: 34, height: 34, borderRadius: Radius.pill,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface2,
  },

  headwordBlock: { gap: 2 },
  article: { ...Type.meta, fontSize: 13 },
  headword: { ...Type.headword, color: Colors.white },
  grammar: { ...Type.meta, color: Colors.textMuted },

  examples: {
    gap: Space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Space.md,
  },
  example: { gap: 2 },
  exampleDe: { ...Type.body, fontSize: 15, lineHeight: 22, color: Colors.white },
  exampleEn: { ...Type.caption, color: Colors.textMuted },
  skeleton: { height: 12, borderRadius: 4, backgroundColor: Colors.surface3 },
  skeletonWide: { width: '90%' },
  skeletonNarrow: { width: '65%' },

  stamp: {
    position: 'absolute', top: Space.lg,
    borderWidth: 1.5, borderRadius: Radius.chip,
    paddingHorizontal: Space.md, paddingVertical: 6,
    backgroundColor: Colors.black,
  },
  stampRight: { left: Space.lg, borderColor: Colors.green, transform: [{ rotate: '-8deg' }] },
  stampLeft: { right: Space.lg, borderColor: Colors.red, transform: [{ rotate: '8deg' }] },
  stampText: { ...Type.bodyL, fontSize: 14, letterSpacing: 0.5 },

  footer: { paddingHorizontal: Space.gutter, paddingBottom: Space.lg, gap: Space.md },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hint: { ...Type.eyebrow, color: Colors.textMuted, flexShrink: 1 },
  shuffle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md, paddingVertical: 7,
  },
  shuffleLabel: { ...Type.eyebrow, color: Colors.white },

  stateXp: { ...Type.display, fontSize: 44, lineHeight: 48, color: Colors.gold },
  stateTitle: { ...Type.title, fontSize: 24, lineHeight: 28, color: Colors.white, textAlign: 'center' },
  stateBody: { ...Type.body, color: Colors.textMuted, textAlign: 'center' },
  stateAction: { marginTop: Space.md, minWidth: 220 },
  stateSecondary: { minWidth: 220 },
});
