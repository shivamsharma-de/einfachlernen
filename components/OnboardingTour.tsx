import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { Type, Space, Radius } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles } from '../context/theme';
import { PillButton } from './PillButton';
import { useI18n } from '../lib/i18n';

/** The first-run tour: one short pop-up per tab. Weiter moves on; OK on the last step finishes it. */
const STEPS = [
  { de: 'Heute', en: 'Today',
    bodyDe: 'Hier siehst du, was heute ansteht: fällige Karten, deine Serie und die Themen. Mit „Test dich“ prüfst du dein Wissen.',
    bodyEn: 'Here you see what is due today: cards to review, your streak and the themes. "Test yourself" checks what you know.' },
  { de: 'Deck', en: 'Deck',
    bodyDe: 'Im Deck lernst du mit Karteikarten. Tippe auf eine Karte, um die Bedeutung zu sehen, und bewerte, wie gut du sie wusstest.',
    bodyEn: 'The deck is for learning with flashcards. Tap a card to see its meaning, then rate how well you knew it.' },
  { de: 'Scan', en: 'Scan',
    bodyDe: 'Fotografiere eine Textseite, zum Beispiel ein Buch. Die App erkennt die Wörter und schlägt Bedeutungen vor. Du wählst, was du speicherst.',
    bodyEn: 'Photograph a page of text, such as a book. The app finds the words and suggests meanings. You choose what to save.' },
  { de: 'Mein Wörterbuch', en: 'My dictionary',
    bodyDe: 'Hier stehen deine eigenen Wörter aus Scans und Suchen. Du kannst sie bearbeiten oder löschen.',
    bodyEn: 'Your own words from scans and searches are kept here. You can edit or delete them.' },
  { de: 'Wörter', en: 'Words',
    bodyDe: 'Im Wörterbuch suchst du auf Deutsch oder Englisch. Findet die App nichts, fragt sie die KI.',
    bodyEn: 'Search the dictionary in German or English. If nothing matches, the AI is asked.' },
  { de: 'Profil', en: 'Profile',
    bodyDe: 'In Profil stellst du dein Niveau ein, wählst die Sprache, siehst das Session-Tracking und kannst dein Konto löschen.',
    bodyEn: 'In Profile you set your level, choose the language, see session tracking, and can delete your account.' },
];

export function OnboardingTour(props: { visible: boolean; onFinish: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  return (
    <Modal visible={props.visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.progress}>{index + 1} / {STEPS.length}</Text>
          <Text style={styles.title}>{t(step.de, step.en)}</Text>
          <Text style={styles.body}>{t(step.bodyDe, step.bodyEn)}</Text>
          {last ? (
            <PillButton label={t('OK', 'OK')} onPress={props.onFinish} />
          ) : (
            <PillButton label={t('Weiter', 'Next')} onPress={() => setIndex(index + 1)} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: c.backdrop, alignItems: 'center', justifyContent: 'center', padding: Space.gutter },
  card: {
    width: '100%', gap: Space.md, padding: Space.xl, borderRadius: Radius.card,
    borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
  },
  progress: { ...Type.meta, color: c.textMuted },
  title: { ...Type.title, color: c.text },
  body: { ...Type.body, color: c.textMuted },
});
