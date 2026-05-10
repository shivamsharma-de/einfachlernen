import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../context/auth';
import { Colors } from '../constants/Colors';

function AuthGate() {
  const { session, loading, profile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inCallback = segments[0] === 'auth';

    if (inCallback) return;

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');
    } else if (!profile?.onboarding_complete) {
      if (!inOnboarding) router.replace('/(onboarding)');
    } else {
      if (inAuth || inOnboarding) router.replace('/(tabs)');
    }
  }, [session, loading, profile?.onboarding_complete, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AuthGate />
    </AuthProvider>
  );
}
