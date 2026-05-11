-- German Redemittel (functional phrases) seed — A1→B2
-- Run AFTER 002_german_content.sql

BEGIN;

INSERT INTO public.de_redemittel
  (id, level, category, register, usage_context,
   german, english, example_de, example_en, cultural_context, tip)
VALUES

-- ═══════════════════════════════════════════════════════════════
-- A1 — GREETINGS & INTRODUCTIONS
-- ═══════════════════════════════════════════════════════════════
('de-r-a1-greet-001','A1','Greetings','informal','spoken',
 'Ich heiße …','My name is …',
 'Guten Tag! Ich heiße Markus.','Good day! My name is Markus.',
 'Standard self-introduction. Used in formal and informal settings.',
 'Heißen is the verb for "to be called" — use it for names.'),

('de-r-a1-greet-002','A1','Greetings','formal','spoken',
 'Darf ich mich vorstellen?','May I introduce myself?',
 'Darf ich mich vorstellen? Ich bin Dr. Müller.','May I introduce myself? I am Dr Müller.',
 'Used when entering a professional context or meeting someone for the first time formally.',
 'Very polite opening — use in job interviews, formal meetings.'),

('de-r-a1-greet-003','A1','Greetings','informal','spoken',
 'Woher kommst du?','Where do you come from? (informal)',
 'Woher kommst du? — Ich komme aus Österreich.','Where are you from? — I am from Austria.',
 NULL,
 'du (informal). With Sie (formal): Woher kommen Sie?'),

('de-r-a1-greet-004','A1','Greetings','neutral','spoken',
 'Es freut mich, Sie kennenzulernen.','Pleased to meet you.',
 'Es freut mich, Sie kennenzulernen, Frau Schmidt.','Pleased to meet you, Ms Schmidt.',
 'Literal: "It pleases me to get to know you." Standard polite response when introduced.',
 'Slightly formal. In casual settings: Schön, dich kennenzulernen.'),

('de-r-a1-greet-005','A1','Greetings','informal','spoken',
 'Wie geht''s?','How''s it going? (casual)',
 'Hey! Wie geht''s?','Hey! How''s it going?',
 'Casual shortening of Wie geht es dir? Very common among friends.',
 'geht''s = geht es. The apostrophe marks the dropped "e".'),

('de-r-a1-greet-006','A1','Greetings','neutral','spoken',
 'Danke, gut. Und Ihnen/dir?','Fine, thanks. And you?',
 '— Wie geht es Ihnen? — Danke, gut. Und Ihnen?','— How are you? — Fine, thanks. And you?',
 NULL,
 'Ihnen (formal Sie) or dir (informal du). Switch depending on context.'),

-- ═══════════════════════════════════════════════════════════════
-- A1 — MAKING REQUESTS
-- ═══════════════════════════════════════════════════════════════
('de-r-a1-req-001','A1','Requests','formal','spoken',
 'Können Sie mir bitte helfen?','Could you please help me?',
 'Entschuldigung, können Sie mir bitte helfen?','Excuse me, could you please help me?',
 NULL,
 'Können Sie (formal). With du: Kannst du mir bitte helfen?'),

('de-r-a1-req-002','A1','Requests','neutral','spoken',
 'Ich hätte gerne …','I would like … (polite request)',
 'Ich hätte gerne einen Kaffee, bitte.','I would like a coffee, please.',
 'The Konjunktiv II (hätte) makes requests polite. Use in restaurants, shops.',
 'hätte gerne = would like. More polite than "Ich will" (I want).'),

('de-r-a1-req-003','A1','Requests','neutral','spoken',
 'Wie viel kostet …?','How much does … cost?',
 'Wie viel kostet das Buch?','How much does the book cost?',
 NULL,
 'Was kostet ...? also works. Both are correct and common.'),

('de-r-a1-req-004','A1','Requests','neutral','both',
 'Darf ich …?','May I …?',
 'Darf ich hier rauchen?','May I smoke here?',
 'Dürfen = to be allowed. Darf ich = am I allowed to?',
 'Asking for permission. More polite than "Kann ich" for formal settings.'),

-- ═══════════════════════════════════════════════════════════════
-- A1 — NOT UNDERSTANDING
-- ═══════════════════════════════════════════════════════════════
('de-r-a1-und-001','A1','Clarification','neutral','spoken',
 'Ich verstehe nicht.','I don''t understand.',
 'Es tut mir leid, ich verstehe nicht.','I''m sorry, I don''t understand.',
 NULL,
 'Essential phrase for beginners. Follow with: Können Sie das bitte wiederholen?'),

