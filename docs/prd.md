# Product Requirements Document (PRD)
## einfachlernen — Language Learning App

**Version:** 1.0 — MVP
**Last Updated:** May 2026
**Status:** Active Development

---

## 1. Product Overview

**einfachlernen** ("simply learn" in German) is a mobile language learning app that teaches vocabulary and common phrases through a two-mode learning loop: flashcards for first exposure and a gamified quiz for practice and retention.

German is the launch language. The architecture is multi-language from day one so additional languages (Spanish, French, etc.) can be added without restructuring.

Content is organised by CEFR level (A1 → C2). Users start at A1 and progress through levels as they master vocabulary and phrases.

---

## 2. Goals

- Teach language efficiently through a clear two-mode loop: learn then practice
- Make daily practice feel like a game, not homework
- Launch a polished, fully free MVP for German — no paywalls
- Build the data model to support multiple languages from the beginning

---

## 3. Target Users

- Absolute beginners learning German for travel, work, or study
- Intermediate learners (A2–B1) wanting to reinforce vocabulary and phrases
- Self-directed learners who want a focused, ad-free alternative to Duolingo

---

## 4. Content Types

### Vocabulary
Individual words with article (der/die/das), pronunciation, English translation, example sentence, and 3 wrong answer distractors for quiz mode.

### Redemittel (Phrases)
Common expressions and sentence starters used in everyday spoken and written German. Each phrase has a register (formal/informal/neutral), a usage context (spoken/written/both), and an example.

Both content types are tagged with CEFR level (A1–C2) and category (e.g. Greetings, Food & Drink, Opinions).

---

## 5. Feature Phases

### Phase 1 — MVP
Core learning loop (flashcards + quiz), auth (Google + email), CEFR progression, progress synced to Supabase.

### Phase 2 — Growth
Additional languages, streak tracking, leaderboard with live data, social sharing.

### Phase 3 — Scale
LLM-assisted explanations, audio pronunciation, premium tier.

---

## 6. MVP Features

---

### 6.1 Onboarding (First Launch Only)

**User Stories**
- As a first-time user, I want to pick my target language so the app shows me the right content
- As a first-time user, I want to set my starting level so I'm not shown words I already know

**Acceptance Criteria**
- [ ] Shown only on first app launch (never again after completed)
- [ ] Step 1: Pick target language (German only in MVP; UI supports adding more)
- [ ] Step 2: Self-assess CEFR level — user picks from A1 / A2 / B1+ with plain descriptions ("complete beginner", "know basics", "can hold a conversation")
- [ ] Chosen level sets the default unlocked levels (e.g. choosing A2 unlocks A1 + A2)
- [ ] No account creation required — onboarding stores prefs locally
- [ ] "Skip" option available — defaults to A1 German

---

### 6.2 Authentication

**User Stories**
- As a new user, I want to sign up with my Google account so I don't have to create a new password
- As a new user, I want to sign up with my email if I'd rather not use Google
- As a returning user, I want to log in and have my progress restored automatically
- As a user, I want my XP, mastery state, and streak synced to the cloud so I don't lose progress if I switch devices

**Acceptance Criteria**
- [ ] Google OAuth login (one-tap sign-in)
- [ ] Email + password signup with verification email
- [ ] Email + password login
- [ ] Password reset via email
- [ ] Session persists across app restarts (Supabase session token stored locally)
- [ ] On first login after using the app as a guest, local progress (XP, mastery, SRS state) is migrated to the user's account
- [ ] Logout available in settings
- [ ] Auth is required before accessing the home screen (no anonymous usage)

---

### 6.3 Home Screen

**User Stories**
- As a user, I want to see my CEFR levels at a glance and pick one to study
- As a user, I want to know how many words I've mastered per level
- As a user, I want to see my current XP and streak so I feel motivated

