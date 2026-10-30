import React from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { Type, Space, Radius } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles } from '../context/theme';
import { PillButton } from './PillButton';
import { useI18n } from '../lib/i18n';

/** Asked once per account. The answer turns session tracking on or off and is saved on the profile. */
export function SessionTrackingPrompt(props: { visible: boolean; onChoose: (granted: boolean) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  return (
    <Modal visible={props.visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('Session-Tracking', 'Session tracking')}</Text>
          <Text style={styles.body}>
            {t(
              'Wir teilen Nutzungsdaten mit unserem Dienstleister PostHog (Server in der EU), damit wir verstehen, wo Lernende hängen bleiben. Dazu gehören Bildschirmaufzeichnungen, bei denen Text und Bilder auf deinem Gerät unkenntlich gemacht werden. Verwendet wird deine Konto-ID, nicht dein Name oder deine E-Mail-Adresse. Du kannst das jederzeit in Profil ändern.',
              'We share usage data with our provider PostHog (EU servers), so we can see where learners get stuck. This includes screen recordings, with text and images blacked out on your device. We use your account ID, not your name or email address. You can change this at any time in Profil.',
            )}
          </Text>
          <PillButton label={t('Einschalten', 'Turn on')} onPress={() => props.onChoose(true)} />
          <PillButton label={t('Ausschalten', 'Turn off')} variant="ghost" onPress={() => props.onChoose(false)} />
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
  title: { ...Type.title, color: c.text },
  body: { ...Type.body, color: c.textMuted },
});