('de-r-a1-und-002','A1','Clarification','neutral','spoken',
 'Können Sie das bitte wiederholen?','Could you please repeat that?',
 'Entschuldigung, können Sie das bitte wiederholen?','Excuse me, could you please repeat that?',
 NULL,
 'wiederholen = to repeat. Can also say: Noch einmal, bitte. (Once more, please.)'),

('de-r-a1-und-003','A1','Clarification','neutral','spoken',
 'Können Sie bitte langsamer sprechen?','Could you please speak more slowly?',
 'Tut mir leid, können Sie bitte langsamer sprechen?','Sorry, could you please speak more slowly?',
 NULL,
 'langsamer = slower. Crucial phrase for language learners!'),

('de-r-a1-und-004','A1','Clarification','neutral','spoken',
 'Was bedeutet …?','What does … mean?',
 'Was bedeutet "Gemütlichkeit"?','What does "Gemütlichkeit" mean?',
 NULL,
 'Use this to ask for a definition or translation.'),

-- ═══════════════════════════════════════════════════════════════
-- A2 — EXPRESSING OPINIONS
-- ═══════════════════════════════════════════════════════════════
('de-r-a2-opin-001','A2','Opinions','neutral','both',
 'Ich denke, dass …','I think that …',
 'Ich denke, dass das eine gute Idee ist.','I think that is a good idea.',
 'Dass triggers V2 word order in the subordinate clause.',
 'dass = that (conjunction). Verb goes to the END of the clause.'),

('de-r-a2-opin-002','A2','Opinions','neutral','both',
 'Ich finde, dass …','I find / think that …',
 'Ich finde, dass das Essen sehr lecker ist.','I find the food very delicious.',
 NULL,
 'finden = to find/think. More common in spoken German than denken.'),

('de-r-a2-opin-003','A2','Opinions','neutral','both',
 'Meiner Meinung nach …','In my opinion …',
 'Meiner Meinung nach sollten wir früher anfangen.','In my opinion we should start earlier.',
 'This phrase is heavily used in essays and discussions. Meinung = opinion.',
 'Triggers normal sentence word order: Meiner Meinung nach [verb] [subject].'),

('de-r-a2-opin-004','A2','Opinions','neutral','both',
 'Ich bin der Meinung, dass …','I am of the opinion that …',
 'Ich bin der Meinung, dass mehr investiert werden sollte.','I am of the opinion that more should be invested.',
 NULL,
 'More formal than Ich denke. Good for essays and debates.'),

-- ═══════════════════════════════════════════════════════════════
-- A2 — AGREEMENT & DISAGREEMENT
-- ═══════════════════════════════════════════════════════════════
('de-r-a2-agr-001','A2','Agreement','neutral','spoken',
 'Da stimme ich zu.','I agree with that.',
 '— Das System muss verbessert werden. — Da stimme ich zu.','— The system needs improving. — I agree.',
 NULL,
 'zustimmen = to agree (separable). da = with that.'),

('de-r-a2-agr-002','A2','Agreement','neutral','spoken',
 'Das sehe ich auch so.','I see it the same way.',
 '— Wir brauchen mehr Zeit. — Das sehe ich auch so.','— We need more time. — I see it the same way.',
 NULL,
 'Natural spoken agreement. Less formal than Da stimme ich zu.'),

('de-r-a2-agr-003','A2','Agreement','neutral','spoken',
 'Genau! / Stimmt!','Exactly! / That''s right!',
 '— Das war ein Fehler. — Genau!','— That was a mistake. — Exactly!',
 'Genau is one of the most satisfying German words to use — Germans use it constantly.',
 'Genau! is perhaps the most natural way to agree in German conversation.'),

('de-r-a2-dis-001','A2','Disagreement','neutral','both',
 'Da bin ich anderer Meinung.','I have a different opinion on that.',
 'Ich respektiere Ihre Sicht, aber da bin ich anderer Meinung.','I respect your view, but I have a different opinion.',
 NULL,
 'Polite disagreement — acknowledges the other view before rejecting it.'),

('de-r-a2-dis-002','A2','Disagreement','neutral','both',
 'Das sehe ich anders.','I see that differently.',
 '— Das geht nicht. — Das sehe ich anders.','— That''s not possible. — I see that differently.',
 NULL,
 'Direct but not aggressive. Common in discussions and meetings.'),

