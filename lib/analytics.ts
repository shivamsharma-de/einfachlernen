import PostHog from 'posthog-react-native';

export const posthog = new PostHog('phc_placeholder_replace_with_real_key', {
  host: 'https://eu.i.posthog.com',
  disabled: __DEV__,
});

// PostHog only accepts JSON-serializable property values; derive the type from
// the client so it stays correct across SDK bumps.
type EventProps = NonNullable<Parameters<PostHog['capture']>[1]>;

export function identify(userId: string, props?: EventProps) {
  posthog.identify(userId, props);
}

export function track(event: string, props?: EventProps) {
  posthog.capture(event, props);
}

export function reset() {
  posthog.reset();
}
