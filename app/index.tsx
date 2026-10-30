/**
 * Root gate (PRD F1.2).
 *
 *   signed out                      → /(auth)/login
 *   signed in, onboarding not done  → /onboarding (F2.2: level before the deck)
 *   otherwise                       → /(tabs)
 *
 * The test is `=== false`, not falsy: while the profile row is still loading it
 * is `null`, and bouncing a returning learner into onboarding on a slow network
 * would be worse than a moment of tabs.
 */
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useTheme } from '../context/theme';
import { useAuth } from '../context/auth';

export default function Index() {
  const { loading, user, profile } = useAuth();
  const { colors } = useTheme();

  // The splash has only just been dismissed; a spinner here would read as a flash.
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  if (!user) return <Redirect href="/(auth)/login" />;

  if (profile?.onboarding_complete === false) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
