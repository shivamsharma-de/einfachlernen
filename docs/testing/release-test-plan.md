# Release test plan

Status: working document. Run it on the development build now, and again on the TestFlight build
before submitting to App Store review. Record each failure with the step number, what happened, and
the message on screen. For scanner problems, include the `(dev: …)` line or the `page gate` line.

## A. Automated checks (run before any build)

| Check | Command | Expected |
|---|---|---|
| Types | `npm run typecheck` | no errors |
| Unit tests | `npm test` | all pass (61 at last count) |
| iOS bundle | `npm run bundle` | exports without errors |
| Database checks | `docker exec -i supabase_db_einfachlernen psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/<file>.sql` for 015, 017, 018, 020, 021 | each expectation printed as described in the file |

## B. Device checklist

Tick each line on the device. Note any failure with the step number.

### 1. Sign-in and account
- [ ] Sign in with Apple. Account is created, and the name is filled in from Apple when Apple provides it.
- [ ] Sign in with Google. Returns to the app, and the account is created. (Needs the Google settings below.)
- [ ] Sign in with email: create an account, sign out, sign in again.
- [ ] Sign out. The app returns to the login screen, and nothing from the previous account shows.
- [ ] Sign in again. Progress, levels and XP are the same as before.

### 2. Onboarding and settings
- [ ] Choose one or more levels. The deck uses only those levels.
- [ ] Switch language to English, then back to German. The choice survives a restart.
- [ ] Change levels in Profil. Heute and the deck follow.

### 3. Heute
- [ ] Counts (studied, due, new) match the deck.
- [ ] Theme tiles show the brand pictograms in their colours, with the CEFR band.
- [ ] "Fortschritt ansehen" opens the progress screen. Numbers match Heute.
- [ ] "Test dich" starts a test.

### 4. Deck
- [ ] Flip a card, grade it with each of the four buttons. The next card follows.
- [ ] Finish a session. The summary shows the cards and minutes.
- [ ] Force-quit in the middle of a session, reopen. The session resumes.
- [ ] After a scan import (section 7), personal words appear as new cards, mixed with the others, marked "Scan".
- [ ] Personal new cards stop after the daily personal limit (default 5).

### 5. Test
- [ ] Choose 10, then 20 questions. A 20-question round has 20 questions (or a note explains why not).
- [ ] With fewer studied words, the screen shows how many come from studied words and how many from the level.
- [ ] Each answer shows green or red at once. The score matches the answers.
- [ ] The result screen fits the screen with nothing cut off. "Nochmal" repeats the same size. "Anderer Umfang" returns to the choice.
- [ ] The traffic-light bar updates after the round.
- [ ] No word imported from a scan appears in any round.

### 6. Wörter (dictionary)
- [ ] Empty search shows your words first, then master words, each with its article, type, level, examples and synonyms.
- [ ] Search German and English. Both dictionaries are searched.
- [ ] A word that is in neither dictionary triggers the AI search. The result shows every field, and the badge reads "KI" (or "KI · unsicher").
- [ ] "In mein Wörterbuch speichern" saves it. It then appears as "Du".
- [ ] Redemittel: the second segment still shows the phrase list.
- [ ] Meine Wörter: deleting a word asks for confirmation, and then removes it.

### 7. Scan
- [ ] First scan asks for consent, with the German text that mentions photos and typed words.
- [ ] After consent, a photo of a printed book page is checked, then reviewed in the list. New words show a meaning, examples and synonyms.
- [ ] Untick one word, save. Only the ticked words are added.
- [ ] Blocked samples show the German message for each reason:
  - [ ] a face (`people`)
  - [ ] a photo with no text, such as a landscape (`no_text`)
  - [ ] handwritten notes (report whether they pass or fail)
- [ ] With airplane mode on, the scan shows a connection error, not a spinner that never ends.
- [ ] After 60 seconds without an answer, the timeout message appears.

### 8. Consent and privacy
- [ ] Turn photo analysis off in Profil. The scan asks for consent again.
- [ ] With consent off, a dictionary search that needs the AI returns the consent message, and nothing is sent.
- [ ] Turn it back on. Scanning and lookups work again.
- [ ] Camera permission text is in German and mentions scanning. No microphone or photo-library prompt appears.

### 9. Analytics (PostHog)
- [ ] Use the app for a few minutes. Events appear in PostHog's live view within a minute.
- [ ] No event carries a word, a name, an email, or photo data. Check a few events' properties.

### 10. Reinstall and deletion
- [ ] Note the streak, XP, studied count and three words' lights. Delete the app, install again, sign in. The numbers match.
- [ ] Delete the account in Profil. The account is removed. Signing in with the same method creates a new, empty account, and the old data does not come back.

## C. External settings to check before release

- [ ] **Google sign-in.** The Google OAuth client for the Supabase callback is set up. The consent screen is in production. The Supabase redirect allow-list contains `swapo://auth/callback`.
  - **OPEN:** on the development build the return address is `exp+swapo://…`, which Supabase's allow list does not accept (`exp+swapo://**` was rejected). Deferred. Verify on the production or preview build, where the address is `swapo://auth/callback`, before release.
- [ ] **Apple sign-in.** The Services ID and key are set. The revoke step has been checked against Apple's documentation.
- [ ] **Production environment.** EAS production variables are set (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_POSTHOG_KEY, EXPO_PUBLIC_POSTHOG_HOST).
- [ ] **Server.** `scan-words` is deployed (version 3 or later), and the secrets are set.
- [ ] **Policy.** The privacy policy has been reviewed by a lawyer and published at a public URL.

## Sign-off

A build is ready for App Store review when every box in sections B and C is ticked, or each open item has a written decision.
