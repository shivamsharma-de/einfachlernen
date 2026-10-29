// Camera word detection — PRD v2 §4.2, D4
//
// Claude vision reads German words off a photographed page and lemmatises them.
// This replaces the on-device ML Kit plan in design-spec.md §6.2 because ML Kit
// via a config plugin does not run in Expo Go, which is how this app is tested.
//
// The client-side boundary stays swappable (lib/ocr.ts), so ML Kit can take over
// later without the scan screen changing.
//
// Deploy:
//   supabase functions deploy scan-words

import Anthropic from 'npm:@anthropic-ai/sdk@^0.70.0';
import { z } from 'npm:zod@^3.23.8';
import { createClient } from 'npm:@supabase/supabase-js@^2.45.0';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
/** Anthropic rejects images over 5MB; base64 inflates by ~4/3. */
const MAX_BASE64_CHARS = 6_500_000;
/** Cheap abuse guard: scans per user per hour. */
const SCAN_LIMIT_PER_HOUR = 30;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ScanSchema = z.object({
  words: z.array(z.object({
    surface: z.string().describe('The word exactly as it appears on the page.'),
    lemma: z.string().describe('Dictionary form: nominative singular for nouns, infinitive for verbs.'),
    type: z.enum(['noun', 'verb', 'adjective', 'adverb', 'other']),
    article: z.enum(['der', 'die', 'das']).nullable().describe('Nouns only, else null.'),
  })),
  total_detected: z.number().describe('Total German words visible, including ones not listed.'),
});

/** The same shape as ScanSchema, as the JSON Schema the API enforces on the reply. */
const SCAN_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['words', 'total_detected'],
  properties: {
    words: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['surface', 'lemma', 'type', 'article'],
        properties: {
          surface: { type: 'string' },
          lemma: { type: 'string' },
          type: { type: 'string', enum: ['noun', 'verb', 'adjective', 'adverb', 'other'] },
          article: { anyOf: [{ type: 'string', enum: ['der', 'die', 'das'] }, { type: 'null' }] },
        },
      },
    },
    total_detected: { type: 'integer' },
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function mediaTypeOf(b64: string): 'image/jpeg' | 'image/png' {
  // JPEG base64 always starts /9j/; PNG starts iVBORw0.
  return b64.startsWith('iVBORw0') ? 'image/png' : 'image/jpeg';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'missing_authorization' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  // Model IDs come from the environment, never from this file (CLAUDE.md).
  const model = Deno.env.get('ANTHROPIC_MODEL_VISION');

  if (!supabaseUrl || !serviceKey) return json({ error: 'supabase_env_missing' }, 500);
  if (!anthropicKey) return json({ error: 'anthropic_key_missing' }, 500);
  if (!model) return json({ error: 'model_missing' }, 500);

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: userData, error: userError } = await admin.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (userError || !userData.user) return json({ error: 'invalid_token' }, 401);
  const userId = userData.user.id;

  let imageBase64: string;
  let level: string;
  try {
    const body = await req.json();
    imageBase64 = String(body.image_base64 ?? '');
    level = String(body.level ?? 'A1');
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  if (!imageBase64) return json({ error: 'image_required' }, 400);
  if (imageBase64.length > MAX_BASE64_CHARS) return json({ error: 'image_too_large' }, 413);
  if (!LEVELS.includes(level as typeof LEVELS[number])) return json({ error: 'invalid_level' }, 400);

  // Rate limit — vision calls are the expensive path.
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin
    .from('scan_results')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', hourAgo);

  if ((count ?? 0) >= SCAN_LIMIT_PER_HOUR) return json({ error: 'rate_limited' }, 429);

  // 1. Vision pass.
  const client = new Anthropic({ apiKey: anthropicKey });

  let parsed: z.infer<typeof ScanSchema> | null = null;
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4000,
      system:
        'You extract German vocabulary from photographs of printed text. ' +
        'List each distinct content word once, with its dictionary form. ' +
        'Skip function words (articles, pronouns, prepositions, conjunctions, auxiliaries). ' +
        'If a word is blurred or you cannot read it confidently, omit it — never guess. ' +
        'Report every German word you can see in total_detected, including the ones you omit.',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaTypeOf(imageBase64), data: imageBase64 },
          },
          { type: 'text', text: 'Extract the German vocabulary from this page.' },
        ],
      }],
      output_config: { format: { type: 'json_schema', schema: SCAN_JSON_SCHEMA } },
    });
    const text = response.content.find((block) => block.type === 'text');
    const checked = ScanSchema.safeParse(JSON.parse(text && text.type === 'text' ? text.text : 'null'));
    parsed = checked.success ? checked.data : null;
  } catch (err) {
    console.error('anthropic error:', err);
    return json({ error: 'vision_failed' }, 502);
  }

  if (!parsed) return json({ error: 'vision_unparseable' }, 502);

  // 2. Match lemmas against the words a learner can actually study: deck_words, which
  //    holds reviewed catalogue entries (and this user's own scan imports). Draft entries
  //    never reach a deck. Unmatched tokens are DROPPED, never guessed at (§6.2).
  const lemmas = [...new Set(parsed.words.map((w: { lemma: string }) => w.lemma))];
  const { data: matches } = await admin
    .from('deck_words')
    .select('id, german, article, english, word_type, level, thema')
    .in('german', lemmas);

  const matched: Array<{ level: string }> = matches ?? [];

  // 3. Only words strictly ABOVE the user's level are worth showing; the rest
  //    are counted so the status line can say how much was skipped.
  const userRank = LEVELS.indexOf(level as typeof LEVELS[number]);
  const above = matched.filter(
    (w) => LEVELS.indexOf(w.level as typeof LEVELS[number]) > userRank,
  );
  const atOrBelow = matched.length - above.length;

  const { data: saved } = await admin.from('scan_results').insert({
    user_id: userId,
    detected: above,
    total_detected: parsed.total_detected,
  }).select('id').maybeSingle();

  return json({
    scan_id: saved?.id ?? null,
    words: above,
    total_detected: parsed.total_detected,
    matched_count: matched.length,
    at_or_below_level: atOrBelow,
    unmatched: lemmas.length - matched.length,
  });
});
