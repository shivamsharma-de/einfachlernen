import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../context/auth';
import { Ionicons } from '@expo/vector-icons';
import { Type } from '../../constants/Colors';
import type { ColorTokens } from '../../constants/Colors';
import { useThemedStyles, useTheme } from '../../context/theme';
import { View, StyleSheet, Platform, type ColorValue } from 'react-native';
import { OnboardingTour, SessionTrackingPrompt } from '../../components';
import { completeTour, saveSessionTracking } from '../../lib/profile';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, focused }: { name: IoniconsName; color: ColorValue; focused: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      {/* Tab colours are always hex strings; RN 0.88 widened ColorValue (null, number). */}
      <Ionicons name={name} size={22} color={typeof color === 'string' ? color : undefined} />
    </View>
  );
}

/** Five tabs — design-spec.md §6.6 is explicit that six is too many.
 *  Phrases becomes "Wörter"; the quiz and the leaderboard stay as routes but
 *  leave the bar: quiz is entered from Home, ranks from Profil. */
export default function TabLayout() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { loading, user, profile, refreshProfile } = useAuth();

  // First run after onboarding: the six-step tour, then the session tracking question (once each).
  const askTour = !!profile && profile.onboarding_complete && !profile.tour_completed_at;
  const askTracking = !!profile && profile.onboarding_complete && !!profile.tour_completed_at && !profile.session_tracking_asked_at;
  const finishTour = async () => {
    if (!user) return;
    await completeTour(user.id);
    await refreshProfile();
  };
  const chooseTracking = async (granted: boolean) => {
    if (!user) return;
    await saveSessionTracking(user.id, granted);
    await refreshProfile();
  };

  // The root gate only runs when the app opens. Signing out while the tabs are
  // showing leaves them mounted, so this sends the learner back to login.
  if (!loading && !user) return <Redirect href="/(auth)/login" />;

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Heute',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'today' : 'today-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="deck"
        options={{
          title: 'Deck',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'layers' : 'layers-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'scan' : 'scan-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="phrases"
        options={{
          title: 'Wörter',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'book' : 'book-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} color={color} focused={focused} />
          ),
        }}
      />

      {/* Routable, but not on the bar. */}
      <Tabs.Screen name="quiz" options={{ href: null }} />
      <Tabs.Screen name="leaderboard" options={{ href: null }} />
    </Tabs>
    <OnboardingTour visible={askTour} onFinish={() => { void finishTour(); }} />
    <SessionTrackingPrompt visible={askTracking} onChoose={(granted) => { void chooseTracking(granted); }} />
    </>
  );
}

const makeStyles = (c: ColorTokens) => StyleSheet.create({
  tabBar: {
    backgroundColor: c.surface,
    borderTopColor: c.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 82 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  tabLabel: { ...Type.eyebrow, marginTop: 2 },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  iconWrapActive: {
    backgroundColor: c.purpleBg,
  },
});
