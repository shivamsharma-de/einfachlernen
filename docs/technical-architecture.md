# Technical Architecture Document
## einfachlernen — Language Learning App

---

## 1. Overview

A mobile-first language learning app built with Expo (React Native). The MVP runs entirely on-device with no backend: content is bundled as TypeScript data files and progress is stored in AsyncStorage. Supabase is added in Phase 2 for accounts and cloud sync.

German is the launch language. The data model is language-agnostic so other languages can be added as additional data files without code changes.

---

## 2. Phase 1 Architecture (MVP — No Backend)

```
┌──────────────────────────────────────────────┐
│            Expo App (React Native)            │
│          iOS (App Store) + Android            │
│                                               │
│  ┌─────────────┐   ┌──────────────────────┐  │
│  │ Content Data │   │  AsyncStorage        │  │
│  │ (bundled TS) │   │  (local progress,    │  │
│  │ vocabulary   │   │   XP, mastery state) │  │
│  │ redemittel   │   └──────────────────────┘  │
│  └─────────────┘                              │
└──────────────────────────────────────────────┘
```

### Phase 2 Architecture (Accounts + Sync)

```
┌──────────────────────────────────────────────┐
│            Expo App (React Native)            │
└──────────────┬───────────────────────────────┘
               │ HTTPS
               ▼
    ┌──────────────────────┐
    │       Supabase        │
    │  Auth + PostgreSQL    │
    │  (user progress sync) │
    └──────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Mobile Frontend | Expo 52 (React Native) | Single codebase for iOS + Android |
| Navigation | Expo Router (file-based) | Tab + stack navigation |
| Local Storage | AsyncStorage | XP, mastery state, streak, SRS timestamps — MVP |
| Content Data | Bundled TypeScript files | `data/vocabulary.ts`, `data/redemittel.ts` |
| Audio (TTS) | expo-speech | Device TTS, locale `de-DE`, no assets needed |
| Haptics | expo-haptics | Feedback on correct/wrong answers |
| Analytics | PostHog (posthog-react-native) | Session, answer, and navigation events |
| Auth (Phase 2) | Supabase Auth | Email, Apple ID, Google |
| Database (Phase 2) | Supabase PostgreSQL + RLS | Cloud progress sync |
| CI/CD | GitHub Actions + EAS | Builds and store submission |
| Distribution | Apple App Store + Google Play | |

---

## 3. Content Data Model

All content is statically typed and bundled with the app. The language field on every record enables future multi-language support.

### VocabWord
```typescript
interface VocabWord {
  id: string;
  language: string;         // 'de', 'es', 'fr' — multi-language ready
  level: CEFRLevel;         // 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  category: WordCategory;
  type: 'noun' | 'verb' | 'adjective' | 'phrase' | 'adverb';
  german: string;
  article?: 'der' | 'die' | 'das';
  english: string;
  pronunciation: string;
  hint: string;
  exampleDe: string;
  exampleEn: string;
  distractors: string[];    // 3 wrong answers for quiz mode
}
```

### Phrase (Redemittel)
```typescript
interface Phrase {
  id: string;
  language: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  category: PhraseCategory;
  register: 'formal' | 'informal' | 'neutral';
  usage: 'spoken' | 'written' | 'both';
  german: string;
  english: string;
  exampleDe: string;
  exampleEn: string;
  tip?: string;
}
```

---

## 4. Local Progress Schema (AsyncStorage)

Stored as JSON under a single key per user (keyed by device in MVP, keyed by `user_id` in Phase 2).

```typescript
interface LocalProgress {
  xp: number;
  streak: number;
  lastActiveDate: string;        // ISO date string
  masteredWords: string[];       // word IDs
  masteredPhrases: string[];     // phrase IDs
  wordStats: {
    [wordId: string]: {
      correctCount: number;
      incorrectCount: number;
      lastReviewed: string;
    };
  };
}
```

---

## 5. Spaced Repetition (SM-2 Lite)

Each word has a review record stored in AsyncStorage:

```typescript
interface WordReview {
  wordId: string;
  interval: number;       // days until next review (starts at 1)
  repetitions: number;    // consecutive correct answers
  nextReviewAt: string;   // ISO date string
}
```

**Algorithm on "Got it":**
- `repetitions += 1`
- `interval = repetitions === 1 ? 1 : repetitions === 2 ? 3 : interval * 2.5`
- `nextReviewAt = today + interval days`

**Algorithm on "Still learning":**
- `repetitions = 0`
- `interval = 1`
- `nextReviewAt = today`

A word is "mastered" when `repetitions >= 3` and `interval >= 7` (seen correctly at 1, 3, 7+ day gaps). The home screen surfaces words where `nextReviewAt <= today`.

---

## 6. PostHog Integration

PostHog is initialised once at app startup using a device-generated anonymous ID. No PII is sent.

```typescript
// lib/analytics.ts
import PostHog from 'posthog-react-native';

