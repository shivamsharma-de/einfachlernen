/**
 * Anmelden (PRD F1.1, F1.5, F1.6).
 *
 * Apple and Google are the paths for learners. Email sign-in is a one-time code (BUG-007):
 * the learner enters an email address, gets a six-digit code by mail, and types it here.
 * There is no password, sign-up or reset screen.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { Type, Space, Radius, HIT } from '../../constants/Colors';
import type { ColorTokens } from '../../constants/Colors';
import { useThemedStyles, useTheme } from '../../context/theme';
import { useAuth } from '../../context/auth';
import { LanguageToggle, useI18n } from '../../lib/i18n';
import { track, toErrorCode, type SignInFailReason } from '../../lib/analytics';

const CODE_LENGTH = 6;

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { signInWithGoogle, signInWithApple, sendEmailCode, verifyEmailCode } = useAuth();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  // Email code flow: 'email' asks for the address, 'code' asks for the code from the mail.
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  useEffect(() => {
    // Apple's button is hidden where the platform cannot run it (Android, Expo Go).
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  async function run(action: () => Promise<{ error?: string; reason?: SignInFailReason }>) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.error) {
      track('error_shown', { area: 'sign_in', error_code: toErrorCode(result.reason) });
      Alert.alert(t('Anmeldung fehlgeschlagen', 'Sign-in failed'), result.error);
    }
  }

  /** Sends (or sends again) the code to the address typed above. */
  async function sendCode(address: string) {
    setEmailError(null);
    setEmailNotice(null);
    setEmailBusy(true);
    const result = await sendEmailCode(address);
    setEmailBusy(false);
    if (!result.ok) {
      track('error_shown', { area: 'sign_in', error_code: 'provider_error' });
      setEmailError(result.error);
      return;
    }
    setEmail(address);
    setCode('');
    setStep('code');
    setEmailNotice(t(`Wir haben einen Code an ${address} geschickt.`, `We sent a code to ${address}.`));
  }

  function onSendPress() {
    const address = email.trim();
    if (!address.includes('@')) {
      setEmailError(t('Bitte gib eine gültige E-Mail-Adresse ein.', 'Please enter a valid email address.'));
      return;
    }
    void sendCode(address);
  }

  async function onVerifyPress() {
    if (code.length !== CODE_LENGTH) {
      setEmailError(t(`Bitte gib den ${CODE_LENGTH}-stelligen Code ein.`, `Please enter the ${CODE_LENGTH}-digit code.`));
      return;
    }
    setEmailError(null);
    setEmailNotice(null);
    setEmailBusy(true);
    const result = await verifyEmailCode(email, code);
    setEmailBusy(false);
    if (!result.ok) {
      track('error_shown', { area: 'sign_in', error_code: 'provider_error' });
      setEmailError(result.error);
      return;
    }
    // Success: the session event moves the learner out of this screen (see app/(auth)/_layout.tsx).
    setEmailNotice(t('Angemeldet.', 'Signed in.'));
  }

  function changeEmail() {
    setStep('email');
    setCode('');
    setEmailError(null);
    setEmailNotice(null);
  }

  const emailDisabled = emailBusy;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LanguageToggle />
          <View style={styles.header}>
            <Text style={styles.appName}>
              swypo<Text style={{ color: colors.purple }}>.</Text>
            </Text>
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
              style={[styles.primaryBtn, busy && styles.disabled]}
              onPress={() => { if (!busy) void run(signInWithGoogle); }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('Mit Google anmelden', 'Sign in with Google')}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google" size={18} color={colors.bg} />
              <Text style={styles.primaryText}>{t('Mit Google anmelden', 'Sign in with Google')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowEmail((v) => !v)}
              style={styles.emailToggle}
              accessibilityRole="button"
            >
              <Text style={styles.emailToggleText}>
                {showEmail ? t('Ausblenden', 'Hide') : t('Mit E-Mail-Code anmelden', 'Sign in with email code')}
              </Text>
            </TouchableOpacity>

            {showEmail && step === 'email' && (
              <View style={styles.emailBox}>
                <TextInput
                  style={styles.input}
                  placeholder={t('E-Mail', 'Email')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  editable={!emailDisabled}
                  value={email}
                  onChangeText={setEmail}
                  accessibilityLabel={t('E-Mail-Adresse', 'Email address')}
                />
                {emailError && <Text style={styles.errorText} accessibilityRole="alert">{emailError}</Text>}
                <TouchableOpacity
                  style={[styles.primaryBtn, emailDisabled && styles.disabled]}
                  disabled={emailDisabled}
                  onPress={onSendPress}
                  accessibilityRole="button"
                  accessibilityState={{ busy: emailBusy, disabled: emailDisabled }}
                >
                  {emailBusy
                    ? <ActivityIndicator color={colors.inverseText} />
                    : <Text style={styles.primaryText}>{t('Code senden', 'Send code')}</Text>}
                </TouchableOpacity>
              </View>
            )}

            {showEmail && step === 'code' && (
              <View style={styles.emailBox}>
                {emailNotice && <Text style={styles.noticeText} accessibilityRole="alert">{emailNotice}</Text>}
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder={'0'.repeat(CODE_LENGTH)}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={CODE_LENGTH}
                  editable={!emailDisabled}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                  accessibilityLabel={t('Anmeldecode', 'Sign-in code')}
                />
                {emailError && <Text style={styles.errorText} accessibilityRole="alert">{emailError}</Text>}
                <TouchableOpacity
                  style={[styles.primaryBtn, (emailDisabled || code.length !== CODE_LENGTH) && styles.disabled]}
                  disabled={emailDisabled || code.length !== CODE_LENGTH}
                  onPress={() => void onVerifyPress()}
                  accessibilityRole="button"
                  accessibilityState={{ busy: emailBusy, disabled: emailDisabled || code.length !== CODE_LENGTH }}
                >
                  {emailBusy
                    ? <ActivityIndicator color={colors.inverseText} />
                    : <Text style={styles.primaryText}>{t('Anmelden', 'Sign in')}</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  disabled={emailDisabled}
                  onPress={() => void sendCode(email)}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryText}>{t('Neuen Code anfordern', 'Request a new code')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  disabled={emailDisabled}
                  onPress={changeEmail}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryText}>{t('Andere E-Mail-Adresse', 'Use a different email')}</Text>
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

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Space.gutter, gap: Space.xxl },
  header: { alignItems: 'center', gap: Space.sm },
  appName: { ...Type.display, color: c.text, textAlign: 'center' },
  tagline: { ...Type.body, color: c.textMuted, textAlign: 'center' },
  buttons: { gap: Space.md },
  appleBtn: { width: '100%', height: 50 },
  primaryBtn: {
    minHeight: HIT, borderRadius: Radius.pill, backgroundColor: c.inverseFill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.sm,
  },
  primaryText: { ...Type.body, color: c.inverseText, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  emailToggle: { minHeight: HIT, alignItems: 'center', justifyContent: 'center' },
  emailToggleText: { ...Type.body, color: c.purple },
  emailBox: { gap: Space.sm },
  input: {
    minHeight: HIT, borderRadius: Radius.card, borderWidth: 1, borderColor: c.textMuted,
    paddingHorizontal: Space.md, color: c.text, ...Type.body,
  },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontWeight: '600' },
  errorText: { ...Type.body, color: c.red },
  noticeText: { ...Type.body, color: c.green },
  secondaryBtn: { minHeight: HIT, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { ...Type.body, color: c.purple },
  legal: { ...Type.caption, color: c.textMuted, textAlign: 'center' },
});
