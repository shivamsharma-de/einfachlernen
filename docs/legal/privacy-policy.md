# Datenschutzerklärung / Privacy Policy: swypo

> **DRAFT for legal review.** This text must be checked by a lawyer before publication. Items in square brackets, and every [TO CONFIRM] marker, must be resolved first.

---

## Deutsch

**Stand:** [DATUM]

### 1. Verantwortlicher
Shivam Sharma, Deutschland. Kontakt: support@swypo.app. swypo ist eine iOS-App zum Deutschlernen für Englischsprechende.

### 2. Welche Daten wir verarbeiten und warum

- **Konto:** E-Mail-Adresse und Passwort (als Hash) bei Anmeldung mit E-Mail. Bei Anmeldung mit Apple oder Google die Kennung des Anbieters sowie Name und E-Mail-Adresse, soweit der Anbieter sie weitergibt. Ein Anzeigename ist optional. Bei Apple-Anmeldung speichern wir zusätzlich einen Token, mit dem wir die Apple-Freigabe beim Löschen des Kontos widerrufen. Er ist für die App nicht lesbar. *Zweck: Anmeldung und Konto.*
- **Lernfortschritt:** Fortschritt pro Wort, Bewertungen einzelner Karten mit Zeitpunkt, Lernsitzungen mit aktiver Zeit, tägliche Aktivität, Testergebnisse, gewählte Niveaus, Oberflächensprache und Punkte. *Zweck: Lernplan und Statistik.*
- **Eigene Wörter und Scans:** Wörter, die du selbst hinzufügst oder aus einem Scan übernimmst, mit Übersetzung und Beispielsatz. Zu jedem Scan speichern wir die erkannten Wörter und deren Anzahl. *Zweck: dein persönliches Wörterbuch.*
- **Fotos (Scan):** Mit deiner Zustimmung sendet die App ein Foto einer Textseite an unseren Server. Der Server gibt es zur Texterkennung an einen KI-Dienst weiter (Abschnitt 4). **Wir speichern das Foto nicht.** Es wird weder in der Datenbank noch im Dateispeicher abgelegt. Gespeichert werden nur die erkannten Wörter. Auch Wörter, die du einzeln eintippst, gehen zur Auswertung an den KI-Dienst. Dafür fragen wir keine gesonderte Zustimmung ab. Bitte fotografiere nur Lernseiten.
- **Analyse (PostHog):** Ereignisse zu Einführung (mit gewählten Niveaus), Start einer Lernsitzung (Anzahl fälliger und neuer Karten), Bewertung einer Karte (Stufe und Herkunft) und Mischen des Decks. Dazu kommen App-Ereignisse wie „geöffnet“ und übliche Geräteangaben (Gerätetyp, Betriebssystem, App-Version) [TO CONFIRM]. Zusammen mit den Ereignissen senden wir deine Konto-ID und, falls vorhanden, deine E-Mail-Adresse. Die Ereignisse enthalten keine Wörter, Sätze oder Fotos. *Zweck: Verstehen, welche Funktionen genutzt werden.* In Entwicklungsbuilds ist die Analyse ausgeschaltet.
- **Technische Daten:** Beim Zugriff auf unsere Server fallen IP-Adressen und Serverprotokolle an [TO CONFIRM]. Auf dem Gerät speichert die App deine Anmeldung im sicheren Speicher (Schlüsselbund) und zwischengespeicherte Lerndaten.

### 3. Rechtsgrundlagen
- **Art. 6 Abs. 1 lit. b DSGVO:** Konto, Lernfortschritt, eigene Wörter und Synchronisierung.
- **Art. 6 Abs. 1 lit. a DSGVO (Einwilligung):** Fotoauswertung. Du erteilst die Zustimmung in Profil und kannst sie dort jederzeit widerrufen. Für die Analyse [TO CONFIRM: Die App fragt derzeit keine Einwilligung ab. Falls nötig, ist eine Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und § 25 TDDDG einzuholen.]
- **Art. 6 Abs. 1 lit. f DSGVO:** Sicherheit, Schutz vor Missbrauch (Anfragelimit) und Fehleranalyse.

