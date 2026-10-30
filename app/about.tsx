/**
 * Über swypo (FEAT-005): version and build, then the legal and support pages.
 * Each page opens in the in-app browser (expo-web-browser), so the learner never leaves the app.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as WebBrowser from 'expo-web-browser';
import { Type, Space, HIT } from '../constants/Colors';
import type { ColorTokens } from '../constants/Colors';
import { useThemedStyles, useTheme } from '../context/theme';
import { useI18n } from '../lib/i18n';
import { LINKS } from '../hooks/links';

type PageKey = keyof typeof LINKS;

const PAGES: readonly { key: PageKey; de: string; en: string }[] = [
  { key: 'privacy', de: 'Datenschutzerklärung', en: 'Privacy Policy' },
  { key: 'licenses', de: 'Drittanbieter-Lizenzen', en: 'Third-party licences' },
  { key: 'terms', de: 'Nutzungsbedingungen', en: 'Terms of Use' },
  { key: 'platformRules', de: 'Plattformregeln', en: 'Platform Rules' },
  { key: 'support', de: 'Support', en: 'Support' },
];

/** From app.json through expo-constants. The build number is the native one, set at build time. */
const VERSION = Constants.expoConfig?.version ?? '—';
const BUILD = Application.nativeBuildVersion ?? '—';

export default function AboutScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useI18n();
  const [opening, setOpening] = useState<PageKey | null>(null);

  const openPage = useCallback(async (key: PageKey) => {
    setOpening(key);
    try {
      await WebBrowser.openBrowserAsync(LINKS[key]);
    } catch {
      Alert.alert(
        t('Seite nicht geöffnet', 'Page not opened'),
        t('Bitte versuche es erneut.', 'Please try again.'),
      );
    } finally {
      setOpening(null);
    }
  }, [t]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel={t('Zurück', 'Back')}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('Über swypo', 'About swypo')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <InfoRow label={t('Version', 'Version')} value={VERSION} styles={styles} />
          <InfoRow label="Build" value={BUILD} styles={styles} />
        </View>

        <View style={styles.section}>
          {PAGES.map(({ key, de, en }) => {
            const busy = opening === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => { void openPage(key); }}
                disabled={opening !== null}
                style={styles.row}
                accessibilityRole="link"
                accessibilityLabel={t(de, en)}
                accessibilityState={{ busy, disabled: opening !== null && !busy }}
                activeOpacity={0.85}
              >
                <Text style={styles.rowLabel}>{t(de, en)}</Text>
                {busy
                  ? <ActivityIndicator color={colors.textMuted} />
                  : <Text style={styles.chevron}>›</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.row} accessibilityRole="text">
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingHorizontal: Space.lg, paddingVertical: Space.md },
  back: { minWidth: HIT, minHeight: HIT, alignItems: 'center', justifyContent: 'center' },
  backText: { ...Type.title, color: c.text },
  title: { ...Type.title, color: c.text },
  content: { paddingBottom: 40, gap: Space.xxl, paddingTop: Space.sm },
  section: {
    marginHorizontal: Space.gutter,
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: Space.lg,
  },
  row: {
    minHeight: HIT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.md,
    paddingVertical: Space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  rowLabel: { ...Type.bodyL, color: c.text, flexShrink: 1 },
  rowValue: { ...Type.body, color: c.textMuted },
  chevron: { ...Type.title, fontSize: 22, lineHeight: 24, color: c.textMuted },
});
