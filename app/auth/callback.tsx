import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/theme';
import { completeOAuthCode } from '../../context/auth';

/**
 * Reached when the OS hands the app its redirect URL outside the in-app browser
 * (for example a cold start). The in-flight sign-in and this route share one code
 * exchange, so the PKCE code is redeemed once. Then the start route decides between
 * onboarding and the tabs; going straight to /(tabs) would skip onboarding.
 */
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (code) {
      // Back to the root gate, which waits for the profile and sends a new learner to onboarding.
      completeOAuthCode(code).finally(() => {
        router.replace('/');
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