**Acceptance Criteria**
- [ ] Displays all six CEFR levels (A1–C2) as cards
- [ ] Each level card shows: level label, name, total word count, mastered count, progress bar
- [ ] Levels above the user's current level are locked (visually dimmed)
- [ ] A1 and A2 are unlocked by default; higher levels unlock after mastering 80% of the prior level
- [ ] Tapping an unlocked level launches a session for that level
- [ ] Filter chips allow selecting multiple levels for a mixed session

---

### 6.4 Flashcard Mode (Learn)

**User Stories**
- As a user encountering a new word, I want to see it clearly with its article and meaning before being tested
- As a user, I want to flip a card to reveal the translation and an example sentence
- As a user, I want to hear the word pronounced so I know how it sounds

**Acceptance Criteria**
- [ ] Card front: German word (with article colour-coded: der=blue, die=red, das=green), pronunciation guide
- [ ] Speaker icon on card front — tapping plays TTS via Expo Speech (locale: `de-DE`)
- [ ] Card back (revealed on tap): English translation, example sentence in German, English translation of example
- [ ] Two buttons: "Got it" (marks word as reviewed, advances SRS interval) and "Still learning" (resets SRS interval)
- [ ] Progress bar across top showing position in session
- [ ] Session ends with a summary: cards seen, got it vs still learning count
- [ ] Session transitions to Quiz mode after completion (or user can skip to quiz)

---

### 6.5 Quiz Mode (Practice)

**User Stories**
- As a user, I want to be tested on words I've already seen in flashcard mode
- As a user, I want immediate feedback so I know if I was right

**Acceptance Criteria**
- [ ] Multiple choice: German word shown, choose the correct English meaning from 4 options
- [ ] Article shown colour-coded (der/die/das) for nouns
- [ ] Correct answer: green highlight, XP awarded, haptic feedback
- [ ] Wrong answer: red highlight on chosen option, correct answer revealed, heart lost
- [ ] 3 hearts per session; session ends early if all hearts are lost
- [ ] XP earned per correct answer; XP tracked across sessions
- [ ] 4 hint types available (spend XP): Context clue, First letter, Eliminate 2 wrong answers, Picture
- [ ] End-of-session summary: score, XP earned, hearts remaining, correct/incorrect count
- [ ] Speaker icon during question — tap to hear the German word via TTS
- [ ] SRS: correct answers push the word's next review date forward; wrong answers pull it back to soon
- [ ] Words answered wrong are flagged for review in the next session

---

### 6.6 Phrases Screen (Redemittel)

**User Stories**
- As a user, I want to browse common German expressions by category
- As a user, I want to see the register (formal/informal) so I use phrases correctly

**Acceptance Criteria**
- [ ] Scrollable list of phrases grouped by category (Opinions, Agreement, Greetings, etc.)
- [ ] Each phrase shows: German text, English translation, register badge, example sentence
- [ ] Filter by level (A1/A2/B1/B2) and by register (formal/informal/neutral)
- [ ] Tap a phrase to expand and see the full example with translation

---

### 6.7 Leaderboard

**User Stories**
- As a user, I want to see how my XP compares to others so I stay motivated

**Acceptance Criteria**
- [ ] Ranked list showing username, XP total, and current level
- [ ] Current user's row is highlighted
- [ ] MVP: local/mock data; Phase 2: live data from Supabase

---

### 6.8 Progress Tracking (Supabase — MVP)

**Acceptance Criteria**
- [ ] XP total synced to Supabase on session end
- [ ] Per-word mastery and SRS state synced per session
- [ ] Streak counter: consecutive days with at least one session completed
- [ ] Local AsyncStorage used as a write-through cache; Supabase is the source of truth
- [ ] On app open, pull latest progress from Supabase if network available; fall back to local cache offline

---

### 6.9 Analytics (PostHog)

PostHog is integrated from day one to understand real usage patterns. No PII is captured. The Supabase `user_id` is used as the PostHog distinct ID after login, so events are tied to real users from MVP launch.

