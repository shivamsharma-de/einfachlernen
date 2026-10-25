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

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple, signInWithEmail } = useAuth();
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
    if (result.error) Alert.alert('Anmeldung fehlgeschlagen', result.error);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.appName}>einfach lernen</Text>
            <Text style={styles.tagline}>Deutsch lernen, ganz einfach.</Text>
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
              accessibilityLabel="Mit Google anmelden"
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google" size={18} color={Colors.bg} />
              <Text style={styles.googleText}>Mit Google anmelden</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowEmail((v) => !v)}
              style={styles.emailToggle}
              accessibilityRole="button"
            >
              <Text style={styles.emailToggleText}>
                {showEmail ? 'Ausblenden' : 'Mit E-Mail anmelden'}
              </Text>
            </TouchableOpacity>

            {showEmail && (
              <View style={styles.emailBox}>
                <TextInput
                  style={styles.input}
                  placeholder="E-Mail"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  accessibilityLabel="E-Mail-Adresse"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Passwort"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  accessibilityLabel="Passwort"
                />
                <TouchableOpacity
                  style={[styles.googleBtn, busy && styles.disabled]}
                  disabled={busy}
                  onPress={() => {
                    if (!email.trim() || !password) {
                      Alert.alert('Fehlende Angaben', 'Bitte E-Mail und Passwort eingeben.');
                      return;
                    }
                    void run(() => signInWithEmail(email.trim(), password));
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.googleText}>Anmelden</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.legal}>
            Mit der Anmeldung stimmst du der Datenschutzerklärung zu.
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
