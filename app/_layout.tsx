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
import { Colors, Font } from '../constants/Colors';

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
  const [fontsLoaded, fontError] = useFonts({
    [Font.serif]: require('../assets/fonts/InstrumentSerif-Regular.ttf'),
    [Font.sans]: require('../assets/fonts/IBMPlexSans-Regular.ttf'),
    [Font.sansMedium]: require('../assets/fonts/IBMPlexSans-Medium.ttf'),
    [Font.sansSemi]: require('../assets/fonts/IBMPlexSans-SemiBold.ttf'),
    [Font.mono]: require('../assets/fonts/IBMPlexMono-Medium.ttf'),
  });

  // Never strand the user on the splash: if a face fails to decode, fall through
  // to system fonts rather than blocking forever.
  const ready = fontsLoaded || fontError !== null;

  // One event at launch, and one each time the app comes back from the background.
  useEffect(() => {
    track('app_opened');
    let last = AppState.currentState;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && last === 'background') track('app_opened');
      last = state;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;

  return (
    <AuthProvider>
    <I18nProvider>
      <ReviewSync />
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg }, animation: 'slide_from_right' }} />
    </I18nProvider>
    </AuthProvider>
  );
}
