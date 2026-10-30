# Analytics and performance timing

Written for: the person running the app and reading the PostHog dashboards.

## Where events come from

All client events go through `track()` in `lib/analytics.ts`. Event names and properties are typed
in `AnalyticsEventMap`. A property that is not in `SCHEMA` (same file) is dropped silently, so a new
property must be added to both.

Analytics is off when `EXPO_PUBLIC_POSTHOG_KEY` is unset, and off in dev builds unless
`EXPO_PUBLIC_ANALYTICS_IN_DEV=true`.

Server timing goes to Supabase function logs, not to PostHog. Each `scan-words` and `word-ai` request
writes one `event: "request"` line (status, duration in ms). `word-ai` also writes an `event: "model"`
line with input and output tokens. Logs carry no image, word or prompt text.

## Timing properties

| Event | Timing property | What it measures |
|---|---|---|
| `deck_opened` | `load_ms` | Mount to a ready session (resume or build) |
| `card_graded` | `think_ms` | Card on screen to grade |
| `session_completed` | `active_s` | Foreground seconds in the deck screen this session (same clock as Supabase `touch_session`) |
| `session_ended` | `active_s` | Foreground seconds since the app last became active, sent when it leaves the foreground |
| `test_started` | `load_ms` | Tap to questions ready |
| `test_answered` | `think_ms` | Question on screen to answer |
| `test_finished` | `duration_ms` | Round start to finish |
| `scan_photo_taken` | `image_kb` | Prepared image size |
| `scan_result` | `prep_ms`, `gate_ms`, `network_ms`, `duration_ms` | Phone preparation, page gate, server round trip, and total since capture |

Gate-blocked scans send `scan_result` with `network_ms: 0`, so they are not mixed into server latency.

## Suggested PostHog insights

- Scan latency: p50 and p95 of `network_ms`, by `ok`. Compare with the server `request` lines.
- Scan failures: count of `scan_result` by `error_code`, excluding `none`.
- Deck responsiveness: median `load_ms` on `deck_opened`, per week.
- Think time: median `think_ms` on `card_graded` by `grade`, to spot cards that take too long.
- Time spent: sum of `session_ended.active_s` per day, per learner.
- Errors: `error_shown` by `area` and `error_code`.

## Privacy rules

- Only scalars and enum strings reach PostHog. Keep it that way: no new free-text property.
- Session replay masks all text, images and sandboxed views, and records no touches or logs
  (`REPLAY_CONFIG`). It starts only after the learner agrees in Profil.

## Changing the tracking

1. Add the event to `AnalyticsEventMap`, and any new property to `SCHEMA`.
2. Add a unit test in `lib/__tests__/analytics.test.ts`.
3. Run `npm run typecheck` and `npm test`.
4. For a test run, set `EXPO_PUBLIC_ANALYTICS_IN_DEV=true` and watch PostHog Live events.