('de-r-a2-dis-003','A2','Disagreement','neutral','both',
 'Das stimmt nicht ganz.','That''s not quite right.',
 'Das stimmt nicht ganz — es gibt noch andere Faktoren.','That''s not quite right — there are other factors.',
 NULL,
 'Softer than Das ist falsch (That is wrong). Good for polite correction.'),

-- ═══════════════════════════════════════════════════════════════
-- A2 — MAKING SUGGESTIONS
-- ═══════════════════════════════════════════════════════════════
('de-r-a2-sug-001','A2','Suggestions','neutral','spoken',
 'Wie wäre es mit …?','How about …?',
 'Wie wäre es mit einem Spaziergang?','How about a walk?',
 NULL,
 'wäre = would be (Konjunktiv II). Very natural for suggestions.'),

('de-r-a2-sug-002','A2','Suggestions','neutral','spoken',
 'Wollen wir …?','Shall we …?',
 'Wollen wir heute Abend ins Kino gehen?','Shall we go to the cinema tonight?',
 NULL,
 'wollen = to want. Wollen wir = shall we (literally: do we want to).'),

('de-r-a2-sug-003','A2','Suggestions','neutral','both',
 'Ich schlage vor, dass …','I suggest that …',
 'Ich schlage vor, dass wir die Sitzung auf Mittwoch verschieben.','I suggest that we move the meeting to Wednesday.',
 'vorschlagen is separable: schlage … vor. The dass-clause pushes verb to end.',
 'vorschlagen = to suggest/propose. Separable verb!'),

-- ═══════════════════════════════════════════════════════════════
-- B1 — CONTRAST & CONCESSION
-- ═══════════════════════════════════════════════════════════════
('de-r-b1-con-001','B1','Contrast','neutral','both',
 'Einerseits …, andererseits …','On the one hand …, on the other hand …',
 'Einerseits ist das günstig, andererseits riskant.','On the one hand that is affordable, on the other hand risky.',
 'Classic structure for balanced arguments. Heavily used in essays and debates.',
 'Great for Erörterung (discursive essays) — shows you can see both sides.'),

('de-r-b1-con-002','B1','Contrast','neutral','both',
 'Obwohl …, …','Although … , …',
 'Obwohl es regnete, gingen wir spazieren.','Although it rained, we went for a walk.',
 'obwohl (although) is a subordinating conjunction — verb goes to the end of the clause.',
 'obwohl + verb last in its clause. Then main clause in normal V2 order.'),

('de-r-b1-con-003','B1','Contrast','neutral','both',
 'Trotzdem …','Nevertheless / Despite that …',
 'Es war kalt, trotzdem sind wir geschwommen.','It was cold; nevertheless we went swimming.',
 NULL,
 'trotzdem (nevertheless) triggers inversion: trotzdem + VERB + subject.'),

('de-r-b1-con-004','B1','Contrast','neutral','both',
 'Zwar …, aber …','Admittedly … but …',
 'Das ist zwar teuer, aber es lohnt sich.','It''s admittedly expensive, but it''s worth it.',
 'zwar … aber = admittedly … but. Used to concede a point before countering it.',
 'Zwar in position 1 forces inversion. zwar und aber are always partners.'),

-- ═══════════════════════════════════════════════════════════════
-- B1 — CAUSE & EFFECT
-- ═══════════════════════════════════════════════════════════════
('de-r-b1-cau-001','B1','Cause & Effect','neutral','both',
 'Deshalb / Deswegen …','Therefore / That is why …',
 'Es hat geregnet, deshalb sind wir geblieben.','It rained, therefore we stayed.',
 'deshalb and deswegen are interchangeable. Both mean therefore/that is why.',
 'Like trotzdem, deshalb in position 1 forces verb-subject inversion.'),

('de-r-b1-cau-002','B1','Cause & Effect','neutral','both',
 'Da … ,','Since/As … ,',
 'Da ich krank bin, kann ich nicht kommen.','As I am sick, I cannot come.',
 'da (here: since/as — not the adverb "there") introduces a reason clause.',
 'da = since/because (causal). Different from da = there (spatial).'),

('de-r-b1-cau-003','B1','Cause & Effect','neutral','both',
 'Das liegt daran, dass …','That is because …',
 'Das liegt daran, dass der Zug Verspätung hatte.','That is because the train was delayed.',
 NULL,
 'More sophisticated than weil. daran = at/on that. Verb to end after dass.'),

