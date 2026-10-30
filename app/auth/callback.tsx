import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/theme';

export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (code) {
      supabase.auth.exchangeCodeForSession(code).finally(() => {
        router.replace('/(tabs)');
      });
    } else {
      router.replace('/(auth)/login');
    }
  }, [code]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.gold} size="large" />
    </View>
  );
}
