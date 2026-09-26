import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../context/auth';
import { Colors, Font } from '../constants/Colors';

// Hold the native splash until the faces are ready, so the first frame is
// already typeset rather than flashing system sans and reflowing.
void SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg }, animation: 'slide_from_right' }} />
    </AuthProvider>
  );
}
