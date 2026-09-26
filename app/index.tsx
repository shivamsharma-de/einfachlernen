/**
 * Root gate.
 *
 * Auth itself is still a later milestone — `_screens_auth/` has not been moved
 * into `app/(auth)/` yet, so there is nowhere to send a signed-out user and the
 * tabs stay the default. What this does own is F2.2: a signed-in learner who
 * has never chosen a level lands on level selection first, because every other
 * screen reads `profiles.cefr_level` and would otherwise silently fall back to
 * A1 (`levelOf`).
 *
 * The test is `=== false`, not falsy: while the profile row is still loading it
 * is `null`, and bouncing a returning learner into onboarding on a slow network
 * would be worse than a moment of tabs.
 */
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/auth';

export default function Index() {
  const { loading, user, profile } = useAuth();

  // The splash has only just been dismissed; a spinner here would read as a flash.
  if (loading) return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;

  if (user && profile?.onboarding_complete === false) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
