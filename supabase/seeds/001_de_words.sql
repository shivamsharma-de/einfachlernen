-- German vocabulary seed — Goethe Institut aligned (A1→C2)
-- Run AFTER 002_german_content.sql
-- id format: de-{level}-{category_code}-{sequence}

BEGIN;

INSERT INTO public.de_words
  (id, level, category, word_type, german, article, english, pronunciation,
   cultural_context, synonyms, antonyms, forms, hint, example_de, example_en, distractors, source)
VALUES

-- ═══════════════════════════════════════════════════════════════
-- A1 — GREETINGS
-- ═══════════════════════════════════════════════════════════════
('de-a1-gr-001','A1','Greetings','phrase','Hallo',NULL,'Hello','/ˈhalo/',
 'Casual greeting used any time of day. Standard in everyday speech.',
 ARRAY['Hi','Grüß Gott'],'{}','{}',
 'Sounds exactly like the English "hallo" — a safe, universally understood greeting.',
 'Hallo! Wie heißt du?','Hello! What is your name?',
 ARRAY['Goodbye','Thank you','Please'],'goethe'),

('de-a1-gr-002','A1','Greetings','phrase','Guten Morgen',NULL,'Good morning','/ˌɡuːtən ˈmɔrɡən/',
 'Used until around noon. More formal than Hallo. Morgen alone is a casual shortening.',
 ARRAY['Morgen'],'{}','{}',
 'Morgen = morning AND tomorrow — context tells you which one.',
 'Guten Morgen! Schön, Sie zu sehen.','Good morning! Nice to see you.',
 ARRAY['Good night','Good evening','Goodbye'],'goethe'),

('de-a1-gr-003','A1','Greetings','phrase','Guten Tag',NULL,'Good day','/ˌɡuːtən ˈtaːk/',
 'Standard polite greeting used from noon to early evening, especially in formal contexts.',
 ARRAY['Tag'],'{}','{}',
 'Tag = day. Used when Morgen has passed but Abend has not yet arrived.',
 'Guten Tag, ich hätte gerne einen Termin.','Good day, I would like an appointment.',
 ARRAY['Good morning','Good night','See you later'],'goethe'),

('de-a1-gr-004','A1','Greetings','phrase','Guten Abend',NULL,'Good evening','/ˌɡuːtən ˈʔaːbənt/',
 'Used from around 6 pm onwards. Abend = evening.',
 '{}','{}','{}',
 'Abend sounds like "ah-bent" — picture the day bending towards night.',
 'Guten Abend, darf ich mich vorstellen?','Good evening, may I introduce myself?',
 ARRAY['Good morning','Good afternoon','Good night'],'goethe'),

('de-a1-gr-005','A1','Greetings','phrase','Gute Nacht',NULL,'Good night','/ˌɡuːtə ˈnaxt/',
 'Said when going to bed or parting late at night — not a general farewell.',
 '{}','{}','{}',
 'Nacht = night. Only use this when actually saying goodnight for sleep.',
 'Gute Nacht! Schlaf gut.','Good night! Sleep well.',
 ARRAY['Good morning','Hello','How are you'],'goethe'),

('de-a1-gr-006','A1','Greetings','phrase','Auf Wiedersehen',NULL,'Goodbye','/ˌaʊf ˈviːdɐˌzeːən/',
 'Literally "until we see each other again". Formal farewell.',
 ARRAY['Tschüss','Tschau'],'{}','{}',
 'Wieder = again, sehen = to see. A promise to meet again.',
 'Es war schön. Auf Wiedersehen!','It was nice. Goodbye!',
 ARRAY['Hello','Good morning','Thank you'],'goethe'),

('de-a1-gr-007','A1','Greetings','phrase','Tschüss',NULL,'Bye','/tʃʏs/',
 'Casual farewell, widely used among friends and family. Equivalent to "bye" or "see ya".',
 ARRAY['Tschau','Ciao'],'{}','{}',
 'Borrowed from Low German. The most common informal goodbye.',
 'Tschüss, bis morgen!','Bye, see you tomorrow!',
 ARRAY['Hello','Good morning','Thank you'],'goethe'),

('de-a1-gr-008','A1','Greetings','phrase','Wie geht es Ihnen?',NULL,'How are you? (formal)','/viː ɡeːt ɛs ˈʔiːnən/',
 'Ihnen (capital I) is the formal "you". Use with strangers, elders, professionals.',
 '{}','{}','{}',
 'Ihnen vs. Ihnen: capital I = formal you; lowercase i = to them.',
 'Guten Morgen! Wie geht es Ihnen?','Good morning! How are you?',
 ARRAY['What is your name?','Where are you from?','How old are you?'],'goethe'),

('de-a1-gr-009','A1','Greetings','phrase','Wie geht es dir?',NULL,'How are you? (informal)','/viː ɡeːt ɛs diːɐ/',
 'dir is the informal dative "you". Use with friends, family, peers.',
 '{}','{}','{}',
 'Dir = to you (informal). Geht = goes — literally "How goes it to you?"',
 'Hey! Wie geht es dir?','Hey! How are you?',
 ARRAY['What is your name?','Where are you from?','How old are you?'],'goethe'),

('de-a1-gr-010','A1','Greetings','phrase','Danke',NULL,'Thank you','/ˈdaŋkə/',
 'Universal thank-you. Danke schön = thank you very much. Danke sehr = thank you very much (more emphatic).',
 ARRAY['Danke schön','Danke sehr','Vielen Dank'],'{}','{}',
 'Sounds like "dank-eh". Danke schön (beautiful thanks) is the fuller form.',
 'Danke für die Hilfe!','Thank you for the help!',
 ARRAY['Please','Excuse me','Sorry'],'goethe'),

('de-a1-gr-011','A1','Greetings','phrase','Bitte',NULL,'Please / You are welcome','/ˈbɪtə/',
 'Bitte has multiple uses: please (request), you are welcome (after Danke), here you go (handing something over).',
 '{}','{}','{}',
 'One word, three uses: please / you''re welcome / here you go.',
 'Bitte, können Sie mir helfen?','Please, can you help me?',
 ARRAY['Thank you','Sorry','Excuse me'],'goethe'),