export const posthog = new PostHog(POSTHOG_API_KEY, {
  host: 'https://eu.posthog.com',
});

export const track = (event: string, props?: Record<string, unknown>) =>
  posthog.capture(event, props);
```

**Event catalog:**

| Event | Key Properties |
|---|---|
| `screen_viewed` | `screen_name`, `language`, `level` |
| `tab_tapped` | `tab_name` |
| `session_started` | `mode`, `level`, `word_count` |
| `session_completed` | `mode`, `level`, `correct`, `incorrect`, `xp_earned`, `hearts_remaining`, `duration_seconds` |
| `session_abandoned` | `mode`, `level`, `cards_seen`, `reason` |
| `answer_submitted` | `word_id`, `correct`, `level`, `response_time_ms` |
| `hint_used` | `hint_type`, `xp_cost`, `word_id` |
| `level_selected` | `level` |

In Phase 2, call `posthog.identify(userId, { language, level })` on login to attach events to a user account.

---

## 7. Game State (useGameState hook)

The quiz session is managed entirely in `hooks/useGameState.ts`. Key state:

| State | Type | Description |
|---|---|---|
| `questionIndex` | number | Current position in session |
| `hearts` | number | Lives remaining (starts at 3) |
| `xp` | number | XP earned this session |
| `answerState` | `'idle' \| 'correct' \| 'wrong'` | Drives UI feedback |
| `hintsUsed` | string[] | Which hints have been used on current card |
| `eliminatedIndices` | number[] | Indices removed by the "Eliminate 2" hint |
| `sessionDone` | boolean | True when session is complete |

Session ends when: all cards answered, or `hearts === 0`.

---

## 8. CEFR Level Unlock Logic

A level unlocks when the user has mastered ≥ 80% of words in the previous level.

```
A1 → always unlocked
A2 → unlocks when 80% of A1 words mastered
B1 → unlocks when 80% of A2 words mastered
...
```

Mastery is defined by the SRS state: `repetitions >= 3` and `interval >= 7`.

---

## 9. Repository Structure

```
einfachlernen/
├── app/
│   ├── (onboarding)/         # First-launch language + level picker
│   ├── (tabs)/
│   │   ├── _layout.tsx       # Tab bar config
│   │   ├── index.tsx         # Home — CEFR level grid
│   │   ├── quiz.tsx          # Quiz mode screen
│   │   ├── phrases.tsx       # Redemittel browser
│   │   └── leaderboard.tsx   # Leaderboard
│   └── _layout.tsx           # Root layout
├── components/               # Reusable UI components
├── constants/
│   └── Colors.ts             # Article colours, level colours, theme
├── data/
│   ├── vocabulary.ts         # All VocabWord records (de, A1–C2)
│   └── redemittel.ts         # All Phrase records (de, A1–B2)
├── hooks/
│   ├── useGameState.ts       # Quiz session state machine
│   └── useSRS.ts             # SM-2 lite spaced repetition logic
├── lib/
│   └── analytics.ts          # PostHog wrapper (track helper)
├── docs/
│   ├── prd.md
│   └── technical-architecture.md
├── assets/
├── app.json
└── tsconfig.json
```

---

## 10. CI/CD Pipeline

```
Push to GitHub
    │
    ▼
GitHub Actions
    ├── TypeScript check (tsc --noEmit)
    ├── Lint (ESLint)
    └── On merge to main → EAS Build
                               ├── iOS (.ipa)
                               └── Android (.aab)
```

### Key Commands
```bash
npx expo start          # Local dev
eas build --platform all  # Production builds
eas submit --platform all # Store submission
```

---

## 11. Phase 2 — Supabase Schema

When accounts are added, progress migrates from AsyncStorage to Supabase. Local progress is uploaded on first login.

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid | FK → auth.users.id |
| display_name | text | |
| xp | integer | Total XP |
| streak | integer | Days |
| last_active_date | date | |

### `word_progress`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles.id |
| word_id | text | Matches `VocabWord.id` |
| language | text | 'de', 'es', etc. |
| correct_count | integer | |
| incorrect_count | integer | |
| mastered | boolean | |
| last_reviewed_at | timestamp | |

### `phrase_progress`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles.id |
| phrase_id | text | Matches `Phrase.id` |
| language | text | |
| seen | boolean | |

RLS: users can only read and write their own rows.

---

## 12. Phase 3 — LLM Explanations

- Node.js service on Vercel acts as middleware
- App sends a word/phrase ID; backend looks up content, calls Claude API
- API keys never in the app bundle
- Responses cached in Supabase to reduce cost

---

## 13. Infrastructure Cost

| Service | Phase 1 Cost | Phase 2 Cost |
|---|---|---|
| Expo / EAS | Free tier | Free tier |
| Supabase | N/A | Free tier |
| PostHog | Free tier (1M events/mo) | Free tier |
| Apple Developer | $99/year | $99/year |
| Google Play | $25 one-time | — |
| **Total** | **~$124** | **~$124** |