### 4. Empfänger und Auftragsverarbeiter
- **Supabase:** Datenbank, Anmeldung und Server-Funktionen. Auftragsverarbeiter.
- **Anthropic (Claude):** Texterkennung der Fotos und eingetippten Wörter. Für Wortbeschreibungen übermittelt die App nur Wort-IDs. Auftragsverarbeiter. Im Produktivbetrieb wird das Modell claude-haiku-4-5 eingesetzt [TO CONFIRM: Die Einstellung liegt in den Server-Umgebungsvariablen, nicht im Repository].
- **Anderer KI-Dienst:** Der Betreiber kann einen anderen Dienst mit kompatibler Schnittstelle wählen. Dann gilt dieser als Empfänger. Wir passen diese Erklärung entsprechend an.
- **PostHog (EU-Server, eu.i.posthog.com):** Analyse. Auftragsverarbeiter [TO CONFIRM].
- **Apple und Google:** Anmeldung, nur wenn du sie nutzt.
- **Expo:** Erstellung der App. Keine Nutzerdaten [TO CONFIRM].

### 5. Übermittlung in Drittländer
Unsere Datenbank läuft bei Supabase in [REGION]. PostHog nutzt den EU-Server. Anthropic, Apple und Google sind US-Unternehmen. Für Übermittlungen in die USA stützen wir uns auf [TO CONFIRM: EU-US Data Privacy Framework oder Standardvertragsklauseln].

### 6. Speicherdauer
Wir speichern deine Daten, solange dein Konto besteht. Die App löscht Daten nicht automatisch nach einer festen Frist [TO CONFIRM]. Scans und Lernverlauf bleiben bis zur Kontolöschung. Fotos speichern wir nicht. Die Aufbewahrung beim KI-Dienst richtet sich nach dessen Bedingungen [TO CONFIRM]. Aufbewahrung von Protokollen und PostHog-Daten [TO CONFIRM].

### 7. Deine Rechte
Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Eine Einwilligung kannst du jederzeit widerrufen, die Fotoauswertung in Profil. Der Widerruf gilt ab dann und berührt nicht die bisherige Verarbeitung. Eine Funktion zum Herunterladen deiner Daten gibt es in der App derzeit nicht. Schreib uns, dann schicken wir dir eine Kopie [TO CONFIRM]. Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, etwa beim Landesbeauftragten für Datenschutz deines Bundeslandes.

### 8. Konto löschen
In der App: **Profil → Konto löschen.** Danach werden dein Konto und alle oben genannten Daten dauerhaft gelöscht. Bei Apple-Anmeldung widerruft der Server zuerst die Apple-Freigabe. Schlägt das fehl, bleibt dein Konto erhalten, und du kannst es erneut versuchen. Daten bei PostHog löscht die App nicht. Wende dich dafür an [CONTACT EMAIL] [TO CONFIRM].

### 9. Kinder
Die App richtet sich nicht an Kinder unter 16 Jahren [TO CONFIRM]. Wir erheben wissentlich keine Daten von Kindern.

### 10. Gerätezugriffe, Cookies und Benachrichtigungen
- **Kamera:** nur für Fotos zum Scannen und nur nach deiner Zustimmung. Die App greift nicht auf deine Fotomediathek zu.
- **Mikrofon:** Die App nimmt keinen Ton auf [TO CONFIRM: Android-Berechtigung RECORD_AUDIO ist in app.json eingetragen, aber nicht genutzt].
- **Benachrichtigungen:** Die App sendet keine Push-Nachrichten.
- **Cookies:** Die App setzt keine Cookies. Bei der Google-Anmeldung öffnet sich ein Browserfenster von Google.
- **Tracking:** Die App verfolgt dich nicht über andere Apps und Webseiten hinweg [TO CONFIRM].

### 11. Änderungen
Wir passen diese Erklärung an, wenn sich die Verarbeitung ändert, und informieren dich in der App.

---

## English

**Last updated:** [DATE]

### 1. Controller
Shivam Sharma, Germany. Contact: support@swypo.app. swypo is an iOS app for English speakers learning German.

### 2. What data we process and why