('de-a1-gr-012','A1','Greetings','phrase','Entschuldigung',NULL,'Excuse me / Sorry','/ɛntˈʃʊldɪɡʊŋ/',
 'Used to get attention, apologise mildly, or pass through a crowd. Es tut mir leid = deeper apology.',
 ARRAY['Entschuldigen Sie','Verzeihung'],'{}','{}',
 'Long word — break it down: ent-schuld-igung. Schuld = guilt/fault.',
 'Entschuldigung, wo ist der Bahnhof?','Excuse me, where is the train station?',
 ARRAY['Thank you','Hello','Goodbye'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A1 — PERSONAL INFO
-- ═══════════════════════════════════════════════════════════════
('de-a1-pi-001','A1','Personal Info','verb','heißen',NULL,'to be named / to be called','/ˈhaɪsn/',
 'Used to give your name: Ich heiße... = My name is... Wie heißen Sie? = What is your name? (formal)',
 '{}','{}','{"auxiliary":"haben","past_participle":"geheißen","simple_past":"hieß","separable":false,"conjugation":{"ich":"heiße","du":"heißt","er":"heißt","wir":"heißen","ihr":"heißt","sie":"heißen"}}',
 'heiß = hot, heißen = to be called. Hot names!',
 'Ich heiße Anna. Wie heißen Sie?','My name is Anna. What is your name?',
 ARRAY['to live','to work','to go'],'goethe'),

('de-a1-pi-002','A1','Personal Info','verb','wohnen',NULL,'to live / to reside','/ˈvoːnən/',
 'Refers to where you live habitually. Leben can also mean to live but is broader (to be alive).',
 ARRAY['leben','bleiben'],'{}','{"auxiliary":"haben","past_participle":"gewohnt","simple_past":"wohnte","separable":false,"conjugation":{"ich":"wohne","du":"wohnst","er":"wohnt","wir":"wohnen","ihr":"wohnt","sie":"wohnen"}}',
 'Wohnung = apartment, wohnen = to live there.',
 'Ich wohne in Berlin.','I live in Berlin.',
 ARRAY['to work','to travel','to sleep'],'goethe'),

('de-a1-pi-003','A1','Personal Info','verb','kommen',NULL,'to come','/ˈkɔmən/',
 'Woher kommen Sie? = Where are you from? (literally: where do you come from?)',
 '{}','{}','{"auxiliary":"sein","past_participle":"gekommen","simple_past":"kam","separable":false,"conjugation":{"ich":"komme","du":"kommst","er":"kommt","wir":"kommen","ihr":"kommt","sie":"kommen"}}',
 'Kommen uses sein as auxiliary in perfect tense (not haben!).',
 'Ich komme aus Deutschland.','I come from Germany.',
 ARRAY['to go','to stay','to travel'],'goethe'),

('de-a1-pi-004','A1','Personal Info','noun','das Alter',NULL,'age','/ˈaltɐ/',
 'Wie alt sind Sie? = How old are you? Literally "How old are you?" Alt = old.',
 '{}','{}','{"plural":"die Alter"}',
 'Alt = old. Your Alter is how alt you are.',
 'Mein Alter ist 28 Jahre.','My age is 28 years.',
 ARRAY['name','address','job'],'goethe'),

('de-a1-pi-005','A1','Personal Info','noun','die Adresse','die','address','/aˈdrɛsə/',
 'Closely matches English. Germans often include Straße (street) and Hausnummer (house number).',
 '{}','{}','{"plural":"die Adressen"}',
 'Sounds almost identical to English "address".',
 'Was ist Ihre Adresse?','What is your address?',
 ARRAY['name','age','telephone number'],'goethe'),

('de-a1-pi-006','A1','Personal Info','noun','die Telefonnummer','die','telephone number','/teleˈfoːnnʊmɐ/',
 'Germans often say Handynummer (mobile number) vs. Festnetz (landline).',
 ARRAY['die Handynummer','die Nummer'],'{}','{"plural":"die Telefonnummern"}',
 'Telefon + Nummer. Same concept as English.',
 'Wie ist Ihre Telefonnummer?','What is your phone number?',
 ARRAY['address','age','name'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A1 — NUMBERS
-- ═══════════════════════════════════════════════════════════════
('de-a1-nu-001','A1','Numbers','number','null',NULL,'zero','/nʊl/',NULL,
 '{}','{}','{}','Null sounds like "null" in programming — nothing!',
 'Die Temperatur ist null Grad.','The temperature is zero degrees.',
 ARRAY['one','ten','hundred'],'goethe'),

('de-a1-nu-002','A1','Numbers','number','eins',NULL,'one','/ʔaɪns/',
 'eins when counting alone; ein/eine/einen when used with a noun.',
 '{}','{}','{}','eins = standalone one; ein Auto = one car.',
 'Ich habe einen Bruder.','I have one brother.',
 ARRAY['two','zero','three'],'goethe'),

('de-a1-nu-003','A1','Numbers','number','zwei',NULL,'two','/tsvaɪ/',
 'Sometimes said as zwo in phone/radio contexts to avoid confusion with drei.',
 '{}','{}','{}','Remember: zwei sounds like "tsvy".',
 'Ich habe zwei Kinder.','I have two children.',
 ARRAY['three','one','four'],'goethe'),

('de-a1-nu-004','A1','Numbers','number','drei',NULL,'three','/dʁaɪ/',NULL,
 '{}','{}','{}','drei → three. Very similar sound!',
 'Ich brauche drei Tickets.','I need three tickets.',
 ARRAY['two','four','five'],'goethe'),

('de-a1-nu-005','A1','Numbers','number','vier',NULL,'four','/fiːɐ/',NULL,
 '{}','{}','{}','vier → four. The v sounds like English f.',
 'Wir haben vier Jahreszeiten.','We have four seasons.',
 ARRAY['five','three','six'],'goethe'),

('de-a1-nu-006','A1','Numbers','number','fünf',NULL,'five','/fʏnf/',NULL,
 '{}','{}','{}','fünf — the ü sounds like a mix of "ee" and "oo".',
 'Ich esse um fünf Uhr.','I eat at five o''clock.',
 ARRAY['four','six','seven'],'goethe'),

('de-a1-nu-007','A1','Numbers','number','sechs',NULL,'six','/zɛks/',
 'The chs in sechs sounds like an x.',
 '{}','{}','{}','sechs → six. The s sounds like z, chs like x.',
 'Es kostet sechs Euro.','It costs six euros.',
 ARRAY['five','seven','eight'],'goethe'),

('de-a1-nu-008','A1','Numbers','number','sieben',NULL,'seven','/ˈziːbn/',NULL,
 '{}','{}','{}','sieben → seven. Very similar sound.',
 'Die Woche hat sieben Tage.','The week has seven days.',
 ARRAY['six','eight','nine'],'goethe'),

('de-a1-nu-009','A1','Numbers','number','acht',NULL,'eight','/ʔaxt/',NULL,
 '{}','{}','{}','acht → eight. Ch sounds like the Scottish "loch".',
 'Ich bin um acht Uhr aufgestanden.','I got up at eight o''clock.',
 ARRAY['seven','nine','ten'],'goethe'),

('de-a1-nu-010','A1','Numbers','number','neun',NULL,'nine','/nɔɪn/',NULL,
 '{}','{}','{}','neun sounds like "noin" — nine.',
 'Er hat neun Leben wie eine Katze.','He has nine lives like a cat.',
 ARRAY['eight','ten','seven'],'goethe'),

('de-a1-nu-011','A1','Numbers','number','zehn',NULL,'ten','/tseːn/',NULL,
 '{}','{}','{}','zehn → ten. Z sounds like ts in German.',
 'Zehn Minuten, bitte.','Ten minutes, please.',
 ARRAY['nine','eleven','twelve'],'goethe'),

('de-a1-nu-012','A1','Numbers','number','zwanzig',NULL,'twenty','/ˈtsvantsɪç/',NULL,
 '{}','{}','{}','zwanzig — contains zwei (two) + zig (suffix for -ty).',
 'Sie ist zwanzig Jahre alt.','She is twenty years old.',
 ARRAY['twelve','thirty','ten'],'goethe'),

('de-a1-nu-013','A1','Numbers','number','dreißig',NULL,'thirty','/ˈdʁaɪsɪç/',
 'Note the ß (Eszett) — unique German letter. dreißig not *dreißig.',
 '{}','{}','{}','drei = three + ßig = ty. Thirty.',
 'Es sind dreißig Grad heute.','It is thirty degrees today.',
 ARRAY['twenty','forty','thirteen'],'goethe'),

('de-a1-nu-014','A1','Numbers','number','hundert',NULL,'hundred','/ˈhʊndɐt/',NULL,
 '{}','{}','{}','hundert → hundred. Very close to English.',
 'Hundert Euro, bitte.','One hundred euros, please.',
 ARRAY['thousand','ten','million'],'goethe'),

('de-a1-nu-015','A1','Numbers','number','tausend',NULL,'thousand','/ˈtaʊzənt/',NULL,
 '{}','{}','{}','tausend → thousand.',
 'Das kostet tausend Euro.','That costs one thousand euros.',
 ARRAY['hundred','million','hundred thousand'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A1 — TIME
-- ═══════════════════════════════════════════════════════════════
('de-a1-ti-001','A1','Time','noun','der Tag','der','day','/taːk/',
 'Guten Tag = Good day. Tag is also used in compound words: Geburtstag (birthday), Werktag (workday).',
 '{}',ARRAY['die Nacht'],'{"plural":"die Tage"}',
 'Tag is the root of Guten Tag — greeting the day.',
 'Ich arbeite fünf Tage die Woche.','I work five days a week.',
 ARRAY['night','week','month'],'goethe'),

('de-a1-ti-002','A1','Time','noun','die Woche','die','week','/ˈvɔxə/',NULL,
 '{}','{}','{"plural":"die Wochen"}',
 'Wochenende = week + end = weekend.',
 'Ich habe diese Woche viel zu tun.','I have a lot to do this week.',
 ARRAY['day','month','year'],'goethe'),

('de-a1-ti-003','A1','Time','noun','der Monat','der','month','/ˈmoːnat/',NULL,
 '{}','{}','{"plural":"die Monate"}',
 'Monat — think "moon-at". Months were originally measured by the moon.',
 'Im nächsten Monat fahre ich nach Wien.','Next month I am going to Vienna.',
 ARRAY['week','year','day'],'goethe'),

('de-a1-ti-004','A1','Time','noun','das Jahr','das','year','/jaːɐ/',NULL,
 '{}','{}','{"plural":"die Jahre"}',
 'Jahr → year. The J sounds like English y.',
 'Ich lerne seit einem Jahr Deutsch.','I have been learning German for one year.',
 ARRAY['month','century','week'],'goethe'),

('de-a1-ti-005','A1','Time','noun','die Stunde','die','hour','/ˈʃtʊndə/',NULL,
 '{}','{}','{"plural":"die Stunden"}',
 'Stunde — remember it by "student hours" of studying.',
 'Ich warte seit einer Stunde.','I have been waiting for one hour.',
 ARRAY['minute','day','second'],'goethe'),

('de-a1-ti-006','A1','Time','noun','die Minute','die','minute','/mɪˈnuːtə/',NULL,
 '{}','{}','{"plural":"die Minuten"}',
 'Minute — almost identical to English.',
 'Wir haben noch zehn Minuten.','We still have ten minutes.',
 ARRAY['hour','second','day'],'goethe'),

('de-a1-ti-007','A1','Time','adverb','heute',NULL,'today','/ˈhɔɪtə/',NULL,
 '{}',ARRAY['gestern','morgen'],'{}',
 'heute — the h is silent, sounds like "hoyteh".',
 'Heute ist Montag.','Today is Monday.',
 ARRAY['yesterday','tomorrow','now'],'goethe'),

('de-a1-ti-008','A1','Time','adverb','morgen',NULL,'tomorrow','/ˈmɔrɡən/',
 'Careful: morgen = tomorrow AND der Morgen = the morning. Context makes it clear.',
 '{}',ARRAY['gestern'],'{}',
 'morgen (lowercase) = tomorrow; der Morgen = the morning.',
 'Morgen habe ich einen Termin.','Tomorrow I have an appointment.',
 ARRAY['today','yesterday','now'],'goethe'),

('de-a1-ti-009','A1','Time','adverb','gestern',NULL,'yesterday','/ˈɡɛstɐn/',NULL,
 '{}','{}','{}',
 'gestern — sounds like "gES-tern". Yesterday is in the stern (stars, past).',
 'Gestern war das Wetter schön.','Yesterday the weather was nice.',
 ARRAY['today','tomorrow','now'],'goethe'),

('de-a1-ti-010','A1','Time','adverb','jetzt',NULL,'now','/jɛtst/',NULL,
 '{}','{}','{}','jetzt — short and sharp, just like "now".',
 'Ich muss jetzt gehen.','I have to go now.',
 ARRAY['later','soon','then'],'goethe'),

-- Days of the week
('de-a1-ti-011','A1','Time','noun','der Montag','der','Monday','/ˈmoːntaːk/',
 'Montag = Mond (moon) + Tag (day). Moon day — like Latin "dies Lunae".',
 '{}','{}','{"plural":"die Montage"}',
 'Mond = moon → Montag = Moon day.',
 'Am Montag habe ich Deutschkurs.','On Monday I have German class.',
 ARRAY['Tuesday','Sunday','Wednesday'],'goethe'),

('de-a1-ti-012','A1','Time','noun','der Dienstag','der','Tuesday','/ˈdiːnstaːk/',NULL,
 '{}','{}','{"plural":"die Dienstage"}','Dienstag — Di-ens-tag.',
 'Das Meeting ist am Dienstag.','The meeting is on Tuesday.',
 ARRAY['Monday','Wednesday','Thursday'],'goethe'),

('de-a1-ti-013','A1','Time','noun','der Mittwoch','der','Wednesday','/ˈmɪtvɔx/',
 'Mittwoch literally means "midweek" — Mitte (middle) + Woche (week). Wednesday is the middle of the working week.',
 '{}','{}','{"plural":"die Mittwoche"}',
 'Mitte = middle, Woche = week. Wednesday is literally "midweek"!',
 'Mittwoch ist die Mitte der Woche.','Wednesday is the middle of the week.',
 ARRAY['Tuesday','Thursday','Friday'],'goethe'),

('de-a1-ti-014','A1','Time','noun','der Donnerstag','der','Thursday','/ˈdɔnɐstaːk/',
 'Donner = thunder. Donnerstag = Thunder''s day. Like English Thursday (Thor''s day)!',
 '{}','{}','{"plural":"die Donnerstage"}',
 'Donner = thunder → Thor → Thursday. Same mythological root!',
 'Donnerstag ist mein Lieblingstag.','Thursday is my favourite day.',
 ARRAY['Wednesday','Friday','Monday'],'goethe'),

('de-a1-ti-015','A1','Time','noun','der Freitag','der','Friday','/ˈfʁaɪtaːk/',
 'Frei = free — Friday feels free because the weekend is coming.',
 '{}','{}','{"plural":"die Freitage"}',
 'Frei = free. Friday = almost free from work!',
 'Am Freitag gehen wir aus.','On Friday we go out.',
 ARRAY['Thursday','Saturday','Wednesday'],'goethe'),

('de-a1-ti-016','A1','Time','noun','der Samstag','der','Saturday','/ˈzamstaːk/',
 'Also called Sonnabend in northern Germany (literally "sun evening" = eve of Sunday).',
 ARRAY['Sonnabend'],'{}','{"plural":"die Samstage"}',
 'Samstag or Sonnabend depending on region. Both are correct.',
 'Am Samstag schlafe ich lang.','On Saturday I sleep in.',
 ARRAY['Friday','Sunday','Thursday'],'goethe'),

('de-a1-ti-017','A1','Time','noun','der Sonntag','der','Sunday','/ˈzɔntaːk/',
 'Sonne (sun) + Tag (day) = Sunday. Shops are closed on Sundays in Germany.',
 '{}','{}','{"plural":"die Sonntage"}',
 'Sonne = sun → Sonntag = Sun day. Matches English perfectly.',
 'Am Sonntag sind die Geschäfte geschlossen.','On Sunday the shops are closed.',
 ARRAY['Saturday','Monday','Friday'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A1 — COLORS
-- ═══════════════════════════════════════════════════════════════
('de-a1-co-001','A1','Colors','adjective','rot',NULL,'red','/ʁoːt/',
 'Traffic lights, warning signs. Rot also appears in many compound words: das Rotlicht (red light).',
 '{}',ARRAY['blau','grün'],'{"comparative":"röter","superlative":"am rötesten"}',
 'Rot → red. The o is long.',
 'Die Rose ist rot.','The rose is red.',
 ARRAY['blue','green','yellow'],'goethe'),

('de-a1-co-002','A1','Colors','adjective','blau',NULL,'blue','/blaʊ/',
 'Also means drunk in colloquial German (blau sein = to be drunk — because of the blue-purple face from cold).',
 '{}',ARRAY['rot'],'{"comparative":"blauer","superlative":"am blausten"}',
 'blau → blue. Almost the same!',
 'Der Himmel ist blau.','The sky is blue.',
 ARRAY['red','green','yellow'],'goethe'),

('de-a1-co-003','A1','Colors','adjective','grün',NULL,'green','/ɡʁyːn/',
 'Associated with environmentalism (die Grünen = The Greens party). Ü makes a unique German sound.',
 '{}',ARRAY['rot'],'{"comparative":"grüner","superlative":"am grünsten"}',
 'grün → green. The ü rounds your lips like an "ee" with pursed lips.',
 'Das Gras ist grün.','The grass is green.',
 ARRAY['red','blue','yellow'],'goethe'),

('de-a1-co-004','A1','Colors','adjective','gelb',NULL,'yellow','/ɡɛlp/',NULL,
 '{}','{}','{"comparative":"gelber","superlative":"am gelbsten"}',
 'gelb — the b at the end sounds like p (final devoicing).',
 'Die Banane ist gelb.','The banana is yellow.',
 ARRAY['green','orange','blue'],'goethe'),

('de-a1-co-005','A1','Colors','adjective','schwarz',NULL,'black','/ʃvaʁts/',
 'Schwarz appears in cultural references: Schwarzwald (Black Forest), schwarzer Kaffee (black coffee).',
 '{}',ARRAY['weiß'],'{"comparative":"schwärzer","superlative":"am schwärzesten"}',
 'schwarz — the sch sounds like "sh", w like "v".',
 'Ich trinke meinen Kaffee schwarz.','I drink my coffee black.',
 ARRAY['white','grey','brown'],'goethe'),

('de-a1-co-006','A1','Colors','adjective','weiß',NULL,'white','/vaɪs/',
 'The ß (Eszett) is unique to German. weiß = white (not weiss except in Switzerland which doesn''t use ß).',
 '{}',ARRAY['schwarz'],'{"comparative":"weißer","superlative":"am weißesten"}',
 'weiß has the ß (sharp s). Think of white snow.',
 'Der Schnee ist weiß.','The snow is white.',
 ARRAY['black','grey','yellow'],'goethe'),

('de-a1-co-007','A1','Colors','adjective','grau',NULL,'grey','/ɡʁaʊ/',NULL,
 '{}','{}','{"comparative":"grauer","superlative":"am grausten"}',
 'grau → grey. Both start with gr!',
 'Das Wetter ist heute grau.','The weather is grey today.',
 ARRAY['white','black','blue'],'goethe'),

('de-a1-co-008','A1','Colors','adjective','braun',NULL,'brown','/bʁaʊn/',NULL,
 '{}','{}','{"comparative":"brauner","superlative":"am braunsten"}',
 'braun → brown. Very similar.',
 'Der Bär ist braun.','The bear is brown.',
 ARRAY['grey','black','yellow'],'goethe'),

('de-a1-co-009','A1','Colors','adjective','orange',NULL,'orange','/oˈʁaŋʒə/',
 'Borrowed from French. Pronounced differently: oh-RANG-zheh.',
 '{}','{}','{}',
 'Same word as English but with a French pronunciation: oh-RANG-zheh.',
 'Die Orange ist orange.','The orange is orange.',
 ARRAY['yellow','red','pink'],'goethe'),

('de-a1-co-010','A1','Colors','adjective','rosa',NULL,'pink','/ˈʁoːza/',
 'Rosa is lighter pink; Pink (borrowed from English) is used for brighter, hot pink.',
 ARRAY['pink'],'{}','{}',
 'rosa is a loanword from Italian/Latin (like the flower Rosa).',
 'Sie trägt ein rosa Kleid.','She is wearing a pink dress.',
 ARRAY['red','purple','orange'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A1 — FAMILY
-- ═══════════════════════════════════════════════════════════════
('de-a1-fa-001','A1','Family','noun','die Familie','die','family','/faˈmiːliə/',
 'Central to German culture. Germans value Familienabend (family evenings) and extended family gatherings.',
 '{}','{}','{"plural":"die Familien"}',
 'Familie — almost identical to English "family".',
 'Meine Familie ist sehr groß.','My family is very large.',
 ARRAY['friend','colleague','neighbour'],'goethe'),

('de-a1-fa-002','A1','Family','noun','die Mutter','die','mother','/ˈmʊtɐ/',NULL,
 ARRAY['Mama','Mutti'],ARRAY['der Vater'],'{"plural":"die Mütter"}',
 'Mutter → mother. Nearly identical!',
 'Meine Mutter kocht sehr gut.','My mother cooks very well.',
 ARRAY['father','daughter','son'],'goethe'),

('de-a1-fa-003','A1','Family','noun','der Vater','der','father','/ˈfaːtɐ/',NULL,
 ARRAY['Papa'],ARRAY['die Mutter'],'{"plural":"die Väter"}',
 'Vater → father. V sounds like f in German.',
 'Mein Vater arbeitet als Arzt.','My father works as a doctor.',
 ARRAY['mother','son','daughter'],'goethe'),

('de-a1-fa-004','A1','Family','noun','der Bruder','der','brother','/ˈbʁuːdɐ/',NULL,
 '{}',ARRAY['die Schwester'],'{"plural":"die Brüder"}',
 'Bruder → brother. Same root word!',
 'Ich habe zwei Brüder.','I have two brothers.',
 ARRAY['sister','son','daughter'],'goethe'),

('de-a1-fa-005','A1','Family','noun','die Schwester','die','sister','/ˈʃvɛstɐ/',NULL,
 '{}',ARRAY['der Bruder'],'{"plural":"die Schwestern"}',
 'Schwester → sister. Sch = sh sound.',
 'Meine Schwester wohnt in München.','My sister lives in Munich.',
 ARRAY['brother','mother','daughter'],'goethe'),

('de-a1-fa-006','A1','Family','noun','der Sohn','der','son','/zoːn/',NULL,
 '{}',ARRAY['die Tochter'],'{"plural":"die Söhne"}',
 'Sohn → son. The oh sound is long.',
 'Sein Sohn studiert Medizin.','His son studies medicine.',
 ARRAY['daughter','brother','father'],'goethe'),

('de-a1-fa-007','A1','Family','noun','die Tochter','die','daughter','/ˈtɔxtɐ/',NULL,
 '{}',ARRAY['der Sohn'],'{"plural":"die Töchter"}',
 'Tochter — ch sounds like the Scottish "loch".',
 'Sie hat eine Tochter.','She has a daughter.',
 ARRAY['son','mother','sister'],'goethe'),

('de-a1-fa-008','A1','Family','noun','das Kind','das','child','/kɪnt/',NULL,
 '{}','{}','{"plural":"die Kinder"}',
 'Kind → child. Kinder = children (think Kindergarten!).',
 'Das Kind spielt im Garten.','The child plays in the garden.',
 ARRAY['adult','parent','baby'],'goethe'),

('de-a1-fa-009','A1','Family','noun','die Großmutter','die','grandmother','/ˈɡʁoːsmʊtɐ/',
 'Oma is the affectionate everyday word. Großmutter is formal.',
 ARRAY['Oma'],'{}','{"plural":"die Großmütter"}',
 'Groß = big, Mutter = mother. Big mother = grandmother!',
 'Meine Großmutter macht den besten Kuchen.','My grandmother makes the best cake.',
 ARRAY['grandfather','mother','aunt'],'goethe'),

('de-a1-fa-010','A1','Family','noun','der Großvater','der','grandfather','/ˈɡʁoːsfaːtɐ/',
 'Opa is the affectionate everyday word. Großvater is formal.',
 ARRAY['Opa'],'{}','{"plural":"die Großväter"}',
 'Groß = big, Vater = father. Big father = grandfather.',
 'Mein Großvater ist 80 Jahre alt.','My grandfather is 80 years old.',
 ARRAY['grandmother','father','uncle'],'goethe'),

('de-a1-fa-011','A1','Family','noun','der Mann','der','husband / man','/man/',
 'Dual meaning: husband (mein Mann) and man (a man, a male person). Context makes it clear.',
 ARRAY['der Ehemann','der Herr'],ARRAY['die Frau'],'{"plural":"die Männer"}',
 'Mann = man AND husband. Like in English: "my man" can mean husband.',
 'Mein Mann heißt Thomas.','My husband''s name is Thomas.',
 ARRAY['wife','boy','woman'],'goethe'),

('de-a1-fa-012','A1','Family','noun','die Frau','die','wife / woman','/fʁaʊ/',
 'Dual meaning: wife (meine Frau) and woman. Also used as "Mrs/Ms" (Frau Schmidt).',
 ARRAY['die Ehefrau'],ARRAY['der Mann'],'{"plural":"die Frauen"}',
 'Frau = woman AND wife AND Mrs. Three-in-one!',
 'Meine Frau arbeitet als Lehrerin.','My wife works as a teacher.',
 ARRAY['husband','girl','man'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A1 — FOOD & DRINK
-- ═══════════════════════════════════════════════════════════════
('de-a1-fo-001','A1','Food & Drink','noun','das Wasser','das','water','/ˈvasɐ/',
 'Germans often drink sparkling water (Mineralwasser/Sprudelwasser). Still water is stilles Wasser.',
 '{}','{}','{"plural":"die Wasser"}',
 'Wasser → water. Same Germanic root.',
 'Ein Glas Wasser, bitte.','A glass of water, please.',
 ARRAY['juice','milk','beer'],'goethe'),

('de-a1-fo-002','A1','Food & Drink','noun','der Kaffee','der','coffee','/ˈkafe/',
 'Germany has a strong coffee culture. Kaffee und Kuchen (coffee and cake) is a beloved Sunday tradition.',
 '{}','{}','{"plural":"die Kaffees"}',
 'Kaffee — almost identical to English. Double e at the end.',
 'Ich trinke jeden Morgen einen Kaffee.','I drink a coffee every morning.',
 ARRAY['tea','juice','water'],'goethe'),

('de-a1-fo-003','A1','Food & Drink','noun','der Tee','der','tea','/teː/',NULL,
 '{}','{}','{"plural":"die Tees"}',
 'Tee = tea. Long e sound.',
 'Möchten Sie Kaffee oder Tee?','Would you like coffee or tea?',
 ARRAY['coffee','juice','water'],'goethe'),

('de-a1-fo-004','A1','Food & Drink','noun','das Brot','das','bread','/bʁoːt/',
 'Germans have over 300 varieties of bread. Bread is a cultural staple — "Das tägliche Brot" (daily bread).',
 '{}','{}','{"plural":"die Brote"}',
 'Brot → bread. B-R-O-T, close to bread without the ea.',
 'Ich esse Brot mit Butter zum Frühstück.','I eat bread with butter for breakfast.',
 ARRAY['cake','rice','pasta'],'goethe'),

('de-a1-fo-005','A1','Food & Drink','noun','die Butter','die','butter','/ˈbʊtɐ/',NULL,
 '{}','{}','{"plural":"rarely pluralised"}',
 'Butter = butter. Identical!',
 'Brot mit Butter ist einfach und lecker.','Bread with butter is simple and delicious.',
 ARRAY['cheese','jam','honey'],'goethe'),

('de-a1-fo-006','A1','Food & Drink','noun','der Käse','der','cheese','/ˈkɛːzə/',
 'Germany produces hundreds of cheese varieties. Käse is central to the Abendbrot (evening bread meal).',
 '{}','{}','{"plural":"die Käsesorten"}',
 'Käse — ä makes an "eh" sound. Like saying "Kay-zeh".',
 'Dieser Käse schmeckt sehr gut.','This cheese tastes very good.',
 ARRAY['butter','bread','meat'],'goethe'),

('de-a1-fo-007','A1','Food & Drink','noun','das Fleisch','das','meat','/flaɪʃ/',NULL,
 '{}','{}','{}',
 'Fleisch — "fl" + "eye" + "sh". Sounds nothing like meat!',
 'Ich esse kein Fleisch.','I don''t eat meat.',
 ARRAY['fish','vegetables','bread'],'goethe'),

('de-a1-fo-008','A1','Food & Drink','noun','der Fisch','der','fish','/fɪʃ/',NULL,
 '{}','{}','{"plural":"die Fische"}',
 'Fisch → fish. Almost identical!',
 'Freitags essen viele Deutsche Fisch.','On Fridays many Germans eat fish.',
 ARRAY['meat','chicken','vegetables'],'goethe'),

('de-a1-fo-009','A1','Food & Drink','noun','das Gemüse','das','vegetables','/ɡəˈmyːzə/',NULL,
 '{}','{}','{}',
 'Gemüse = vegetables. The ü is like pursed-lip "ee".',
 'Ich esse gern Gemüse.','I like to eat vegetables.',
 ARRAY['fruit','meat','bread'],'goethe'),

('de-a1-fo-010','A1','Food & Drink','noun','das Obst','das','fruit','/ʔoːpst/',NULL,
 '{}','{}','{}',
 'Obst — ends with a t sound. Think "ob-st" = fruit.',
 'Obst ist gesund.','Fruit is healthy.',
 ARRAY['vegetables','meat','cake'],'goethe'),

('de-a1-fo-011','A1','Food & Drink','noun','der Apfel','der','apple','/ˈʔapfəl/',NULL,
 '{}','{}','{"plural":"die Äpfel"}',
 'Apfel → apple. Both start with "ap"!',
 'Ein Apfel am Tag hält den Arzt fern.','An apple a day keeps the doctor away.',
 ARRAY['orange','banana','pear'],'goethe'),

('de-a1-fo-012','A1','Food & Drink','noun','die Banane','die','banana','/baˈnaːnə/',NULL,
 '{}','{}','{"plural":"die Bananen"}',
 'Banane = banana. Almost identical.',
 'Ich esse eine Banane zum Frühstück.','I eat a banana for breakfast.',
 ARRAY['apple','orange','pear'],'goethe'),

('de-a1-fo-013','A1','Food & Drink','noun','der Kuchen','der','cake','/ˈkuːxən/',
 'Central to German culture — Kaffee und Kuchen on Sunday afternoon is a beloved tradition.',
 '{}','{}','{"plural":"die Kuchen"}',
 'Kuchen — the ch sounds like a raspy Scottish "loch".',
 'Möchtest du ein Stück Kuchen?','Would you like a piece of cake?',
 ARRAY['bread','biscuit','pie'],'goethe'),

('de-a1-fo-014','A1','Food & Drink','noun','das Ei','das','egg','/ˈʔaɪ/',NULL,
 '{}','{}','{"plural":"die Eier"}',
 'Ei = egg. Just two letters! Eier (plural) = eggs.',
 'Ich hätte gerne zwei Eier.','I would like two eggs.',
 ARRAY['milk','bread','cheese'],'goethe'),

('de-a1-fo-015','A1','Food & Drink','noun','die Milch','die','milk','/mɪlç/',NULL,
 '{}','{}','{}',
 'Milch → milk. Very similar.',
 'Kinder trinken gerne Milch.','Children like to drink milk.',
 ARRAY['water','juice','tea'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A1 — CORE VERBS
-- ═══════════════════════════════════════════════════════════════
('de-a1-vb-001','A1','Core Verbs','verb','sein',NULL,'to be','/zaɪn/',
 'The most important verb in German. Completely irregular. Forms: bin, bist, ist, sind, seid, sind.',
 '{}','{}','{"auxiliary":"haben","past_participle":"gewesen","simple_past":"war","separable":false,"conjugation":{"ich":"bin","du":"bist","er":"ist","wir":"sind","ihr":"seid","sie":"sind"}}',
 'bin/bist/ist/sind/seid/sind — memorise this first!',
 'Ich bin Lehrer. Sie ist müde.','I am a teacher. She is tired.',
 ARRAY['to have','to go','to make'],'goethe'),

('de-a1-vb-002','A1','Core Verbs','verb','haben',NULL,'to have','/ˈhaːbn/',
 'The second most important verb. Also used as an auxiliary for Perfekt tense with many verbs.',
 '{}','{}','{"auxiliary":"haben","past_participle":"gehabt","simple_past":"hatte","separable":false,"conjugation":{"ich":"habe","du":"hast","er":"hat","wir":"haben","ihr":"habt","sie":"haben"}}',
 'habe/hast/hat/haben/habt/haben — the h is silent in habe!',
 'Ich habe einen Hund. Sie hat keine Zeit.','I have a dog. She has no time.',
 ARRAY['to be','to want','to know'],'goethe'),

('de-a1-vb-003','A1','Core Verbs','verb','gehen',NULL,'to go','/ˈɡeːən/',
 'Uses sein in Perfekt: ich bin gegangen. Gehen can mean walking or going in general.',
 '{}','{}','{"auxiliary":"sein","past_participle":"gegangen","simple_past":"ging","separable":false,"conjugation":{"ich":"gehe","du":"gehst","er":"geht","wir":"gehen","ihr":"geht","sie":"gehen"}}',
 'gehen uses SEIN as auxiliary — ich BIN gegangen, not ich habe gegangen!',
 'Ich gehe zur Arbeit.','I go to work.',
 ARRAY['to come','to stay','to drive'],'goethe'),

('de-a1-vb-004','A1','Core Verbs','verb','machen',NULL,'to make / to do','/ˈmaxən/',
 'One of the most flexible verbs in German. Was machst du? = What do you do? / What are you doing?',
 ARRAY['tun'],'{}','{"auxiliary":"haben","past_participle":"gemacht","simple_past":"machte","separable":false,"conjugation":{"ich":"mache","du":"machst","er":"macht","wir":"machen","ihr":"macht","sie":"machen"}}',
 'machen = make + do. One verb covers both English meanings.',
 'Was machst du heute?','What are you doing today?',
 ARRAY['to take','to want','to need'],'goethe'),

('de-a1-vb-005','A1','Core Verbs','verb','kommen',NULL,'to come','/ˈkɔmən/',
 'Uses sein in Perfekt. Woher kommen Sie? = Where are you from?',
 '{}',ARRAY['gehen'],'{"auxiliary":"sein","past_participle":"gekommen","simple_past":"kam","separable":false,"conjugation":{"ich":"komme","du":"kommst","er":"kommt","wir":"kommen","ihr":"kommt","sie":"kommen"}}',
 'komm! = come! The command form drops the -en.',
 'Wann kommst du nach Hause?','When are you coming home?',
 ARRAY['to go','to leave','to travel'],'goethe'),

('de-a1-vb-006','A1','Core Verbs','verb','essen',NULL,'to eat','/ˈɛsn/',
 'Irregular: du isst (not du essst). Was isst du gerne? = What do you like to eat?',
 '{}','{}','{"auxiliary":"haben","past_participle":"gegessen","simple_past":"aß","separable":false,"conjugation":{"ich":"esse","du":"isst","er":"isst","wir":"essen","ihr":"esst","sie":"essen"}}',
 'ich esse / du isst — note the vowel change e → i for du/er.',
 'Ich esse gerne Pizza.','I like to eat pizza.',
 ARRAY['to drink','to cook','to buy'],'goethe'),

('de-a1-vb-007','A1','Core Verbs','verb','trinken',NULL,'to drink','/ˈtʁɪŋkən/',NULL,
 '{}','{}','{"auxiliary":"haben","past_participle":"getrunken","simple_past":"trank","separable":false,"conjugation":{"ich":"trinke","du":"trinkst","er":"trinkt","wir":"trinken","ihr":"trinkt","sie":"trinken"}}',
 'trinken → drink. tr- start is the same.',
 'Was trinkst du gerne?','What do you like to drink?',
 ARRAY['to eat','to cook','to buy'],'goethe'),

('de-a1-vb-008','A1','Core Verbs','verb','sprechen',NULL,'to speak','/ˈʃpʁɛçən/',
 'Ich spreche Deutsch = I speak German. Irregular: du sprichst, er spricht.',
 '{}','{}','{"auxiliary":"haben","past_participle":"gesprochen","simple_past":"sprach","separable":false,"conjugation":{"ich":"spreche","du":"sprichst","er":"spricht","wir":"sprechen","ihr":"sprecht","sie":"sprechen"}}',
 'spreche → du sprichst: e → i vowel shift!',
 'Sprechen Sie Deutsch?','Do you speak German?',
 ARRAY['to hear','to read','to write'],'goethe'),

('de-a1-vb-009','A1','Core Verbs','verb','arbeiten',NULL,'to work','/ˈaʁbaɪtən/',NULL,
 ARRAY['tätig sein'],'{}','{"auxiliary":"haben","past_participle":"gearbeitet","simple_past":"arbeitete","separable":false,"conjugation":{"ich":"arbeite","du":"arbeitest","er":"arbeitet","wir":"arbeiten","ihr":"arbeitet","sie":"arbeiten"}}',
 'Arbeit = work (noun). arbeiten = to work.',
 'Wo arbeitest du?','Where do you work?',
 ARRAY['to study','to travel','to rest'],'goethe'),

('de-a1-vb-010','A1','Core Verbs','verb','lernen',NULL,'to learn / to study','/ˈlɛʁnən/',
 'lernen = to learn (a skill or fact). studieren = to study at university.',
 '{}','{}','{"auxiliary":"haben","past_participle":"gelernt","simple_past":"lernte","separable":false,"conjugation":{"ich":"lerne","du":"lernst","er":"lernt","wir":"lernen","ihr":"lernt","sie":"lernen"}}',
 'lernen = learn. Very close to English!',
 'Ich lerne jeden Tag neue Wörter.','I learn new words every day.',
 ARRAY['to teach','to forget','to read'],'goethe'),

('de-a1-vb-011','A1','Core Verbs','verb','schlafen',NULL,'to sleep','/ˈʃlaːfən/',
 'Irregular: du schläfst, er schläft (umlaut change). Schlaf gut! = Sleep well!',
 '{}','{}','{"auxiliary":"haben","past_participle":"geschlafen","simple_past":"schlief","separable":false,"conjugation":{"ich":"schlafe","du":"schläfst","er":"schläft","wir":"schlafen","ihr":"schlaft","sie":"schlafen"}}',
 'schlafen → du schläfst: a → ä umlaut for du/er.',
 'Ich schlafe acht Stunden pro Nacht.','I sleep eight hours a night.',
 ARRAY['to wake up','to rest','to dream'],'goethe'),

('de-a1-vb-012','A1','Core Verbs','verb','kaufen',NULL,'to buy','/ˈkaʊfən/',NULL,
 ARRAY['erwerben'],ARRAY['verkaufen'],'{"auxiliary":"haben","past_participle":"gekauft","simple_past":"kaufte","separable":false,"conjugation":{"ich":"kaufe","du":"kaufst","er":"kauft","wir":"kaufen","ihr":"kauft","sie":"kaufen"}}',
 'kaufen = buy. verkaufen = sell (ver- reverses the direction).',
 'Ich kaufe Lebensmittel im Supermarkt.','I buy groceries at the supermarket.',
 ARRAY['to sell','to pay','to find'],'goethe'),

('de-a1-vb-013','A1','Core Verbs','verb','fahren',NULL,'to drive / to travel (by vehicle)','/ˈfaːʁən/',
 'fahren = travel by vehicle (car, bus, train). gehen = go on foot.',
 '{}','{}','{"auxiliary":"sein","past_participle":"gefahren","simple_past":"fuhr","separable":false,"conjugation":{"ich":"fahre","du":"fährst","er":"fährt","wir":"fahren","ihr":"fahrt","sie":"fahren"}}',
 'fahren uses SEIN as auxiliary. a → ä for du/er.',
 'Ich fahre mit dem Zug nach Hamburg.','I travel to Hamburg by train.',
 ARRAY['to fly','to swim','to walk'],'goethe'),

('de-a1-vb-014','A1','Core Verbs','verb','lesen',NULL,'to read','/ˈleːzn/',
 'Irregular: du liest, er liest.',
 '{}','{}','{"auxiliary":"haben","past_participle":"gelesen","simple_past":"las","separable":false,"conjugation":{"ich":"lese","du":"liest","er":"liest","wir":"lesen","ihr":"lest","sie":"lesen"}}',
 'lesen → du liest: e → ie vowel change.',
 'Ich lese jeden Abend ein Buch.','I read a book every evening.',
 ARRAY['to write','to hear','to see'],'goethe'),

('de-a1-vb-015','A1','Core Verbs','verb','schreiben',NULL,'to write','/ˈʃʁaɪbn/',NULL,
 '{}','{}','{"auxiliary":"haben","past_participle":"geschrieben","simple_past":"schrieb","separable":false,"conjugation":{"ich":"schreibe","du":"schreibst","er":"schreibt","wir":"schreiben","ihr":"schreibt","sie":"schreiben"}}',
 'schreiben → past participle geschrieben (strong verb, vowel changes).',
 'Sie schreibt eine E-Mail.','She is writing an email.',
 ARRAY['to read','to speak','to draw'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A1 — CORE ADJECTIVES
-- ═══════════════════════════════════════════════════════════════
('de-a1-adj-001','A1','Adjectives','adjective','gut',NULL,'good','/ɡuːt/',NULL,
 ARRAY['prima','toll','super'],ARRAY['schlecht'],'{"comparative":"besser","superlative":"am besten"}',
 'gut → good. Comparative is BESSER (irregular — not guter!).',
 'Das Essen ist sehr gut.','The food is very good.',
 ARRAY['bad','ugly','slow'],'goethe'),

('de-a1-adj-002','A1','Adjectives','adjective','schlecht',NULL,'bad','/ʃlɛçt/',NULL,
 ARRAY['schlimm'],ARRAY['gut'],'{"comparative":"schlechter","superlative":"am schlechtesten"}',
 'schlecht — sch = sh sound. Think "shlecht".',
 'Das Wetter ist schlecht heute.','The weather is bad today.',
 ARRAY['good','nice','great'],'goethe'),

('de-a1-adj-003','A1','Adjectives','adjective','groß',NULL,'big / tall','/ɡʁoːs/',
 'groß = big (size) and tall (person). The ß sounds like ss.',
 ARRAY['riesig','enorm'],ARRAY['klein'],'{"comparative":"größer","superlative":"am größten"}',
 'groß uses ß. Comparative: größer (umlaut + er).',
 'Berlin ist eine große Stadt.','Berlin is a big city.',
 ARRAY['small','narrow','short'],'goethe'),

('de-a1-adj-004','A1','Adjectives','adjective','klein',NULL,'small / short (person)','/klaɪn/',NULL,
 ARRAY['winzig'],ARRAY['groß'],'{"comparative":"kleiner","superlative":"am kleinsten"}',
 'klein → small. Kleinkind = toddler (small child).',
 'Meine Wohnung ist klein aber gemütlich.','My apartment is small but cosy.',
 ARRAY['big','large','wide'],'goethe'),

('de-a1-adj-005','A1','Adjectives','adjective','alt',NULL,'old','/ˈalt/',
 'Alt is also a musical term (alto) and appears in city names: Altstadt = old town.',
 ARRAY['betagt'],ARRAY['jung','neu'],'{"comparative":"älter","superlative":"am ältesten"}',
 'alt = alt key on keyboard — old technology!',
 'Das Schloss ist sehr alt.','The castle is very old.',
 ARRAY['young','new','modern'],'goethe'),

('de-a1-adj-006','A1','Adjectives','adjective','neu',NULL,'new','/nɔɪ/',NULL,
 ARRAY['frisch','modern'],ARRAY['alt'],'{"comparative":"neuer","superlative":"am neuesten"}',
 'neu → new. Just the spelling differs (no w).',
 'Ich habe ein neues Auto.','I have a new car.',
 ARRAY['old','used','broken'],'goethe'),

('de-a1-adj-007','A1','Adjectives','adjective','jung',NULL,'young','/jʊŋ/',NULL,
 '{}',ARRAY['alt'],'{"comparative":"jünger","superlative":"am jüngsten"}',
 'jung → young. J sounds like English y.',
 'Sie ist noch sehr jung.','She is still very young.',
 ARRAY['old','adult','mature'],'goethe'),

('de-a1-adj-008','A1','Adjectives','adjective','schön',NULL,'beautiful / nice','/ʃøːn/',
 'Widely used beyond physical beauty: schönes Wetter (nice weather), schönen Tag (have a nice day).',
 ARRAY['hübsch','wunderschön'],ARRAY['hässlich'],'{"comparative":"schöner","superlative":"am schönsten"}',
 'Schönen Tag! = Have a nice day! Schön = beautiful / nice.',
 'Das ist ein schöner Tag!','That is a beautiful day!',
 ARRAY['ugly','bad','terrible'],'goethe'),

('de-a1-adj-009','A1','Adjectives','adjective','teuer',NULL,'expensive','/ˈtɔɪɐ/',NULL,
 ARRAY['kostspielig'],ARRAY['billig','günstig'],'{"comparative":"teurer","superlative":"am teuersten"}',
 'teuer = dear (expensive). Like "dear" in old English price sense.',
 'Das ist zu teuer für mich.','That is too expensive for me.',
 ARRAY['cheap','free','affordable'],'goethe'),

('de-a1-adj-010','A1','Adjectives','adjective','billig',NULL,'cheap','/ˈbɪlɪç/',
 'Can also imply low quality (cheap in a bad sense). Günstig is the politer way to say affordable.',
 ARRAY['günstig','preiswert'],ARRAY['teuer'],'{"comparative":"billiger","superlative":"am billigsten"}',
 'billig = cheap. Günstig = affordable (more polite).',
 'Das ist billig, aber gut.','That is cheap but good.',
 ARRAY['expensive','free','valuable'],'goethe'),

('de-a1-adj-011','A1','Adjectives','adjective','müde',NULL,'tired','/ˈmyːdə/',NULL,
 '{}',ARRAY['wach','fit'],'{}',
 'müde — the ü makes a rounded "ee" sound. Think "myoo-deh".',
 'Ich bin sehr müde heute.','I am very tired today.',
 ARRAY['awake','energetic','happy'],'goethe'),

('de-a1-adj-012','A1','Adjectives','adjective','hungrig',NULL,'hungry','/ˈhʊŋʁɪç/',NULL,
 '{}',ARRAY['satt'],'{}',
 'Hunger is the noun, hungrig is the adjective.',
 'Ich bin hungrig. Was gibt es zu essen?','I am hungry. What is there to eat?',
 ARRAY['full','thirsty','tired'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A1 — TRANSPORT
-- ═══════════════════════════════════════════════════════════════
('de-a1-tr-001','A1','Transport','noun','das Auto','das','car','/ˈaʊtoː/',
 'Germany is famous for its car industry: BMW, Mercedes-Benz, Volkswagen, Audi.',
 ARRAY['der Wagen','das Fahrzeug'],'{}','{"plural":"die Autos"}',
 'Auto = car. Same word as English!',
 'Ich fahre mit dem Auto zur Arbeit.','I drive to work by car.',
 ARRAY['bus','train','bike'],'goethe'),

('de-a1-tr-002','A1','Transport','noun','der Bus','der','bus','/bʊs/',NULL,
 '{}','{}','{"plural":"die Busse"}',
 'Bus = bus. Universal word!',
 'Ich nehme den Bus zur Schule.','I take the bus to school.',
 ARRAY['car','train','tram'],'goethe'),

('de-a1-tr-003','A1','Transport','noun','der Zug','der','train','/tsuːk/',
 'Die Bahn is the railway network (Deutsche Bahn = DB). Zug is the specific train.',
 ARRAY['die Bahn'],'{}','{"plural":"die Züge"}',
 'Zug = pull = train (it pulls carriages). Also means draught of air!',
 'Der Zug nach Berlin fährt in zehn Minuten.','The train to Berlin leaves in ten minutes.',
 ARRAY['bus','car','plane'],'goethe'),

('de-a1-tr-004','A1','Transport','noun','das Flugzeug','das','aeroplane','/ˈfluːktsɔɪk/',
 'Flug = flight, Zeug = thing/stuff. Literally "flying thing"! A great example of German compound words.',
 '{}','{}','{"plural":"die Flugzeuge"}',
 'Flug (flight) + Zeug (thing) = Flugzeug. Flying thing!',
 'Das Flugzeug startet um 10 Uhr.','The plane takes off at 10 o''clock.',
 ARRAY['train','car','ship'],'goethe'),

('de-a1-tr-005','A1','Transport','noun','das Fahrrad','das','bicycle','/ˈfaːʁʁaːt/',
 'fahren (to drive/ride) + Rad (wheel). Cycling is very popular in German cities.',
 ARRAY['das Rad'],'{}','{"plural":"die Fahrräder"}',
 'fahren (to ride) + Rad (wheel) = Fahrrad. Riding wheel!',
 'Ich fahre mit dem Fahrrad zur Arbeit.','I cycle to work.',
 ARRAY['car','motorbike','scooter'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A1 — HOUSING
-- ═══════════════════════════════════════════════════════════════
('de-a1-ho-001','A1','Housing','noun','das Haus','das','house','/haʊs/',
 'Haus appears in many compound words: Hausaufgaben (homework), Haustier (pet), Haushalt (household).',
 ARRAY['das Gebäude'],ARRAY['die Wohnung'],'{"plural":"die Häuser"}',
 'Haus → house. Same Germanic root. Häuser is the plural (umlaut!).',
 'Ich wohne in einem kleinen Haus.','I live in a small house.',
 ARRAY['flat','apartment','hotel'],'goethe'),

('de-a1-ho-002','A1','Housing','noun','die Wohnung','die','apartment / flat','/ˈvoːnʊŋ/',
 'Most Germans rent (mieten) rather than own (kaufen) — particularly in cities.',
 '{}','{}','{"plural":"die Wohnungen"}',
 'wohnen (to live) → Wohnung (the place you live = apartment).',
 'Meine Wohnung hat drei Zimmer.','My apartment has three rooms.',
 ARRAY['house','villa','hotel'],'goethe'),

('de-a1-ho-003','A1','Housing','noun','das Zimmer','das','room','/ˈtsɪmɐ/',NULL,
 '{}','{}','{"plural":"die Zimmer"}',
 'Zimmer = room. A Zimmer frei sign means a room is available (like B&Bs in Germany).',
 'Das Zimmer ist sehr groß.','The room is very large.',
 ARRAY['house','kitchen','bathroom'],'goethe'),

('de-a1-ho-004','A1','Housing','noun','die Küche','die','kitchen','/ˈkʏçə/',NULL,
 '{}','{}','{"plural":"die Küchen"}',
 'Küche → kitchen. Both start with K.',
 'Wir essen in der Küche.','We eat in the kitchen.',
 ARRAY['bathroom','bedroom','living room'],'goethe'),

('de-a1-ho-005','A1','Housing','noun','das Badezimmer','das','bathroom','/ˈbaːdətsɪmɐ/',
 'Bade = bath, Zimmer = room. Often shortened to das Bad.',
 ARRAY['das Bad'],'{}','{"plural":"die Badezimmer"}',
 'Bad (bath) + Zimmer (room) = Badezimmer. The bath room!',
 'Das Badezimmer ist links.','The bathroom is on the left.',
 ARRAY['kitchen','bedroom','living room'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A2 — WORK & PROFESSIONS
-- ═══════════════════════════════════════════════════════════════
('de-a2-wo-001','A2','Work','noun','der Beruf','der','profession / occupation','/bəˈʁuːf/',
 'Was sind Sie von Beruf? = What is your profession? Central question in German introductions.',
 ARRAY['die Arbeit','der Job'],'{}','{"plural":"die Berufe"}',
 'Beruf = profession. Beruflich = professionally.',
 'Was sind Sie von Beruf?','What is your profession?',
 ARRAY['hobby','study','sport'],'goethe'),

('de-a2-wo-002','A2','Work','noun','der Arzt / die Ärztin','der','doctor','/ˈaːɐtst/',
 'Masculine: der Arzt, feminine: die Ärztin. This -in suffix is the standard feminine form for professions.',
 '{}','{}','{"plural":"die Ärzte / die Ärztinnen"}',
 'Arzt = doctor. Ärztin = female doctor. -in makes it feminine.',
 'Ich muss zum Arzt gehen.','I have to go to the doctor.',
 ARRAY['teacher','engineer','lawyer'],'goethe'),

('de-a2-wo-003','A2','Work','noun','der Lehrer / die Lehrerin','der','teacher','/ˈleːʁɐ/',
 'lehren = to teach. Lehrer = teacher (m), Lehrerin = teacher (f).',
 '{}','{}','{"plural":"die Lehrer / die Lehrerinnen"}',
 'lehren (to teach) → Lehrer (teacher). Teach → Teacher in German too!',
 'Meine Lehrerin erklärt sehr gut.','My teacher explains very well.',
 ARRAY['doctor','student','engineer'],'goethe'),

('de-a2-wo-004','A2','Work','noun','das Büro','das','office','/byˈʁoː/',
 'Borrowed from French. Büroklammer = paper clip (office clamp).',
 '{}','{}','{"plural":"die Büros"}',
 'Büro = bureau = office. Same French loanword.',
 'Ich arbeite im Büro von neun bis fünf.','I work in the office from nine to five.',
 ARRAY['factory','shop','school'],'goethe'),

('de-a2-wo-005','A2','Work','verb','studieren',NULL,'to study (at university)','/ʃtuˈdiːʁən/',
 'Specifically for university study. lernen = to learn/study in general (school, self-study).',
 '{}','{}','{"auxiliary":"haben","past_participle":"studiert","simple_past":"studierte","separable":false}',
 'studieren = study at uni. lernen = learn/study generally.',
 'Ich studiere Medizin in Heidelberg.','I study medicine in Heidelberg.',
 ARRAY['to work','to teach','to learn'],'goethe'),

('de-a2-wo-006','A2','Work','noun','das Gehalt','das','salary','/ɡəˈhalt/',
 'Gehalt = monthly salary (white collar). Lohn = hourly wage (blue collar).',
 ARRAY['der Lohn'],'{}','{"plural":"die Gehälter"}',
 'Gehalt = salary (kept/held every month). Halten = to keep/hold.',
 'Das Gehalt wird am ersten des Monats gezahlt.','The salary is paid on the first of the month.',
 ARRAY['tax','bonus','invoice'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A2 — HEALTH
-- ═══════════════════════════════════════════════════════════════
('de-a2-he-001','A2','Health','adjective','krank',NULL,'ill / sick','/kʁaŋk/',NULL,
 '{}',ARRAY['gesund'],'{"comparative":"kränker","superlative":"am kränksten"}',
 'krank → sick. Krankenhaus = hospital (sick house).',
 'Ich bin heute krank und bleibe zu Hause.','I am sick today and staying at home.',
 ARRAY['healthy','tired','hungry'],'goethe'),

('de-a2-he-002','A2','Health','adjective','gesund',NULL,'healthy','/ɡəˈzʊnt/',NULL,
 ARRAY['fit','wohlauf'],ARRAY['krank'],'{"comparative":"gesünder","superlative":"am gesündesten"}',
 'gesund = healthy. Gesundheit! = Bless you (when someone sneezes) — literally "health!".',
 'Sport ist gesund.','Sport is healthy.',
 ARRAY['sick','tired','sad'],'goethe'),

('de-a2-he-003','A2','Health','noun','das Krankenhaus','das','hospital','/ˈkʁaŋkənhaʊs/',
 'krank (sick) + Haus (house) = Krankenhaus. The house for sick people.',
 '{}','{}','{"plural":"die Krankenhäuser"}',
 'krank (sick) + Haus (house) = hospital. German compounds tell a story!',
 'Er liegt im Krankenhaus.','He is in hospital.',
 ARRAY['pharmacy','surgery','clinic'],'goethe'),

('de-a2-he-004','A2','Health','noun','die Apotheke','die','pharmacy','/apoˈteːkə/',
 'Apotheken (pharmacies) are marked by a red A. Prescription drugs only from Apotheke; basic items also from Drogerie.',
 '{}','{}','{"plural":"die Apotheken"}',
 'Apotheke = pharmacy. The red A on the sign is its symbol.',
 'Ich hole das Medikament aus der Apotheke.','I get the medication from the pharmacy.',
 ARRAY['hospital','surgery','supermarket'],'goethe'),

('de-a2-he-005','A2','Health','noun','der Schmerz','der','pain','/ʃmɛʁts/',NULL,
 '{}','{}','{"plural":"die Schmerzen"}',
 'Schmerz = pain. Kopfschmerzen = headache, Bauchschmerzen = stomach ache.',
 'Ich habe starke Schmerzen.','I have severe pain.',
 ARRAY['fever','cold','cough'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A2 — SHOPPING
-- ═══════════════════════════════════════════════════════════════
('de-a2-sh-001','A2','Shopping','noun','der Supermarkt','der','supermarket','/ˈzuːpɐmaʁkt/',NULL,
 '{}','{}','{"plural":"die Supermärkte"}',
 'Supermarkt = supermarket. Same word!',
 'Ich kaufe Lebensmittel im Supermarkt.','I buy groceries at the supermarket.',
 ARRAY['market','bakery','pharmacy'],'goethe'),

('de-a2-sh-002','A2','Shopping','verb','bezahlen',NULL,'to pay','/bəˈtsaːlən/',
 'Kann ich bitte bezahlen? = Can I pay please? Getrennt or zusammen? = Separately or together? (splitting the bill)',
 ARRAY['zahlen'],'{}','{"auxiliary":"haben","past_participle":"bezahlt","simple_past":"bezahlte","separable":false}',
 'bezahlen = to pay. zahlen = to count or to pay. Both work!',
 'Wo kann ich bezahlen?','Where can I pay?',
 ARRAY['to buy','to take','to exchange'],'goethe'),

('de-a2-sh-003','A2','Shopping','noun','der Preis','der','price','/pʁaɪs/',NULL,
 ARRAY['die Kosten'],'{}','{"plural":"die Preise"}',
 'Preis = price AND prize. Context tells you which.',
 'Was ist der Preis für dieses Hemd?','What is the price of this shirt?',
 ARRAY['discount','tax','change'],'goethe'),

('de-a2-sh-004','A2','Shopping','noun','das Geld','das','money','/ɡɛlt/',NULL,
 '{}','{}','{"plural":"rarely pluralised"}',
 'Geld = gold = money. Gold was money!',
 'Ich habe nicht genug Geld dabei.','I don''t have enough money with me.',
 ARRAY['card','coin','bank'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A2 — TRAVEL
-- ═══════════════════════════════════════════════════════════════
('de-a2-tv-001','A2','Travel','noun','der Bahnhof','der','train station','/ˈbaːnhoːf/',
 'Bahn (railway) + Hof (courtyard/yard) = Bahnhof. The DB (Deutsche Bahn) is the national rail operator.',
 '{}','{}','{"plural":"die Bahnhöfe"}',
 'Bahn (rail) + Hof (yard) = train station yard.',
 'Wo ist der nächste Bahnhof?','Where is the nearest train station?',
 ARRAY['airport','bus stop','port'],'goethe'),

('de-a2-tv-002','A2','Travel','noun','der Flughafen','der','airport','/ˈfluːkhaːfən/',
 'Flug (flight) + Hafen (harbour/haven) = Flughafen. A harbour for planes.',
 '{}','{}','{"plural":"die Flughäfen"}',
 'Flug (flight) + Hafen (harbour) = airport. Flying harbour!',
 'Der Flughafen ist 30 Kilometer entfernt.','The airport is 30 kilometres away.',
 ARRAY['train station','port','bus station'],'goethe'),

('de-a2-tv-003','A2','Travel','noun','das Hotel','das','hotel','/hoˈtɛl/',NULL,
 '{}','{}','{"plural":"die Hotels"}',
 'Hotel = hotel. Universal word.',
 'Ich habe ein Zimmer im Hotel gebucht.','I have booked a room at the hotel.',
 ARRAY['hostel','camping','apartment'],'goethe'),

('de-a2-tv-004','A2','Travel','noun','die Reise','die','journey / trip','/ˈʁaɪzə/',
 'Gute Reise! = Have a good trip! Reisepass = passport (travel document).',
 ARRAY['die Fahrt','der Trip'],'{}','{"plural":"die Reisen"}',
 'Reise = journey. Reisepass = travel + pass = passport!',
 'Die Reise nach Japan war wunderschön.','The journey to Japan was wonderful.',
 ARRAY['holiday','stay','flight'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- A2 — EMOTIONS
-- ═══════════════════════════════════════════════════════════════
('de-a2-em-001','A2','Emotions','adjective','glücklich',NULL,'happy','/ˈɡlʏklɪç/',
 'Glück = luck AND happiness. Germans see luck and happiness as connected.',
 ARRAY['froh','fröhlich'],ARRAY['traurig','unglücklich'],'{"comparative":"glücklicher","superlative":"am glücklichsten"}',
 'Glück = luck + happiness. To be happy = to be lucky!',
 'Ich bin sehr glücklich mit meiner Arbeit.','I am very happy with my work.',
 ARRAY['sad','angry','worried'],'goethe'),

('de-a2-em-002','A2','Emotions','adjective','traurig',NULL,'sad','/ˈtʁaʊʁɪç/',NULL,
 '{}',ARRAY['glücklich','froh'],'{"comparative":"trauriger","superlative":"am traurigsten"}',
 'traurig — sounds like "trow-rig". Traum = dream, and when dreams fail, you''re sad.',
 'Warum bist du so traurig?','Why are you so sad?',
 ARRAY['happy','angry','scared'],'goethe'),

('de-a2-em-003','A2','Emotions','adjective','aufgeregt',NULL,'excited','/ˈaʊfɡəʁeːkt/',
 'aufregen = to excite or to upset. Context tells you: positively excited or agitated.',
 '{}','{}','{}',
 'aufgeregt — auf (up) + geregt (moved/stirred). Stirred up!',
 'Die Kinder sind sehr aufgeregt wegen der Party.','The children are very excited about the party.',
 ARRAY['bored','calm','tired'],'goethe'),

('de-a2-em-004','A2','Emotions','adjective','wütend',NULL,'angry','/ˈvyːtənt/',NULL,
 ARRAY['ärgerlich','sauer'],ARRAY['ruhig'],'{}',
 'wütend = furious. Wut = rage (noun).',
 'Er ist wütend auf mich.','He is angry at me.',
 ARRAY['happy','calm','sad'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- B1 — SOCIETY & POLITICS
-- ═══════════════════════════════════════════════════════════════
('de-b1-so-001','B1','Society','noun','die Gesellschaft','die','society','/ɡəˈzɛlʃaft/',NULL,
 ARRAY['die Gemeinschaft'],'{}','{"plural":"die Gesellschaften"}',
 'Gesellschaft = society. Gesellschaft also means "company" (GmbH).',
 'In einer demokratischen Gesellschaft hat jeder eine Stimme.','In a democratic society everyone has a voice.',
 ARRAY['government','economy','culture'],'goethe'),

('de-b1-so-002','B1','Society','noun','die Umwelt','die','environment','/ˈʊmvɛlt/',
 'Um (around) + Welt (world) = environment. Umweltschutz = environmental protection.',
 '{}','{}','{}',
 'Um (around) + Welt (world) = Umwelt. The world around us.',
 'Wir müssen die Umwelt schützen.','We must protect the environment.',
 ARRAY['nature','weather','climate'],'goethe'),

('de-b1-so-003','B1','Society','noun','die Meinung','die','opinion','/ˈmaɪnʊŋ/',
 'Meiner Meinung nach = in my opinion. Mein = my, so literally "my-ing".',
 ARRAY['die Ansicht','der Standpunkt'],'{}','{"plural":"die Meinungen"}',
 'mein (my) → Meinung (opinion). Your meinung is your view.',
 'Meiner Meinung nach ist das falsch.','In my opinion that is wrong.',
 ARRAY['fact','news','information'],'goethe'),

('de-b1-so-004','B1','Society','verb','erklären',NULL,'to explain','/ɛɐˈklɛːʁən/',NULL,
 ARRAY['erläutern'],'{}','{"auxiliary":"haben","past_participle":"erklärt","simple_past":"erklärte","separable":false}',
 'erklären = explain. klar = clear; erklären = to make clear.',
 'Können Sie das bitte erklären?','Can you please explain that?',
 ARRAY['to ask','to answer','to understand'],'goethe'),

('de-b1-so-005','B1','Society','verb','entscheiden',NULL,'to decide','/ɛntˈʃaɪdn/',NULL,
 '{}','{}','{"auxiliary":"haben","past_participle":"entschieden","simple_past":"entschied","separable":false}',
 'entscheiden → strong verb. Past participle: entschieden.',
 'Ich muss mich schnell entscheiden.','I have to decide quickly.',
 ARRAY['to choose','to vote','to plan'],'goethe'),

('de-b1-so-006','B1','Society','noun','die Möglichkeit','die','possibility / opportunity','/ˈmøːklɪçkaɪt/',
 'möglich (possible) + -keit (noun suffix) = possibility.',
 ARRAY['die Chance','die Gelegenheit'],'{}','{"plural":"die Möglichkeiten"}',
 'möglich (possible) → Möglichkeit (possibility). -keit = -ity.',
 'Es gibt viele Möglichkeiten, Deutsch zu lernen.','There are many possibilities to learn German.',
 ARRAY['problem','difficulty','requirement'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- B1 — ABSTRACT & ACADEMIC
-- ═══════════════════════════════════════════════════════════════
('de-b1-ab-001','B1','Abstract','noun','der Unterschied','der','difference','/ˈʊntɐʃiːt/',NULL,
 ARRAY['die Differenz'],ARRAY['die Gemeinsamkeit'],'{"plural":"die Unterschiede"}',
 'unter (under/between) + Schied (separation). The thing that separates.',
 'Was ist der Unterschied zwischen A und B?','What is the difference between A and B?',
 ARRAY['similarity','connection','relationship'],'goethe'),

('de-b1-ab-002','B1','Abstract','verb','verstehen',NULL,'to understand','/fɛɐˈʃteːən/',NULL,
 ARRAY['begreifen','kapieren'],'{}','{"auxiliary":"haben","past_participle":"verstanden","simple_past":"verstand","separable":false}',
 'ver- prefix = completion/through. stehen = stand. To understand = to stand through it!',
 'Ich verstehe das nicht ganz.','I don''t quite understand that.',
 ARRAY['to know','to hear','to learn'],'goethe'),

('de-b1-ab-003','B1','Abstract','verb','vorschlagen',NULL,'to suggest / to propose','/ˈfoːɐʃlaːɡən/',
 'Separable verb: vor + schlagen. Ich schlage vor = I suggest.',
 ARRAY['empfehlen'],'{}','{"auxiliary":"haben","past_participle":"vorgeschlagen","simple_past":"schlug vor","separable":true,"conjugation":{"ich":"schlage vor","du":"schlägst vor","er":"schlägt vor"}}',
 'vor-schlagen is SEPARABLE: ich schlage vor (not vorschlage).',
 'Ich schlage vor, dass wir eine Pause machen.','I suggest that we take a break.',
 ARRAY['to reject','to accept','to decide'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- B2 — ADVANCED VOCABULARY
-- ═══════════════════════════════════════════════════════════════
('de-b2-ad-001','B2','Advanced','adjective','nachhaltig',NULL,'sustainable','/ˈnaːxhaltɪç/',
 'Nach (after) + haltig (holding/lasting). Sustainability is a major topic in German public discourse.',
 '{}',ARRAY['verschwenderisch'],'{"comparative":"nachhaltiger","superlative":"am nachhaltigsten"}',
 'nach (after) + halten (to hold/last) = sustainable. Lasts into the future.',
 'Wir brauchen eine nachhaltige Energieversorgung.','We need a sustainable energy supply.',
 ARRAY['efficient','organic','renewable'],'goethe'),

('de-b2-ad-002','B2','Advanced','verb','berücksichtigen',NULL,'to take into account / to consider','/bəˈʁʏksɪçtɪɡən/',NULL,
 '{}','{}','{"auxiliary":"haben","past_participle":"berücksichtigt","simple_past":"berücksichtigte","separable":false}',
 'Long verb — break it: be-rücksicht-igen. Rücksicht = consideration.',
 'Wir müssen alle Faktoren berücksichtigen.','We must take all factors into account.',
 ARRAY['to ignore','to forget','to overlook'],'goethe'),

('de-b2-ad-003','B2','Advanced','noun','die Herausforderung','die','challenge','/hɛˈʁaʊsfɔʁdəʁʊŋ/',
 'heraus (out) + fordern (to demand/challenge) + -ung = challenge. Being called out.',
 '{}',ARRAY['die Einfachheit'],'{"plural":"die Herausforderungen"}',
 'heraus (out) + fordern (demand) = challenge. Being challenged to step out.',
 'Das ist eine große Herausforderung für uns alle.','That is a great challenge for all of us.',
 ARRAY['opportunity','advantage','solution'],'goethe'),

('de-b2-ad-004','B2','Advanced','adjective','vielfältig',NULL,'diverse / varied','/ˈfiːlfɛltɪç/',
 'viel (many) + fältig (fold/type). Many-fold = diverse.',
 ARRAY['abwechslungsreich'],ARRAY['eintönig'],'{}',
 'viel (many) + Falten (folds/types) = diverse/varied.',
 'Die deutsche Küche ist sehr vielfältig.','German cuisine is very diverse.',
 ARRAY['uniform','simple','singular'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- C1 — NUANCED VOCABULARY
-- ═══════════════════════════════════════════════════════════════
('de-c1-nu-001','C1','Nuanced','adjective','eigenwillig',NULL,'headstrong / idiosyncratic','/ˈaɪɡənvɪlɪç/',
 'Eigen (own) + Wille (will) = someone with their own strong will. Can be a compliment or criticism.',
 ARRAY['eigensinnig','sturköpfig'],'{}','{}',
 'eigen (own) + Wille (will) = someone driven by their own will.',
 'Er ist ein eigenwilliger Künstler.','He is an idiosyncratic artist.',
 ARRAY['obedient','flexible','compliant'],'goethe'),

('de-c1-nu-002','C1','Nuanced','verb','veranschaulichen',NULL,'to illustrate / to visualise','/fɛɐˈʔanʃaʊlɪçən/',NULL,
 ARRAY['darstellen','zeigen'],'{}','{"auxiliary":"haben","past_participle":"veranschaulicht","simple_past":"veranschaulichte","separable":false}',
 'ver + anschaulich (visual/illustrative) + en. Making something visually clear.',
 'Das Diagramm veranschaulicht die Daten sehr gut.','The diagram illustrates the data very well.',
 ARRAY['to hide','to complicate','to obscure'],'goethe'),

('de-c1-nu-003','C1','Nuanced','noun','die Gelassenheit','die','composure / serenity','/ɡəˈlasənhaɪt/',
 'Gelassen = calm/composed. This quality is highly valued in German professional culture.',
 ARRAY['die Ruhe','die Besonnenheit'],'{}','{}',
 'lassen (to let/leave) → gelassen (let-go/calm) → Gelassenheit (calmness).',
 'Sie reagierte mit großer Gelassenheit auf die Krise.','She responded to the crisis with great composure.',
 ARRAY['panic','excitement','agitation'],'goethe'),

-- ═══════════════════════════════════════════════════════════════
-- C2 — MASTERY LEVEL
-- ═══════════════════════════════════════════════════════════════
('de-c2-ma-001','C2','Mastery','noun','die Weltanschauung','die','worldview / philosophy of life','/ˈvɛltʔanʃaʊʊŋ/',
 'Welt (world) + Anschauung (view/perception). This German word is used untranslated in English academic texts.',
 '{}','{}','{"plural":"die Weltanschauungen"}',
 'One of the most famous German export words — used in English philosophy as-is.',
 'Seine Weltanschauung wurde durch die Erfahrungen des Krieges geprägt.','His worldview was shaped by the experiences of war.',
 ARRAY['opinion','belief','theory'],'goethe'),

('de-c2-ma-002','C2','Mastery','noun','die Fingerspitzengefühl','das','tact / intuitive sensitivity','/ˈfɪŋɐʃpɪtsənɡəfyːl/',
 'Finger + Spitzen (tips) + Gefühl (feeling). Literally "fingertip feeling" — the delicate touch needed in sensitive situations.',
 '{}','{}','{}',
 'Fingertip + feeling = the delicate sensitivity to handle tricky situations.',
 'In der Diplomatie braucht man viel Fingerspitzengefühl.','In diplomacy you need a lot of tact.',
 ARRAY['strength','boldness','directness'],'goethe'),

('de-c2-ma-003','C2','Mastery','noun','die Schadenfreude','die','pleasure from others'' misfortune','/ˈʃaːdənfʁɔɪdə/',
 'Schaden (damage/harm) + Freude (joy). Famous German export word — used globally in English.',
 '{}','{}','{}',
 'Another globally adopted German word. Schaden = harm, Freude = joy.',
 'Es ist nicht schön, Schadenfreude zu empfinden.','It is not nice to feel pleasure from others'' misfortune.',
 ARRAY['empathy','sympathy','compassion'],'goethe'),

('de-c2-ma-004','C2','Mastery','adjective','unverwechselbar',NULL,'unmistakable / distinctive','/ˈʊnfɛɐˈvɛksəlbaːɐ/',NULL,
 ARRAY['einzigartig','unverkennbar'],'{}','{}',
 'un (not) + verwechseln (to mix up) + bar (able). Cannot be mixed up with anything else.',
 'Ihr Schreibstil ist unverwechselbar.','Her writing style is unmistakable.',
 ARRAY['ordinary','typical','common'],'goethe'),

('de-c2-ma-005','C2','Mastery','noun','das Fernweh','das','wanderlust / longing to travel','/ˈfɛʁnveː/',
 'Fern (far) + Weh (ache/pain). The ache for far-away places. Opposite: Heimweh = homesickness.',
 '{}',ARRAY['Heimweh'],'{}',
 'Fern (far) + Weh (ache) = longing for distant places. Opposite of Heimweh.',
 'Das Fernweh treibt mich immer wieder auf Reisen.','Wanderlust drives me to travel again and again.',
 ARRAY['homesickness','comfort','security'],'goethe');

COMMIT;
