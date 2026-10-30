# Session replay: data brief for the privacy policy

Purpose: the input for updating docs/legal/privacy-policy.md. Written from the code as it stands.
Status: draft. Items marked OPEN must be verified on a device or in PostHog before publication.

## 1. What session replay is

With the learner's consent, the app records screen recordings of the app, so the product team can see
where people get stuck. The recording is built from screenshots taken on the phone. The app uploads
them to PostHog (EU).

Replay runs only when the learner has switched on "Bildschirmaufzeichnung" in Profil. It is off by
default, it stops when the learner switches it off, and it stops on sign-out.

## 2. What is recorded

- **Screenshots of the app's screens**, taken during a session, with these settings applied on the phone
  before anything is sent:
  - all text is masked (text inputs, labels, the German words and example sentences on screen);
  - all images are masked (for example the scan photo);
  - sandboxed system views (for example the photo picker) are masked.
- **The layout and timing of screens**, as the recording needs it to play back.
- **Session metadata from the PostHog SDK:** session ID, time stamps, app version, device model, operating
  system version, screen size, and the user ID described in section 3.

## 3. What is not recorded

- **Touches.** Tap coordinates are off (`captureTouches: false`).
- **Console logs.** Off (`captureLog: false`), so no log lines leave the device.
- **Text, words, sentences and photos.** Masked on the phone before upload, so they are not sent in
  readable form.
- **Name and email.** Not sent. The app identifies the learner only with the Supabase user ID.

## 4. Identifier: what the user ID is, legally

- The PostHog identity is the **Supabase user ID** (a random UUID). It is not a name or email.
- It is **pseudonymous, not anonymous.** It can be linked back to a person through the Supabase account,
  so under GDPR it is still personal data. The policy must say this, and must not call it anonymous.

## 5. Legal basis and rights

- **Legal basis:** consent (Art. 6(1)(a) GDPR), given by the learner in Profil. It can be withdrawn at
  any time in the same place, with effect from then on.
- **Rights** (access, erasure, objection, complaint to a supervisory authority) apply as in the rest of
  the policy.

## 6. Recipients and location

- **PostHog** (EU cloud, eu.i.posthog.com) processes the recordings and events on our behalf.
  OPEN: sign PostHog's data processing agreement and name PostHog as a processor.
- **Storage:** the EU, as set in the PostHog project.

## 7. Retention

- OPEN: set the recording retention period in PostHog (project settings) and state it in the policy.
- Deleting the account should delete the learner's PostHog person and recordings. OPEN: not yet
  implemented. Until it is, the policy must say so and give a time limit.

## 8. Open questions to check before publishing

- **Masking on each screen.** Check on a device that no word, sentence, photo or name is readable in a
  replay of the deck, the test, the scan review and the dictionary.
- **Camera view.** Check whether the live camera preview on the scan screen is masked.
- **System sheets.** Check whether the Apple or Google sign-in sheets are recorded.
- **IP address.** Check PostHog's setting for discarding IP addresses, and state the result.
- **Age limit.** Replay makes the age question more important (see the terms, section 4).
