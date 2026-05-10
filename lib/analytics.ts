import PostHog from 'posthog-react-native';

export const posthog = new PostHog('phc_placeholder_replace_with_real_key', {
  host: 'https://eu.i.posthog.com',
  disabled: __DEV__,
});

export function identify(userId: string, props?: Record<string, unknown>) {
  posthog.identify(userId, props);
}

export function track(event: string, props?: Record<string, unknown>) {
  posthog.capture(event, props);
}

export function reset() {
  posthog.reset();
}
