import { Redirect, Stack } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/auth';

export default function AuthLayout() {
  const { loading, user } = useAuth();

  // Signed in while on the login screen: hand over to the start route, which decides
  // between level selection (new learner) and the tabs (returning learner).
  if (!loading && user) return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }} />
  );
}
