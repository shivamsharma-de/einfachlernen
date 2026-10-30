import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/auth';
import { I18nProvider } from '../lib/i18n';
import { flushReviews } from '../lib/api';
import { track } from '../lib/analytics';
import { Font } from '../constants/Colors';
import { ThemeProvider, useTheme } from '../context/theme';

// Hold the native splash until the faces are ready, so the first frame is
// already typeset rather than flashing system sans and reflowing.
void SplashScreen.preventAutoHideAsync();

/**
 * Sends queued grades whenever they could now succeed: right after sign-in, and
 * each time the app returns to the foreground. Grades made offline wait here
 * until the connection is back. Renders nothing.
 */
function ReviewSync() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    void flushReviews(userId);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushReviews(userId);
    });
    return () => sub.remove();
  }, [userId]);

  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const { colors, scheme, ready: themeReady } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    [Font.serif]: require('../assets/fonts/InstrumentSerif-Regular.ttf'),
    [Font.sans]: require('../assets/fonts/IBMPlexSans-Regular.ttf'),
    [Font.sansMedium]: require('../assets/fonts/IBMPlexSans-Medium.ttf'),
    [Font.sansSemi]: require('../assets/fonts/IBMPlexSans-SemiBold.ttf'),
    [Font.mono]: require('../assets/fonts/IBMPlexMono-Medium.ttf'),
  });

  // Never strand the user on the splash: if a face fails to decode, fall through
  // to system fonts rather than blocking forever.
  const ready = (fontsLoaded || fontError !== null) && themeReady;

  // One event at launch, and one each time the app comes back from the background.
  // session_ended goes out each time the app leaves the foreground, with how long it was open.
  useEffect(() => {
    track('app_opened');
    let last = AppState.currentState;
    let foregroundAt = last === 'active' ? Date.now() : null;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && last === 'background') {
        track('app_opened');
        foregroundAt = Date.now();
      }
      if (state !== 'active' && last === 'active' && foregroundAt !== null) {
        track('session_ended', { active_s: Math.round((Date.now() - foregroundAt) / 1000) });
        foregroundAt = null;
      }
      last = state;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <AuthProvider>
    <I18nProvider>
      <ReviewSync />
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }} />
    </I18nProvider>
    </AuthProvider>
  );
}