- **Account:** email address and password (stored as a hash) for email sign-in. For Apple or Google sign-in, the provider's identifier and your name and email address if the provider shares them. A display name is optional. For Apple sign-in we also store a token that lets us revoke the Apple authorization when you delete your account. The app cannot read it. *Purpose: sign-in and your account.*
- **Study progress:** progress per word, reviews of individual cards with timestamps, study sessions with active time, daily activity, test results, chosen levels, interface language and points. *Purpose: study plan and statistics.*
- **Own words and scans:** words you add or take from a scan, with translation and example sentence. For each scan we store the words detected and their count. *Purpose: your personal dictionary.*
- **Photos (scan):** with your consent, the app sends a photo of a text page to our server. The server passes it to an AI service for text recognition (section 4). **We do not store the photo.** It is not saved in the database or in file storage. Only the words detected are saved. Words you type in one at a time also go to the AI service for analysis. We do not ask for separate consent for this. Please photograph study pages only.
- **Analytics (PostHog):** events for onboarding completion (with chosen levels), study session start (number of due and new cards), card reviews (grade and origin) and deck shuffle. Also app events such as "opened" and usual device information (device type, operating system, app version) [TO CONFIRM]. With these events we send your account ID and, if available, your email address. The events contain no words, sentences or photos. *Purpose: understanding which features are used.* Analytics is turned off in development builds.
- **Technical data:** our servers process IP addresses and server logs when you connect [TO CONFIRM]. On your device the app keeps your sign-in in secure storage (Keychain) and cached study data.

### 3. Legal bases
- **Art. 6(1)(b) GDPR:** account, study progress, own words and sync.
- **Art. 6(1)(a) GDPR (consent):** photo analysis. You give consent in Profile and can withdraw it there at any time. For analytics [TO CONFIRM: the app currently asks for no consent. If required, obtain consent under Art. 6(1)(a) GDPR and § 25 TDDDG.]
- **Art. 6(1)(f) GDPR:** security, protection against misuse (request limits) and error analysis.

### 4. Recipients and processors
- **Supabase:** database, sign-in and server functions. Processor.
- **Anthropic (Claude):** text recognition of photos and typed words. For word descriptions the app sends only word IDs. Processor. In production the model claude-haiku-4-5 is used [TO CONFIRM: this setting is in server environment variables, not in the repository].
- **Another AI service:** the operator may choose another service with a compatible interface. That service then becomes a recipient, and we will update this policy accordingly.
- **PostHog (EU server, eu.i.posthog.com):** analytics. Processor [TO CONFIRM].
- **Apple and Google:** sign-in, only if you use them.
- **Expo:** building the app. No user data [TO CONFIRM].

### 5. Transfers to third countries
Our database runs at Supabase in [REGION]. PostHog uses its EU server. Anthropic, Apple and Google are US companies. For transfers to the USA we rely on [TO CONFIRM: EU-US Data Privacy Framework or standard contractual clauses].

### 6. Retention
We keep your data for as long as your account exists. The app does not delete data automatically after a fixed period [TO CONFIRM]. Scans and study history stay until you delete your account. We do not store photos. Retention at the AI service follows its terms [TO CONFIRM]. Retention of logs and PostHog data [TO CONFIRM].

### 7. Your rights
You have the right of access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction (Art. 18), data portability (Art. 20) and objection (Art. 21). You can withdraw consent at any time, for photo analysis in Profile. Withdrawal applies from then on and does not affect earlier processing. The app does not currently have a function to download your data. Write to us and we will send you a copy [TO CONFIRM]. You may also complain to a data protection supervisory authority, for example the state data protection commissioner where you live in Germany.

### 8. Deleting your account
In the app: **Profile → Delete account.** This permanently deletes your account and all the data listed above. For Apple sign-in the server first revokes the Apple authorization. If that fails, your account is kept and you can try again. The app does not delete data held by PostHog. For that, contact [CONTACT EMAIL] [TO CONFIRM].

### 9. Children
The app is not directed at children under 16 [TO CONFIRM]. We do not knowingly collect data from children.

### 10. Device access, cookies and notifications
- **Camera:** only for scanning photos, and only with your consent. The app does not access your photo library.
- **Microphone:** the app does not record audio [TO CONFIRM: the Android RECORD_AUDIO permission is declared in app.json but not used].
- **Notifications:** the app sends no push notifications.
- **Cookies:** the app sets no cookies. Google sign-in opens a Google browser window.
- **Tracking:** the app does not track you across other apps and websites [TO CONFIRM].

### 11. Changes
We will update this policy when processing changes and inform you in the app.
