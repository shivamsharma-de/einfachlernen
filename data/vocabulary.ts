export type WordCategory =
  | 'Greetings'
  | 'Numbers'
  | 'Colors'
  | 'Family'
  | 'Food & Drink'
  | 'Body'
  | 'Household'
  | 'Clothing'
  | 'Days & Months'
  | 'Travel'
  | 'Shopping'
  | 'Weather'
  | 'Hobbies'
  | 'Work'
  | 'Directions'
  | 'Time'
  | 'Nature'
  | 'Health';

export type WordType = 'noun' | 'verb' | 'adjective' | 'phrase' | 'adverb';
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface VocabWord {
  id: string;
  level: CEFRLevel;
  category: WordCategory;
  type: WordType;
  german: string;
  article?: 'der' | 'die' | 'das'; // for nouns
  english: string;
  pronunciation: string;
  hint: string;
  exampleDe: string;
  exampleEn: string;
  distractors: string[]; // 3 wrong English answers
}

export const vocabulary: VocabWord[] = [
  // ─── A1 · GREETINGS ───
  {
    id: 'a1-g1', level: 'A1', category: 'Greetings', type: 'phrase',
    german: 'Guten Morgen', pronunciation: '/ˌɡuːtən ˈmɔrɡən/',
    english: 'Good morning',
    hint: 'You say this when the sun is just rising.',
    exampleDe: 'Guten Morgen! Wie geht es Ihnen?',
    exampleEn: 'Good morning! How are you?',
    distractors: ['Good night', 'Good evening', 'Goodbye'],
  },
  {
    id: 'a1-g2', level: 'A1', category: 'Greetings', type: 'phrase',
    german: 'Auf Wiedersehen', pronunciation: '/ˌaʊf ˈviːdɐˌzeːən/',
    english: 'Goodbye',
    hint: 'Literally means "until we see each other again".',
    exampleDe: 'Es war schön. Auf Wiedersehen!',
    exampleEn: 'It was nice. Goodbye!',
    distractors: ['Hello', 'Good morning', 'Please'],
  },
  {
    id: 'a1-g3', level: 'A1', category: 'Greetings', type: 'phrase',
    german: 'Bitte', pronunciation: '/ˈbɪtə/',
    english: 'Please / You\'re welcome',
    hint: 'Said when making a polite request or responding to "thank you".',
    exampleDe: 'Ein Kaffee, bitte.',
    exampleEn: 'A coffee, please.',
    distractors: ['Thank you', 'Excuse me', 'Sorry'],
  },
  {
    id: 'a1-g4', level: 'A1', category: 'Greetings', type: 'phrase',
    german: 'Danke schön', pronunciation: '/ˈdaŋkə ˌʃøːn/',
    english: 'Thank you very much',
    hint: 'A polite expression of gratitude.',
    exampleDe: 'Danke schön für Ihre Hilfe.',
    exampleEn: 'Thank you very much for your help.',
    distractors: ['Good evening', 'Please', 'Excuse me'],
  },
  {
    id: 'a1-g5', level: 'A1', category: 'Greetings', type: 'phrase',
    german: 'Entschuldigung', pronunciation: '/ɛntˈʃʊldɪɡʊŋ/',
    english: 'Excuse me / Sorry',
    hint: 'Used to get someone\'s attention or to apologise.',
    exampleDe: 'Entschuldigung, wo ist der Bahnhof?',
    exampleEn: 'Excuse me, where is the train station?',
    distractors: ['Thank you', 'Good morning', 'Please'],
  },

  // ─── A1 · COLORS ───
  {
    id: 'a1-c1', level: 'A1', category: 'Colors', type: 'adjective',
    german: 'rot', pronunciation: '/roːt/',
    english: 'red',
    hint: 'The colour of fire engines and ripe tomatoes.',
    exampleDe: 'Das Auto ist rot.',
    exampleEn: 'The car is red.',
    distractors: ['blue', 'green', 'yellow'],
  },
  {
    id: 'a1-c2', level: 'A1', category: 'Colors', type: 'adjective',
    german: 'blau', pronunciation: '/blaʊ/',
    english: 'blue',
    hint: 'The colour of the sky and the ocean.',
    exampleDe: 'Der Himmel ist blau.',
    exampleEn: 'The sky is blue.',
    distractors: ['red', 'green', 'black'],
  },
  {
    id: 'a1-c3', level: 'A1', category: 'Colors', type: 'adjective',
    german: 'grün', pronunciation: '/ɡrYːn/',
    english: 'green',
    hint: 'The colour of grass and leaves.',
    exampleDe: 'Das Gras ist grün.',
    exampleEn: 'The grass is green.',
    distractors: ['yellow', 'blue', 'white'],
  },
  {
    id: 'a1-c4', level: 'A1', category: 'Colors', type: 'adjective',
    german: 'schwarz', pronunciation: '/ʃvarts/',
    english: 'black',
    hint: 'The darkest colour; the colour of night.',
    exampleDe: 'Die Katze ist schwarz.',
    exampleEn: 'The cat is black.',
    distractors: ['white', 'grey', 'purple'],
  },
  {
    id: 'a1-c5', level: 'A1', category: 'Colors', type: 'adjective',
    german: 'weiß', pronunciation: '/vaɪs/',
    english: 'white',
    hint: 'The colour of snow and milk.',
    exampleDe: 'Der Schnee ist weiß.',
    exampleEn: 'The snow is white.',
    distractors: ['black', 'grey', 'red'],
  },
  {
    id: 'a1-c6', level: 'A1', category: 'Colors', type: 'adjective',
    german: 'gelb', pronunciation: '/ɡɛlp/',
    english: 'yellow',
    hint: 'The colour of the sun and bananas.',
    exampleDe: 'Die Banane ist gelb.',
    exampleEn: 'The banana is yellow.',
    distractors: ['green', 'orange', 'blue'],
  },

  // ─── A1 · FAMILY ───
  {
    id: 'a1-f1', level: 'A1', category: 'Family', type: 'noun',
    article: 'die', german: 'Mutter', pronunciation: '/ˈmʊtɐ/',
    english: 'mother',
    hint: 'The female parent in a family.',
    exampleDe: 'Meine Mutter kocht sehr gut.',
    exampleEn: 'My mother cooks very well.',
    distractors: ['father', 'sister', 'grandmother'],
  },
  {
    id: 'a1-f2', level: 'A1', category: 'Family', type: 'noun',
    article: 'der', german: 'Vater', pronunciation: '/ˈfaːtɐ/',
    english: 'father',
    hint: 'The male parent in a family.',
    exampleDe: 'Mein Vater arbeitet in Berlin.',
    exampleEn: 'My father works in Berlin.',
    distractors: ['mother', 'brother', 'grandfather'],
  },
  {
    id: 'a1-f3', level: 'A1', category: 'Family', type: 'noun',
    article: 'die', german: 'Schwester', pronunciation: '/ˈʃvɛstɐ/',
    english: 'sister',
    hint: 'A female sibling.',
    exampleDe: 'Meine Schwester ist 15 Jahre alt.',
    exampleEn: 'My sister is 15 years old.',
    distractors: ['brother', 'mother', 'aunt'],
  },
  {
    id: 'a1-f4', level: 'A1', category: 'Family', type: 'noun',
    article: 'der', german: 'Bruder', pronunciation: '/ˈbruːdɐ/',
    english: 'brother',
    hint: 'A male sibling.',
    exampleDe: 'Ich habe einen Bruder.',
    exampleEn: 'I have a brother.',
    distractors: ['sister', 'father', 'uncle'],
  },
  {
    id: 'a1-f5', level: 'A1', category: 'Family', type: 'noun',
    article: 'das', german: 'Kind', pronunciation: '/kɪnt/',
    english: 'child',
    hint: 'A young person, son or daughter.',
    exampleDe: 'Das Kind spielt im Garten.',
    exampleEn: 'The child is playing in the garden.',
    distractors: ['adult', 'parent', 'baby'],
  },

  // ─── A1 · FOOD & DRINK ───
  {
    id: 'a1-fd1', level: 'A1', category: 'Food & Drink', type: 'noun',
    article: 'das', german: 'Brot', pronunciation: '/broːt/',
    english: 'bread',
    hint: 'A baked staple food made from dough. Germany is famous for its many varieties.',
    exampleDe: 'Ich esse Brot zum Frühstück.',
    exampleEn: 'I eat bread for breakfast.',
    distractors: ['butter', 'cheese', 'cake'],
  },
  {
    id: 'a1-fd2', level: 'A1', category: 'Food & Drink', type: 'noun',
    article: 'das', german: 'Wasser', pronunciation: '/ˈvasɐ/',
    english: 'water',
    hint: 'The clear liquid we drink every day.',
    exampleDe: 'Kann ich bitte ein Glas Wasser haben?',
    exampleEn: 'Can I have a glass of water, please?',
    distractors: ['juice', 'milk', 'tea'],
  },
  {
    id: 'a1-fd3', level: 'A1', category: 'Food & Drink', type: 'noun',
    article: 'der', german: 'Kaffee', pronunciation: '/ˈkafe/',
    english: 'coffee',
    hint: 'A hot drink brewed from roasted beans.',
    exampleDe: 'Ich trinke morgens immer Kaffee.',
    exampleEn: 'I always drink coffee in the morning.',
    distractors: ['tea', 'juice', 'milk'],
  },
  {
    id: 'a1-fd4', level: 'A1', category: 'Food & Drink', type: 'noun',
    article: 'der', german: 'Apfel', pronunciation: '/ˈapfəl/',
    english: 'apple',
    hint: 'A round fruit, often red or green.',
    exampleDe: 'Er isst jeden Tag einen Apfel.',
    exampleEn: 'He eats an apple every day.',
    distractors: ['banana', 'orange', 'pear'],
  },
  {
    id: 'a1-fd5', level: 'A1', category: 'Food & Drink', type: 'noun',
    article: 'die', german: 'Milch', pronunciation: '/mɪlç/',
    english: 'milk',
    hint: 'A white liquid produced by cows, used in coffee and cereal.',
    exampleDe: 'Kinder trinken viel Milch.',
    exampleEn: 'Children drink a lot of milk.',
    distractors: ['water', 'juice', 'beer'],
  },
  {
    id: 'a1-fd6', level: 'A1', category: 'Food & Drink', type: 'noun',
    article: 'das', german: 'Ei', pronunciation: '/aɪ/',
    english: 'egg',
    hint: 'Laid by hens and used in cooking and baking.',
    exampleDe: 'Ich koche zwei Eier zum Frühstück.',
    exampleEn: 'I cook two eggs for breakfast.',
    distractors: ['butter', 'cheese', 'meat'],
  },

  // ─── A1 · HOUSEHOLD ───
  {
    id: 'a1-h1', level: 'A1', category: 'Household', type: 'noun',
    article: 'das', german: 'Handtuch', pronunciation: '/ˈhantˌtuːx/',
    english: 'towel',
    hint: 'You use this to dry yourself after a shower.',
    exampleDe: 'Das Handtuch hängt im Bad.',
    exampleEn: 'The towel is hanging in the bathroom.',
    distractors: ['pillow', 'blanket', 'curtain'],
  },
  {
    id: 'a1-h2', level: 'A1', category: 'Household', type: 'noun',
    article: 'der', german: 'Tisch', pronunciation: '/tɪʃ/',
    english: 'table',
    hint: 'A flat surface with legs where you eat or work.',
    exampleDe: 'Das Essen steht auf dem Tisch.',
    exampleEn: 'The food is on the table.',
    distractors: ['chair', 'cupboard', 'shelf'],
  },
  {
    id: 'a1-h3', level: 'A1', category: 'Household', type: 'noun',
    article: 'der', german: 'Stuhl', pronunciation: '/ʃtuːl/',
    english: 'chair',
    hint: 'A piece of furniture you sit on.',
    exampleDe: 'Bitte setz dich auf den Stuhl.',
    exampleEn: 'Please sit on the chair.',
    distractors: ['table', 'sofa', 'stool'],
  },
  {
    id: 'a1-h4', level: 'A1', category: 'Household', type: 'noun',
    article: 'das', german: 'Bett', pronunciation: '/bɛt/',
    english: 'bed',
    hint: 'Furniture for sleeping in at night.',
    exampleDe: 'Ich gehe um 10 Uhr ins Bett.',
    exampleEn: 'I go to bed at 10 o\'clock.',
    distractors: ['sofa', 'chair', 'wardrobe'],
  },
  {
    id: 'a1-h5', level: 'A1', category: 'Household', type: 'noun',
    article: 'die', german: 'Küche', pronunciation: '/ˈkYçə/',
    english: 'kitchen',
    hint: 'The room where you cook food.',
    exampleDe: 'Meine Mutter ist in der Küche.',
    exampleEn: 'My mother is in the kitchen.',
    distractors: ['bathroom', 'bedroom', 'living room'],
  },
  {
    id: 'a1-h6', level: 'A1', category: 'Household', type: 'noun',
    article: 'die', german: 'Tür', pronunciation: '/tyːɐ/',
    english: 'door',
    hint: 'You open and close this to enter or leave a room.',
    exampleDe: 'Bitte mach die Tür zu.',
    exampleEn: 'Please close the door.',
    distractors: ['window', 'wall', 'floor'],
  },

  // ─── A1 · BODY ───
  {
    id: 'a1-b1', level: 'A1', category: 'Body', type: 'noun',
    article: 'der', german: 'Kopf', pronunciation: '/kɔpf/',
    english: 'head',
    hint: 'The part of your body above your neck.',
    exampleDe: 'Ich habe Kopfschmerzen.',
    exampleEn: 'I have a headache.',
    distractors: ['hand', 'foot', 'back'],
  },
  {
    id: 'a1-b2', level: 'A1', category: 'Body', type: 'noun',
    article: 'die', german: 'Hand', pronunciation: '/hant/',
    english: 'hand',
    hint: 'At the end of your arm, with five fingers.',
    exampleDe: 'Bitte waschen Sie Ihre Hände.',
    exampleEn: 'Please wash your hands.',
    distractors: ['foot', 'arm', 'leg'],
  },
  {
    id: 'a1-b3', level: 'A1', category: 'Body', type: 'noun',
    article: 'das', german: 'Auge', pronunciation: '/ˈaʊɡə/',
    english: 'eye',
    hint: 'You use this organ to see.',
    exampleDe: 'Sie hat blaue Augen.',
    exampleEn: 'She has blue eyes.',
    distractors: ['ear', 'nose', 'mouth'],
  },

  // ─── A1 · CLOTHING ───
  {
    id: 'a1-cl1', level: 'A1', category: 'Clothing', type: 'noun',
    article: 'das', german: 'Hemd', pronunciation: '/hɛmt/',
    english: 'shirt',
    hint: 'A garment worn on the upper body, usually with a collar.',
    exampleDe: 'Er trägt ein weißes Hemd.',
    exampleEn: 'He wears a white shirt.',
    distractors: ['trousers', 'jacket', 'skirt'],
  },
  {
    id: 'a1-cl2', level: 'A1', category: 'Clothing', type: 'noun',
    article: 'die', german: 'Hose', pronunciation: '/ˈhoːzə/',
    english: 'trousers',
    hint: 'A garment covering the lower body with two separate legs.',
    exampleDe: 'Ich brauche eine neue Hose.',
    exampleEn: 'I need new trousers.',
    distractors: ['shirt', 'dress', 'sock'],
  },
  {
    id: 'a1-cl3', level: 'A1', category: 'Clothing', type: 'noun',
    article: 'der', german: 'Schuh', pronunciation: '/ʃuː/',
    english: 'shoe',
    hint: 'Worn on the foot for protection and comfort.',
    exampleDe: 'Ihre Schuhe sind sehr schön.',
    exampleEn: 'Her shoes are very nice.',
    distractors: ['sock', 'boot', 'hat'],
  },
  {
    id: 'a1-cl4', level: 'A1', category: 'Clothing', type: 'noun',
    article: 'die', german: 'Jacke', pronunciation: '/ˈjakə/',
    english: 'jacket',
    hint: 'Worn over other clothes, often to keep warm.',
    exampleDe: 'Es ist kalt — zieh eine Jacke an!',
    exampleEn: 'It is cold — put on a jacket!',
    distractors: ['coat', 'shirt', 'scarf'],
  },

  // ─── A1 · NUMBERS ───
  {
    id: 'a1-n1', level: 'A1', category: 'Numbers', type: 'noun',
    german: 'zwanzig', pronunciation: '/ˈtsvantsiç/',
    english: 'twenty',
    hint: 'Two tens.',
    exampleDe: 'Ich bin zwanzig Jahre alt.',
    exampleEn: 'I am twenty years old.',
    distractors: ['twelve', 'thirty', 'two'],
  },
  {
    id: 'a1-n2', level: 'A1', category: 'Numbers', type: 'noun',
    german: 'hundert', pronunciation: '/ˈhʊndɐt/',
    english: 'hundred',
    hint: 'Ten times ten.',
    exampleDe: 'Das kostet hundert Euro.',
    exampleEn: 'That costs a hundred euros.',
    distractors: ['thousand', 'fifty', 'ten'],
  },

  // ─── A2 · TRAVEL ───
  {
    id: 'a2-t1', level: 'A2', category: 'Travel', type: 'noun',
    article: 'der', german: 'Bahnhof', pronunciation: '/ˈbaːnˌhoːf/',
    english: 'train station',
    hint: 'Where you go to catch a train.',
    exampleDe: 'Wo ist der Bahnhof?',
    exampleEn: 'Where is the train station?',
    distractors: ['airport', 'bus stop', 'harbour'],
  },
  {
    id: 'a2-t2', level: 'A2', category: 'Travel', type: 'noun',
    article: 'das', german: 'Flugzeug', pronunciation: '/ˈfluːkˌtsɔʏk/',
    english: 'airplane',
    hint: 'A vehicle with wings that flies through the sky.',
    exampleDe: 'Das Flugzeug landet in München.',
    exampleEn: 'The airplane is landing in Munich.',
    distractors: ['train', 'ship', 'bus'],
  },
  {
    id: 'a2-t3', level: 'A2', category: 'Travel', type: 'noun',
    article: 'das', german: 'Ticket', pronunciation: '/ˈtɪkɪt/',
    english: 'ticket',
    hint: 'A piece of paper or card that allows entry or travel.',
    exampleDe: 'Ich habe mein Ticket vergessen.',
    exampleEn: 'I forgot my ticket.',
    distractors: ['passport', 'luggage', 'map'],
  },
  {
    id: 'a2-t4', level: 'A2', category: 'Travel', type: 'noun',
    article: 'das', german: 'Hotel', pronunciation: '/hoˈtɛl/',
    english: 'hotel',
    hint: 'A building where you pay to sleep while travelling.',
    exampleDe: 'Wir übernachten in einem Hotel.',
    exampleEn: 'We are staying overnight in a hotel.',
    distractors: ['restaurant', 'museum', 'theatre'],
  },
  {
    id: 'a2-t5', level: 'A2', category: 'Travel', type: 'noun',
    article: 'der', german: 'Reisepass', pronunciation: '/ˈʁaɪzəˌpas/',
    english: 'passport',
    hint: 'An official document needed for international travel.',
    exampleDe: 'Zeigen Sie mir bitte Ihren Reisepass.',
    exampleEn: 'Please show me your passport.',
    distractors: ['ticket', 'visa', 'luggage'],
  },
  {
    id: 'a2-t6', level: 'A2', category: 'Travel', type: 'noun',
    article: 'der', german: 'Koffer', pronunciation: '/ˈkɔfɐ/',
    english: 'suitcase',
    hint: 'A large bag with a handle used for packing clothes when you travel.',
    exampleDe: 'Mein Koffer ist sehr schwer.',
    exampleEn: 'My suitcase is very heavy.',
    distractors: ['bag', 'backpack', 'wallet'],
  },

  // ─── A2 · SHOPPING ───
  {
    id: 'a2-sh1', level: 'A2', category: 'Shopping', type: 'noun',
    article: 'der', german: 'Preis', pronunciation: '/pʁaɪs/',
    english: 'price',
    hint: 'How much something costs.',
    exampleDe: 'Was ist der Preis für dieses Hemd?',
    exampleEn: 'What is the price for this shirt?',
    distractors: ['discount', 'receipt', 'size'],
  },
  {
    id: 'a2-sh2', level: 'A2', category: 'Shopping', type: 'adjective',
    german: 'billig', pronunciation: '/ˈbɪlɪç/',
    english: 'cheap',
    hint: 'Costs very little money.',
    exampleDe: 'Das ist sehr billig!',
    exampleEn: 'That is very cheap!',
    distractors: ['expensive', 'big', 'heavy'],
  },
  {
    id: 'a2-sh3', level: 'A2', category: 'Shopping', type: 'adjective',
    german: 'teuer', pronunciation: '/ˈtɔʏɐ/',
    english: 'expensive',
    hint: 'Costs a lot of money.',
    exampleDe: 'Das Auto ist sehr teuer.',
    exampleEn: 'The car is very expensive.',
    distractors: ['cheap', 'small', 'light'],
  },
  {
    id: 'a2-sh4', level: 'A2', category: 'Shopping', type: 'verb',
    german: 'bezahlen', pronunciation: '/bəˈtsaːlən/',
    english: 'to pay',
    hint: 'To give money for something.',
    exampleDe: 'Wie möchten Sie bezahlen?',
    exampleEn: 'How would you like to pay?',
    distractors: ['to buy', 'to sell', 'to return'],
  },
  {
    id: 'a2-sh5', level: 'A2', category: 'Shopping', type: 'noun',
    article: 'die', german: 'Größe', pronunciation: '/ˈɡrøːsə/',
    english: 'size',
    hint: 'How big or small something is — important when buying clothes.',
    exampleDe: 'Welche Größe haben Sie?',
    exampleEn: 'What size are you?',
    distractors: ['colour', 'price', 'style'],
  },
  {
    id: 'a2-sh6', level: 'A2', category: 'Shopping', type: 'noun',
    article: 'der', german: 'Rabatt', pronunciation: '/ʁaˈbat/',
    english: 'discount',
    hint: 'A reduction in price.',
    exampleDe: 'Gibt es einen Rabatt?',
    exampleEn: 'Is there a discount?',
    distractors: ['receipt', 'price', 'voucher'],
  },

  // ─── A2 · WEATHER ───
  {
    id: 'a2-w1', level: 'A2', category: 'Weather', type: 'noun',
    article: 'die', german: 'Sonne', pronunciation: '/ˈzɔnə/',
    english: 'sun',
    hint: 'The star at the centre of our solar system that gives light and warmth.',
    exampleDe: 'Die Sonne scheint heute.',
    exampleEn: 'The sun is shining today.',
    distractors: ['moon', 'cloud', 'rain'],
  },
  {
    id: 'a2-w2', level: 'A2', category: 'Weather', type: 'noun',
    article: 'der', german: 'Regen', pronunciation: '/ˈʁeːɡən/',
    english: 'rain',
    hint: 'Water falling from clouds.',
    exampleDe: 'Es gibt viel Regen im November.',
    exampleEn: 'There is a lot of rain in November.',
    distractors: ['snow', 'wind', 'fog'],
  },
  {
    id: 'a2-w3', level: 'A2', category: 'Weather', type: 'adjective',
    german: 'bewölkt', pronunciation: '/bəˈvœlkt/',
    english: 'cloudy',
    hint: 'When the sky is covered with clouds.',
    exampleDe: 'Heute ist es bewölkt.',
    exampleEn: 'Today it is cloudy.',
    distractors: ['sunny', 'windy', 'foggy'],
  },
  {
    id: 'a2-w4', level: 'A2', category: 'Weather', type: 'noun',
    article: 'der', german: 'Schnee', pronunciation: '/ʃneː/',
    english: 'snow',
    hint: 'Frozen water that falls from the sky in winter and is white.',
    exampleDe: 'Die Kinder spielen im Schnee.',
    exampleEn: 'The children are playing in the snow.',
    distractors: ['ice', 'rain', 'hail'],
  },

  // ─── A2 · HOBBIES ───
  {
    id: 'a2-hb1', level: 'A2', category: 'Hobbies', type: 'verb',
    german: 'lesen', pronunciation: '/ˈleːzən/',
    english: 'to read',
    hint: 'To look at written words and understand them.',
    exampleDe: 'Ich lese gerne Bücher.',
    exampleEn: 'I like to read books.',
    distractors: ['to write', 'to listen', 'to watch'],
  },
  {
    id: 'a2-hb2', level: 'A2', category: 'Hobbies', type: 'verb',
    german: 'schwimmen', pronunciation: '/ˈʃvɪmən/',
    english: 'to swim',
    hint: 'To move through water using arms and legs.',
    exampleDe: 'Wir schwimmen jeden Sonntag.',
    exampleEn: 'We swim every Sunday.',
    distractors: ['to run', 'to cycle', 'to dance'],
  },
  {
    id: 'a2-hb3', level: 'A2', category: 'Hobbies', type: 'verb',
    german: 'kochen', pronunciation: '/ˈkɔxən/',
    english: 'to cook',
    hint: 'To prepare food using heat.',
    exampleDe: 'Er kocht jeden Abend für die Familie.',
    exampleEn: 'He cooks for the family every evening.',
    distractors: ['to bake', 'to eat', 'to clean'],
  },
  {
    id: 'a2-hb4', level: 'A2', category: 'Hobbies', type: 'verb',
    german: 'reisen', pronunciation: '/ˈʁaɪzən/',
    english: 'to travel',
    hint: 'To go from one place to another, often to a far destination.',
    exampleDe: 'Ich reise gerne nach Europa.',
    exampleEn: 'I like to travel in Europe.',
    distractors: ['to drive', 'to walk', 'to fly'],
  },
  {
    id: 'a2-hb5', level: 'A2', category: 'Hobbies', type: 'verb',
    german: 'tanzen', pronunciation: '/ˈtantsən/',
    english: 'to dance',
    hint: 'To move your body rhythmically to music.',
    exampleDe: 'Sie tanzt sehr gerne.',
    exampleEn: 'She loves to dance.',
    distractors: ['to sing', 'to play', 'to jump'],
  },

  // ─── A2 · WORK ───
  {
    id: 'a2-wk1', level: 'A2', category: 'Work', type: 'noun',
    article: 'der', german: 'Beruf', pronunciation: '/bəˈʁuːf/',
    english: 'profession / job',
    hint: 'What someone does as their regular work or career.',
    exampleDe: 'Was ist Ihr Beruf?',
    exampleEn: 'What is your profession?',
    distractors: ['hobby', 'company', 'salary'],
  },
  {
    id: 'a2-wk2', level: 'A2', category: 'Work', type: 'noun',
    article: 'das', german: 'Büro', pronunciation: '/byˈʁoː/',
    english: 'office',
    hint: 'A room or building where people work at desks.',
    exampleDe: 'Ich arbeite in einem Büro in Berlin.',
    exampleEn: 'I work in an office in Berlin.',
    distractors: ['factory', 'shop', 'hospital'],
  },
  {
    id: 'a2-wk3', level: 'A2', category: 'Work', type: 'noun',
    article: 'das', german: 'Gehalt', pronunciation: '/ɡəˈhalt/',
    english: 'salary',
    hint: 'The money you receive regularly for your work.',
    exampleDe: 'Sein Gehalt ist sehr gut.',
    exampleEn: 'His salary is very good.',
    distractors: ['bonus', 'tax', 'rent'],
  },
  {
    id: 'a2-wk4', level: 'A2', category: 'Work', type: 'noun',
    article: 'der', german: 'Chef', pronunciation: '/ʃɛf/',
    english: 'boss / manager',
    hint: 'The person in charge at a workplace.',
    exampleDe: 'Mein Chef ist sehr nett.',
    exampleEn: 'My boss is very nice.',
    distractors: ['colleague', 'employee', 'customer'],
  },

  // ─── A2 · DIRECTIONS ───
  {
    id: 'a2-d1', level: 'A2', category: 'Directions', type: 'adverb',
    german: 'links', pronunciation: '/lɪŋks/',
    english: 'left',
    hint: 'The opposite direction to right.',
    exampleDe: 'Biegen Sie links ab.',
    exampleEn: 'Turn left.',
    distractors: ['right', 'straight ahead', 'back'],
  },
  {
    id: 'a2-d2', level: 'A2', category: 'Directions', type: 'adverb',
    german: 'rechts', pronunciation: '/ʁɛçts/',
    english: 'right',
    hint: 'The opposite direction to left.',
    exampleDe: 'Das Hotel ist rechts.',
    exampleEn: 'The hotel is on the right.',
    distractors: ['left', 'straight ahead', 'behind'],
  },
  {
    id: 'a2-d3', level: 'A2', category: 'Directions', type: 'adverb',
    german: 'geradeaus', pronunciation: '/ɡəˈʁaːdəˌaʊs/',
    english: 'straight ahead',
    hint: 'Continue forward without turning.',
    exampleDe: 'Gehen Sie geradeaus bis zur Ampel.',
    exampleEn: 'Go straight ahead to the traffic lights.',
    distractors: ['left', 'right', 'backward'],
  },
  {
    id: 'a2-d4', level: 'A2', category: 'Directions', type: 'noun',
    article: 'die', german: 'Kreuzung', pronunciation: '/ˈkʁɔʏtsʊŋ/',
    english: 'crossroads / intersection',
    hint: 'Where two roads cross each other.',
    exampleDe: 'Biegen Sie an der Kreuzung links ab.',
    exampleEn: 'Turn left at the crossroads.',
    distractors: ['bridge', 'roundabout', 'motorway'],
  },

  // ─── A2 · TIME ───
  {
    id: 'a2-tm1', level: 'A2', category: 'Time', type: 'adverb',
    german: 'gestern', pronunciation: '/ˈɡɛstɐn/',
    english: 'yesterday',
    hint: 'The day before today.',
    exampleDe: 'Gestern war ich krank.',
    exampleEn: 'Yesterday I was ill.',
    distractors: ['today', 'tomorrow', 'last week'],
  },
  {
    id: 'a2-tm2', level: 'A2', category: 'Time', type: 'adverb',
    german: 'morgen', pronunciation: '/ˈmɔʁɡən/',
    english: 'tomorrow',
    hint: 'The day after today.',
    exampleDe: 'Morgen habe ich einen Termin.',
    exampleEn: 'Tomorrow I have an appointment.',
    distractors: ['yesterday', 'today', 'next week'],
  },
  {
    id: 'a2-tm3', level: 'A2', category: 'Time', type: 'adverb',
    german: 'manchmal', pronunciation: '/ˈmançˌmaːl/',
    english: 'sometimes',
    hint: 'Not always, not never — occasionally.',
    exampleDe: 'Ich esse manchmal Fast Food.',
    exampleEn: 'I sometimes eat fast food.',
    distractors: ['always', 'never', 'often'],
  },
  {
    id: 'a2-tm4', level: 'A2', category: 'Time', type: 'adverb',
    german: 'immer', pronunciation: '/ˈɪmɐ/',
    english: 'always',
    hint: 'At all times, without exception.',
    exampleDe: 'Er ist immer pünktlich.',
    exampleEn: 'He is always on time.',
    distractors: ['never', 'sometimes', 'rarely'],
  },

  // ─── A2 · HEALTH ───
  {
    id: 'a2-hl1', level: 'A2', category: 'Health', type: 'noun',
    article: 'der', german: 'Arzt', pronunciation: '/aːɐ̯tst/',
    english: 'doctor',
    hint: 'A person trained in medicine who treats sick people.',
    exampleDe: 'Ich muss zum Arzt gehen.',
    exampleEn: 'I have to go to the doctor.',
    distractors: ['nurse', 'dentist', 'pharmacist'],
  },
  {
    id: 'a2-hl2', level: 'A2', category: 'Health', type: 'noun',
    article: 'das', german: 'Krankenhaus', pronunciation: '/ˈkʁaŋkənˌhaʊs/',
    english: 'hospital',
    hint: 'A large building where ill people receive medical treatment.',
    exampleDe: 'Er ist im Krankenhaus.',
    exampleEn: 'He is in the hospital.',
    distractors: ['pharmacy', 'clinic', 'doctor\'s surgery'],
  },
  {
    id: 'a2-hl3', level: 'A2', category: 'Health', type: 'noun',
    article: 'die', german: 'Apotheke', pronunciation: '/apoˈteːkə/',
    english: 'pharmacy',
    hint: 'A shop where you buy medicines and health products.',
    exampleDe: 'Die Apotheke ist um die Ecke.',
    exampleEn: 'The pharmacy is around the corner.',
    distractors: ['hospital', 'supermarket', 'clinic'],
  },

  // ─── A2 · NATURE ───
  {
    id: 'a2-nt1', level: 'A2', category: 'Nature', type: 'noun',
    article: 'der', german: 'Wald', pronunciation: '/valt/',
    english: 'forest / woods',
    hint: 'A large area densely covered with trees.',
    exampleDe: 'Wir machen einen Spaziergang im Wald.',
    exampleEn: 'We are going for a walk in the forest.',
    distractors: ['park', 'garden', 'lake'],
  },
  {
    id: 'a2-nt2', level: 'A2', category: 'Nature', type: 'noun',
    article: 'der', german: 'Berg', pronunciation: '/bɛʁk/',
    english: 'mountain',
    hint: 'A very large natural elevation of the earth\'s surface.',
    exampleDe: 'Der Berg ist sehr hoch.',
    exampleEn: 'The mountain is very high.',
    distractors: ['hill', 'valley', 'river'],
  },
  {
    id: 'a2-nt3', level: 'A2', category: 'Nature', type: 'noun',
    article: 'der', german: 'Fluss', pronunciation: '/flʊs/',
    english: 'river',
    hint: 'A large natural stream of water flowing to the sea.',
    exampleDe: 'Der Rhein ist ein langer Fluss.',
    exampleEn: 'The Rhine is a long river.',
    distractors: ['lake', 'sea', 'stream'],
  },
];

export function getWordsByLevel(levels: CEFRLevel[]): VocabWord[] {
  return vocabulary.filter(w => levels.includes(w.level));
}

export function getWordsByCategory(category: WordCategory): VocabWord[] {
  return vocabulary.filter(w => w.category === category);
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const CATEGORIES_A1: WordCategory[] = [
  'Greetings', 'Colors', 'Family', 'Food & Drink', 'Household', 'Body', 'Clothing', 'Numbers',
];

export const CATEGORIES_A2: WordCategory[] = [
  'Travel', 'Shopping', 'Weather', 'Hobbies', 'Work', 'Directions', 'Time', 'Health', 'Nature',
];
