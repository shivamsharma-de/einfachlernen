import { Redirect, Stack } from 'expo-router';
import { useTheme } from '../../context/theme';
import { useAuth } from '../../context/auth';

export default function AuthLayout() {
  const { loading, user } = useAuth();
  const { colors } = useTheme();

  // Signed in while on the login screen: hand over to the start route, which decides
  // between level selection (new learner) and the tabs (returning learner).
  if (!loading && user) return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
  );
}