-- ═══════════════════════════════════════════════════════════════
-- B1 — FORMAL LETTERS & EMAILS
-- ═══════════════════════════════════════════════════════════════
('de-r-b1-let-001','B1','Letters & Emails','formal','written',
 'Sehr geehrte Damen und Herren,','Dear Sir or Madam,',
 'Sehr geehrte Damen und Herren, ich schreibe bezüglich Ihrer Anzeige …',
 'Dear Sir or Madam, I am writing regarding your advertisement …',
 'Standard opening when you don''t know the recipient''s name. Required in German formal correspondence.',
 'Always followed by a comma in German. The first word of the letter body is lowercase.'),

('de-r-b1-let-002','B1','Letters & Emails','formal','written',
 'Sehr geehrte/r Frau/Herr [Name],','Dear Ms/Mr [Name],',
 'Sehr geehrte Frau Müller, hiermit bestätige ich …',
 'Dear Ms Müller, I hereby confirm …',
 NULL,
 'geehrte (fem.) vs geehrter (masc.). Always use Frau/Herr + surname.'),

('de-r-b1-let-003','B1','Letters & Emails','formal','written',
 'Ich schreibe Ihnen bezüglich …','I am writing to you regarding …',
 'Ich schreibe Ihnen bezüglich Ihrer Stellenausschreibung vom 10. Mai.',
 'I am writing to you regarding your job advertisement of 10 May.',
 NULL,
 'bezüglich + genitive. More formal than wegen (which takes genitive or dative).'),

('de-r-b1-let-004','B1','Letters & Emails','formal','written',
 'Mit freundlichen Grüßen,','Kind regards,',
 'Mit freundlichen Grüßen, Anna Huber',
 'Kind regards, Anna Huber',
 'The standard formal sign-off in German. Never use Tschüss or similar in formal letters.',
 'The most important closing phrase. Alternatives: Hochachtungsvoll (very formal), Viele Grüße (semi-formal).'),

('de-r-b1-let-005','B1','Letters & Emails','formal','written',
 'Ich würde mich über eine baldige Antwort freuen.','I would appreciate a prompt reply.',
 'Ich würde mich über eine baldige Antwort freuen und verbleibe mit freundlichen Grüßen.',
 'I would appreciate a prompt reply and remain with kind regards.',
 NULL,
 'baldige = prompt/soon. Würde + infinitive = polite conditional.'),

-- ═══════════════════════════════════════════════════════════════
-- B2 — ACADEMIC & DISCUSSION
-- ═══════════════════════════════════════════════════════════════
('de-r-b2-ac-001','B2','Academic','formal','written',
 'Es lässt sich feststellen, dass …','It can be established that …',
 'Es lässt sich feststellen, dass die Datenlage unvollständig ist.',
 'It can be established that the data situation is incomplete.',
 'Impersonal and academic. lassen + sich + infinitive = passive-like construction.',
 'Use this to present a finding objectively without using "I".'),

('de-r-b2-ac-002','B2','Academic','formal','written',
 'Daraus folgt, dass …','From this it follows that …',
 'Daraus folgt, dass weitere Maßnahmen notwendig sind.',
 'From this it follows that further measures are necessary.',
 NULL,
 'daraus (from this) + folgt (follows) = logical conclusion marker.'),

('de-r-b2-ac-003','B2','Academic','formal','written',
 'Im Hinblick auf …','With regard to …',
 'Im Hinblick auf die aktuellen Zahlen ist Vorsicht geboten.',
 'With regard to the current figures, caution is advised.',
 NULL,
 'im Hinblick auf + accusative. More formal than bezüglich.'),

('de-r-b2-ac-004','B2','Academic','formal','both',
 'Es wäre falsch anzunehmen, dass …','It would be wrong to assume that …',
 'Es wäre falsch anzunehmen, dass alle Probleme gelöst sind.',
 'It would be wrong to assume that all problems are solved.',
 NULL,
 'Konjunktiv II (wäre) + anzunehmen (to assume). Sophisticated counter-argument opener.'),

('de-r-b2-ac-005','B2','Academic','formal','both',
 'Abschließend lässt sich sagen, dass …','In conclusion, it can be said that …',
 'Abschließend lässt sich sagen, dass das Projekt erfolgreich war.',
 'In conclusion, it can be said that the project was successful.',
 'lassen + sich + sagen = impersonal, objective conclusion marker.',
 'Use to close essays, presentations, and reports. Abschließend = in closing.');

COMMIT;