**Events to track**

| Event | Properties |
|---|---|
| `screen_viewed` | `screen_name`, `language`, `level` |
| `tab_tapped` | `tab_name` |
| `session_started` | `mode` (flashcard/quiz), `level`, `word_count` |
| `session_completed` | `mode`, `level`, `correct`, `incorrect`, `xp_earned`, `hearts_remaining`, `duration_seconds` |
| `session_abandoned` | `mode`, `level`, `cards_seen`, `reason` (heart_loss/back_button) |
| `answer_submitted` | `word_id`, `correct` (bool), `level`, `response_time_ms` |
| `hint_used` | `hint_type`, `xp_cost`, `word_id` |
| `level_selected` | `level` |

**What we want to learn from analytics**
- Which levels see the most drop-off (session_abandoned rate by level)
- Which hint types are most used (cost tuning)
- Average session length and correct-answer rate per level
- Funnel: session_started → session_completed

---

## 7. Out of Scope (MVP)

- Apple ID / Sign in with Apple (Phase 2)
- User-generated content
- Push notifications
- Web version
- Monetisation / paywall

---

## 8. Core User Flows

### First Launch Flow
```
App opens → Auth screen (login / sign up)
    → Google one-tap or email + password
    → Onboarding (first time only)
        → Step 1: Pick language (German)
        → Step 2: Pick starting level (A1 / A2 / B1+)
    → Home screen
```

### First Session Flow
```
Home → Tap A1 → Flashcard mode
    → Card front: word + article + [speaker icon]
    → User taps to reveal back: translation + example
    → "Got it" (SRS interval advances) or "Still learning" (interval resets)
    → Session summary → "Practice now" → Quiz mode
    → Multiple choice + hearts + XP + hints
    → Quiz summary → Back to home
```

### Returning User Flow
```
App opens → Session restored from Supabase → Home (shows XP + streak)
    → SRS surfaces words due for review
    → User picks level → Quiz mode (known words)
    → Summary → Progress synced to Supabase → Home
```

---

## 9. Non-Functional Requirements

| Requirement | Target |
|---|---|
| App launch time | < 2 seconds |
| Animation frame rate | 60 fps |
| Platform support | iOS 15+ and Android 10+ |
| Offline | Playable offline using local cache; syncs to Supabase when back online |
| Auth required | Users must be logged in; no anonymous usage |

---

## 10. MVP Launch Checklist

- [ ] Supabase project created with schema deployed
- [ ] Google OAuth configured in Supabase + app
- [ ] Email + password auth with verification email
- [ ] Auth screen (login / signup) built
- [ ] Session persistence across restarts
- [ ] Onboarding flow (language + level picker, first launch only)
- [ ] Flashcard mode with TTS audio (Expo Speech, `de-DE`)
- [ ] Quiz mode fully functional (hearts, XP, hints, SRS, TTS)
- [ ] SRS algorithm (SM-2 lite) wired into both modes
- [ ] Progress synced to Supabase on session end (XP, mastery, SRS state)
- [ ] Offline fallback: local AsyncStorage cache used when no network
- [ ] Phrases screen browsable and filterable
- [ ] Leaderboard screen (mock data for MVP)
- [ ] CEFR level locking/unlocking logic
- [ ] PostHog integrated with `posthog.identify(userId)` on login
- [ ] A1 vocabulary and phrases data complete
- [ ] A2 vocabulary and phrases data complete
- [ ] EAS build configured (iOS + Android)
- [ ] TestFlight build submitted
- [ ] Internal Android testing track submitted

---

## 11. Success Metrics (Post-Launch)

| Metric | Target (Month 1) |
|---|---|
| Daily Active Users | 100+ |
| Session length | 5+ minutes average |
| Cards reviewed per session | 15+ |
| Day 7 retention | 30%+ |
| Crash-free sessions | 99%+ |
