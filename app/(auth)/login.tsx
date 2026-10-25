/**
 * Anmelden (PRD F1.1, F1.5, F1.6).
 *
 * Apple and Google are the paths for learners. Email sign-in is kept only for
 * App Review's demo account; there is deliberately no sign-up or reset screen.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Type, Space, Radius, HIT } from '../../constants/Colors';
import { useAuth } from '../../context/auth';
import { LanguageToggle, useI18n } from '../../lib/i18n';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple, signInWithEmail } = useAuth();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Apple's button is hidden where the platform cannot run it (Android, Expo Go).
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  async function run(action: () => Promise<{ error?: string; cancelled?: boolean }>) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.error) Alert.alert(t('Anmeldung fehlgeschlagen', 'Sign-in failed'), result.error);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LanguageToggle />
          <View style={styles.header}>
            <Text style={styles.appName}>einfach lernen</Text>
            <Text style={styles.tagline}>{t('Deutsch lernen, ganz einfach.', 'Learn German, simply.')}</Text>
          </View>

          <View style={styles.buttons}>
            {appleAvailable && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={Radius.pill}
                style={styles.appleBtn}
                onPress={() => { if (!busy) void run(signInWithApple); }}
              />
            )}

            <TouchableOpacity
              style={[styles.googleBtn, busy && styles.disabled]}
              onPress={() => { if (!busy) void run(signInWithGoogle); }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('Mit Google anmelden', 'Sign in with Google')}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google" size={18} color={Colors.bg} />
              <Text style={styles.googleText}>{t('Mit Google anmelden', 'Sign in with Google')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowEmail((v) => !v)}
              style={styles.emailToggle}
              accessibilityRole="button"
            >
              <Text style={styles.emailToggleText}>
                {showEmail ? t('Ausblenden', 'Hide') : t('Mit E-Mail anmelden', 'Sign in with email')}
              </Text>
            </TouchableOpacity>

            {showEmail && (
              <View style={styles.emailBox}>
                <TextInput
                  style={styles.input}
                  placeholder={t('E-Mail', 'Email')}
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  accessibilityLabel={t('E-Mail-Adresse', 'Email address')}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('Passwort', 'Password')}
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  accessibilityLabel={t('Passwort', 'Password')}
                />
                <TouchableOpacity
                  style={[styles.googleBtn, busy && styles.disabled]}
                  disabled={busy}
                  onPress={() => {
                    if (!email.trim() || !password) {
                      Alert.alert(
                        t('Fehlende Angaben', 'Missing details'),
                        t('Bitte E-Mail und Passwort eingeben.', 'Please enter your email and password.'),
                      );
                      return;
                    }
                    void run(() => signInWithEmail(email.trim(), password));
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.googleText}>{t('Anmelden', 'Sign in')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.legal}>
            {t('Mit der Anmeldung stimmst du der Datenschutzerklärung zu.', 'By signing in you accept the privacy policy.')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Space.gutter, gap: Space.xxl },
  header: { alignItems: 'center', gap: Space.sm },
  appName: { ...Type.display, color: Colors.white, textAlign: 'center' },
  tagline: { ...Type.body, color: Colors.textMuted, textAlign: 'center' },
  buttons: { gap: Space.md },
  appleBtn: { width: '100%', height: 50 },
  googleBtn: {
    minHeight: HIT, borderRadius: Radius.pill, backgroundColor: Colors.white,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.sm,
  },
  googleText: { ...Type.body, color: Colors.bg, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  emailToggle: { minHeight: HIT, alignItems: 'center', justifyContent: 'center' },
  emailToggleText: { ...Type.body, color: Colors.purple },
  emailBox: { gap: Space.sm },
  input: {
    minHeight: HIT, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.textMuted,
    paddingHorizontal: Space.md, color: Colors.white, ...Type.body,
  },
  legal: { ...Type.caption, color: Colors.textMuted, textAlign: 'center' },
});
