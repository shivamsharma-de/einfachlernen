export type PhraseCategory =
  | 'Opinions'
  | 'Agreement'
  | 'Disagreement'
  | 'Contrast'
  | 'Greetings'
  | 'Apologies'
  | 'Requests'
  | 'Emails'
  | 'Shopping'
  | 'Directions';

export type Register = 'formal' | 'informal' | 'neutral';
export type Usage = 'spoken' | 'written' | 'both';

export interface Phrase {
  id: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  category: PhraseCategory;
  register: Register;
  usage: Usage;
  german: string;
  english: string;
  exampleDe: string;
  exampleEn: string;
  tip?: string;
}

export const redemittel: Phrase[] = [
  // ─── GREETINGS (A1) ───
  {
    id: 'r-gr1', level: 'A1', category: 'Greetings', register: 'informal', usage: 'spoken',
    german: 'Wie geht\'s?',
    english: 'How are you? (informal)',
    exampleDe: 'Hey, wie geht\'s? — Danke, gut!',
    exampleEn: 'Hey, how are you? — Thanks, good!',
    tip: 'Short for "Wie geht es dir?" — use only with friends.',
  },
  {
    id: 'r-gr2', level: 'A1', category: 'Greetings', register: 'formal', usage: 'spoken',
    german: 'Wie geht es Ihnen?',
    english: 'How are you? (formal)',
    exampleDe: 'Guten Tag, Herr Müller. Wie geht es Ihnen?',
    exampleEn: 'Good day, Mr Müller. How are you?',
    tip: '"Ihnen" (capital I) is the formal "you" in dative.',
  },
  {
    id: 'r-gr3', level: 'A1', category: 'Greetings', register: 'informal', usage: 'spoken',
    german: 'Ich heiße … / Ich bin …',
    english: 'My name is … / I am …',
    exampleDe: 'Hallo! Ich heiße Maria.',
    exampleEn: 'Hello! My name is Maria.',
    tip: '"Heiße" comes from "heißen" (to be called).',
  },
  {
    id: 'r-gr4', level: 'A1', category: 'Greetings', register: 'neutral', usage: 'spoken',
    german: 'Woher kommen Sie? / Woher kommst du?',
    english: 'Where are you from?',
    exampleDe: 'Woher kommen Sie? — Ich komme aus Indien.',
    exampleEn: 'Where are you from? — I am from India.',
  },
  {
    id: 'r-gr5', level: 'A1', category: 'Greetings', register: 'neutral', usage: 'spoken',
    german: 'Schön, Sie / dich kennenzulernen.',
    english: 'Nice to meet you.',
    exampleDe: 'Das ist Herr Klein. — Schön, Sie kennenzulernen!',
    exampleEn: 'This is Mr Klein. — Nice to meet you!',
    tip: '"Sie" (formal) or "dich" (informal) after "kennenzulernen".',
  },

  // ─── APOLOGIES (A1) ───
  {
    id: 'r-ap1', level: 'A1', category: 'Apologies', register: 'neutral', usage: 'spoken',
    german: 'Es tut mir leid.',
    english: 'I am sorry.',
    exampleDe: 'Es tut mir leid, ich habe das nicht gewusst.',
    exampleEn: 'I am sorry, I did not know that.',
    tip: 'Stronger and more sincere than just "Entschuldigung".',
  },
  {
    id: 'r-ap2', level: 'A1', category: 'Apologies', register: 'neutral', usage: 'spoken',
    german: 'Kein Problem!',
    english: 'No problem!',
    exampleDe: 'Es tut mir leid. — Kein Problem!',
    exampleEn: 'I am sorry. — No problem!',
  },

  // ─── REQUESTS (A1/A2) ───
  {
    id: 'r-rq1', level: 'A1', category: 'Requests', register: 'neutral', usage: 'spoken',
    german: 'Können Sie … bitte …?',
    english: 'Could you please …?',
    exampleDe: 'Können Sie das bitte wiederholen?',
    exampleEn: 'Could you please repeat that?',
    tip: 'Always add "bitte" to sound polite.',
  },
  {
    id: 'r-rq2', level: 'A2', category: 'Requests', register: 'formal', usage: 'spoken',
    german: 'Dürfte ich Sie etwas fragen?',
    english: 'May I ask you something?',
    exampleDe: 'Entschuldigung, dürfte ich Sie etwas fragen?',
    exampleEn: 'Excuse me, may I ask you something?',
    tip: '"Dürfte" is the Konjunktiv II of "dürfen" — very polite.',
  },
  {
    id: 'r-rq3', level: 'A2', category: 'Requests', register: 'informal', usage: 'spoken',
    german: 'Kannst du mir helfen?',
    english: 'Can you help me?',
    exampleDe: 'Kannst du mir helfen? Ich verstehe das nicht.',
    exampleEn: 'Can you help me? I don\'t understand this.',
  },

  // ─── OPINIONS (A2/B1) ───
  {
    id: 'r-op1', level: 'A2', category: 'Opinions', register: 'neutral', usage: 'both',
    german: 'Ich finde, dass …',
    english: 'I think that … / I find that …',
    exampleDe: 'Ich finde, dass Deutsch sehr interessant ist.',
    exampleEn: 'I think that German is very interesting.',
    tip: '"Finden" is commonly used for personal opinions in everyday speech.',
  },
  {
    id: 'r-op2', level: 'A2', category: 'Opinions', register: 'neutral', usage: 'spoken',
    german: 'Meiner Meinung nach …',
    english: 'In my opinion …',
    exampleDe: 'Meiner Meinung nach ist Berlin eine tolle Stadt.',
    exampleEn: 'In my opinion, Berlin is a great city.',
    tip: 'After this phrase the verb comes before the subject (inversion).',
  },
  {
    id: 'r-op3', level: 'A2', category: 'Opinions', register: 'neutral', usage: 'both',
    german: 'Ich bin der Meinung, dass …',
    english: 'I am of the opinion that …',
    exampleDe: 'Ich bin der Meinung, dass wir mehr üben sollten.',
    exampleEn: 'I am of the opinion that we should practise more.',
  },
  {
    id: 'r-op4', level: 'A2', category: 'Opinions', register: 'neutral', usage: 'spoken',
    german: 'Ich glaube, dass …',
    english: 'I believe that …',
    exampleDe: 'Ich glaube, dass das eine gute Idee ist.',
    exampleEn: 'I believe that is a good idea.',
  },

  // ─── AGREEMENT (A2) ───
  {
    id: 'r-ag1', level: 'A2', category: 'Agreement', register: 'neutral', usage: 'spoken',
    german: 'Da bin ich ganz Ihrer / deiner Meinung.',
    english: 'I completely agree with you.',
    exampleDe: 'Das ist wirklich wichtig. — Da bin ich ganz deiner Meinung!',
    exampleEn: 'That is really important. — I completely agree with you!',
    tip: '"Ihrer" (formal) or "deiner" (informal).',
  },
  {
    id: 'r-ag2', level: 'A2', category: 'Agreement', register: 'neutral', usage: 'spoken',
    german: 'Genau! / Stimmt!',
    english: 'Exactly! / That\'s right!',
    exampleDe: 'Das ist zu schwer. — Genau! Das denke ich auch.',
    exampleEn: 'That is too hard. — Exactly! I think so too.',
    tip: 'Short, punchy agreement — very common in conversation.',
  },
  {
    id: 'r-ag3', level: 'A2', category: 'Agreement', register: 'neutral', usage: 'spoken',
    german: 'Das sehe ich genauso.',
    english: 'I see it the same way.',
    exampleDe: 'Wir brauchen mehr Zeit. — Das sehe ich genauso.',
    exampleEn: 'We need more time. — I see it the same way.',
  },

  // ─── DISAGREEMENT (A2) ───
  {
    id: 'r-dis1', level: 'A2', category: 'Disagreement', register: 'neutral', usage: 'spoken',
    german: 'Ich sehe das anders.',
    english: 'I see that differently.',
    exampleDe: 'Das ist einfach. — Ich sehe das anders.',
    exampleEn: 'That is easy. — I see that differently.',
    tip: 'Polite way to disagree without being confrontational.',
  },
  {
    id: 'r-dis2', level: 'A2', category: 'Disagreement', register: 'neutral', usage: 'spoken',
    german: 'Das stimmt (leider) nicht.',
    english: 'That is (unfortunately) not correct.',
    exampleDe: 'Das stimmt leider nicht — hier ist der Fehler.',
    exampleEn: 'That is unfortunately not correct — here is the mistake.',
    tip: 'Adding "leider" (unfortunately) softens the correction.',
  },

  // ─── CONTRAST (A2/B1) ───
  {
    id: 'r-ct1', level: 'A2', category: 'Contrast', register: 'neutral', usage: 'both',
    german: 'aber / jedoch',
    english: 'but / however',
    exampleDe: 'Ich mag Sport, aber ich habe keine Zeit.',
    exampleEn: 'I like sport, but I have no time.',
    tip: '"Jedoch" is slightly more formal than "aber".',
  },
  {
    id: 'r-ct2', level: 'A2', category: 'Contrast', register: 'neutral', usage: 'both',
    german: 'trotzdem',
    english: 'nevertheless / still / even so',
    exampleDe: 'Es regnet, trotzdem gehen wir spazieren.',
    exampleEn: 'It is raining; nevertheless we are going for a walk.',
    tip: 'Triggers verb-subject inversion when starting a clause.',
  },
  {
    id: 'r-ct3', level: 'A2', category: 'Contrast', register: 'neutral', usage: 'both',
    german: 'Einerseits … andererseits …',
    english: 'On the one hand … on the other hand …',
    exampleDe: 'Einerseits ist es billig, andererseits ist die Qualität schlecht.',
    exampleEn: 'On the one hand it is cheap; on the other hand the quality is poor.',
    tip: 'Great for showing balance or two sides of an argument.',
  },

  // ─── SHOPPING (A2) ───
  {
    id: 'r-sh1', level: 'A2', category: 'Shopping', register: 'neutral', usage: 'spoken',
    german: 'Was kostet das?',
    english: 'How much does that cost?',
    exampleDe: 'Entschuldigung, was kostet das Hemd?',
    exampleEn: 'Excuse me, how much does the shirt cost?',
  },
  {
    id: 'r-sh2', level: 'A2', category: 'Shopping', register: 'neutral', usage: 'spoken',
    german: 'Haben Sie das in einer anderen Größe?',
    english: 'Do you have that in a different size?',
    exampleDe: 'Haben Sie das in einer anderen Größe? — Ja, in L.',
    exampleEn: 'Do you have that in a different size? — Yes, in L.',
  },
  {
    id: 'r-sh3', level: 'A2', category: 'Shopping', register: 'neutral', usage: 'spoken',
    german: 'Ich hätte gern …',
    english: 'I would like …',
    exampleDe: 'Ich hätte gern ein Kilo Äpfel, bitte.',
    exampleEn: 'I would like a kilo of apples, please.',
    tip: '"Hätte" is Konjunktiv II — more polite than "Ich will".',
  },
  {
    id: 'r-sh4', level: 'A2', category: 'Shopping', register: 'neutral', usage: 'spoken',
    german: 'Kann ich mit Karte zahlen?',
    english: 'Can I pay by card?',
    exampleDe: 'Kann ich mit Karte zahlen oder nur bar?',
    exampleEn: 'Can I pay by card or only cash?',
  },

  // ─── DIRECTIONS (A2) ───
  {
    id: 'r-dr1', level: 'A2', category: 'Directions', register: 'neutral', usage: 'spoken',
    german: 'Wie komme ich zum/zur …?',
    english: 'How do I get to the …?',
    exampleDe: 'Entschuldigung, wie komme ich zum Bahnhof?',
    exampleEn: 'Excuse me, how do I get to the train station?',
    tip: '"Zum" + masculine/neuter noun, "zur" + feminine noun.',
  },
  {
    id: 'r-dr2', level: 'A2', category: 'Directions', register: 'neutral', usage: 'spoken',
    german: 'Gehen Sie geradeaus / links / rechts.',
    english: 'Go straight ahead / left / right.',
    exampleDe: 'Gehen Sie geradeaus, dann links.',
    exampleEn: 'Go straight ahead, then left.',
  },
  {
    id: 'r-dr3', level: 'A2', category: 'Directions', register: 'neutral', usage: 'spoken',
    german: 'Es ist in der Nähe / weit weg.',
    english: 'It is nearby / far away.',
    exampleDe: 'Ist der Supermarkt weit weg? — Nein, er ist in der Nähe.',
    exampleEn: 'Is the supermarket far away? — No, it is nearby.',
  },

  // ─── EMAILS (A2) ───
  {
    id: 'r-em1', level: 'A2', category: 'Emails', register: 'formal', usage: 'written',
    german: 'Sehr geehrte Damen und Herren,',
    english: 'Dear Sir or Madam, (formal opening)',
    exampleDe: 'Sehr geehrte Damen und Herren, ich schreibe bezüglich …',
    exampleEn: 'Dear Sir or Madam, I am writing regarding …',
    tip: 'Standard formal opening when you don\'t know the recipient\'s name.',
  },
  {
    id: 'r-em2', level: 'A2', category: 'Emails', register: 'formal', usage: 'written',
    german: 'Mit freundlichen Grüßen,',
    english: 'Yours sincerely / Kind regards,',
    exampleDe: 'Mit freundlichen Grüßen, Anna Schmidt',
    exampleEn: 'Yours sincerely, Anna Schmidt',
    tip: 'Standard sign-off for formal emails and letters.',
  },
  {
    id: 'r-em3', level: 'A2', category: 'Emails', register: 'informal', usage: 'written',
    german: 'Liebe/Lieber …,',
    english: 'Dear … (informal/friendly)',
    exampleDe: 'Liebe Maria, wie geht es dir?',
    exampleEn: 'Dear Maria, how are you?',
    tip: '"Liebe" for female, "Lieber" for male.',
  },
  {
    id: 'r-em4', level: 'A2', category: 'Emails', register: 'formal', usage: 'written',
    german: 'Ich schreibe Ihnen wegen …',
    english: 'I am writing to you regarding …',
    exampleDe: 'Ich schreibe Ihnen wegen meiner Bestellung.',
    exampleEn: 'I am writing to you regarding my order.',
    tip: '"Wegen" takes the genitive case.',
  },
];

export const PHRASE_CATEGORIES: PhraseCategory[] = [
  'Greetings', 'Apologies', 'Requests', 'Opinions', 'Agreement',
  'Disagreement', 'Contrast', 'Shopping', 'Directions', 'Emails',
];
