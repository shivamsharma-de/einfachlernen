import { Redirect } from 'expo-router';

// Root redirect — auth gate will replace this when auth is wired back in
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
