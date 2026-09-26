// Word enrichment — PRD v2 §4.1
//
// Generates {meaning, description, examples, grammar} for one word and caches
// the result in `de_word_ai`. The cache is global, not per user: a word means
// the same thing for everyone, so each word is generated at most once.
//
// The Anthropic key lives here as a function secret and never reaches the app
// bundle (PRD v2 D5).
//
// Deploy:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy word-ai

import Anthropic from 'npm:@anthropic-ai/sdk@^0.70.0';
import { z } from 'npm:zod@^3.23.8';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@^0.70.0/helpers/zod';
import { createClient } from 'npm:@supabase/supabase-js@^2.45.0';

const MODEL = 'claude-opus-5';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EnrichmentSchema = z.object({
  meaning: z.string().describe('One-line English meaning. No article, no punctuation at the end.'),
  description: z.string().describe('2-3 sentences on usage, register and nuance for a learner.'),
  examples: z.array(z.object({
    de: z.string().describe('Natural German sentence using the word.'),
    en: z.string().describe('English translation of the German sentence.'),
  })).describe('Exactly two examples.'),
  grammar: z.object({
    plural: z.string().nullable().describe('Nominative plural, nouns only.'),
    genitive: z.string().nullable().describe('Genitive singular, nouns only.'),
    auxiliary: z.string().nullable().describe('haben or sein, verbs only.'),
    past_participle: z.string().nullable().describe('Partizip II, verbs only.'),
    comparative: z.string().nullable().describe('Comparative, adjectives only.'),
    superlative: z.string().nullable().describe('Superlative, adjectives only.'),
  }).describe('Fields not applicable to this word type must be null.'),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'missing_authorization' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!supabaseUrl || !serviceKey) return json({ error: 'supabase_env_missing' }, 500);
  if (!anthropicKey) return json({ error: 'anthropic_key_missing' }, 500);

  // Service-role client, used only after the caller's JWT is verified below.
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: userData, error: userError } = await admin.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (userError || !userData.user) return json({ error: 'invalid_token' }, 401);

  let wordId: string;
  try {
    const body = await req.json();
    wordId = String(body.word_id ?? '');
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!wordId) return json({ error: 'word_id_required' }, 400);

  // 1. Cache hit — the common path, no model call.
  const { data: cached } = await admin
    .from('de_word_ai')
    .select('meaning, description, examples, grammar, model, generated_at')
    .eq('word_id', wordId)
    .maybeSingle();

  if (cached) return json({ ...cached, cached: true });

  // 2. Load the word so the prompt describes a real entry, not a bare string.
  const { data: word, error: wordError } = await admin
    .from('de_words')
    .select('id, german, article, english, word_type, level, category')
    .eq('id', wordId)
    .maybeSingle();

  if (wordError || !word) return json({ error: 'word_not_found' }, 404);

  // 3. Generate.
  const client = new Anthropic({ apiKey: anthropicKey });

  let parsed: z.infer<typeof EnrichmentSchema> | null = null;
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system:
        'You are a German lexicographer writing entries for a CEFR-aligned vocabulary app. ' +
        'Be precise about grammar. Examples must be natural, everyday German at or below the ' +
        "word's CEFR level, and must actually contain the headword. " +
        'Set grammar fields that do not apply to this word type to null — never invent a plural ' +
        'for a verb or an auxiliary for a noun.',
      messages: [{
        role: 'user',
        content:
          `Word: ${word.article ? word.article + ' ' : ''}${word.german}\n` +
          `Type: ${word.word_type}\n` +
          `Known English gloss: ${word.english}\n` +
          `CEFR level: ${word.level}\n` +
          `Topic: ${word.category}`,
      }],
      output_config: {
        effort: 'low', // A single lexicon entry — depth here buys nothing.
        format: zodOutputFormat(EnrichmentSchema),
      },
    });
    parsed = response.parsed_output;
  } catch (err) {
    console.error('anthropic error:', err);
    return json({ error: 'generation_failed' }, 502);
  }

  if (!parsed) return json({ error: 'generation_unparseable' }, 502);

  // 4. Cache for everyone. A failed write is not fatal — the caller still gets
  //    its answer; the next request simply regenerates.
  const { error: cacheError } = await admin.from('de_word_ai').upsert({
    word_id: wordId,
    meaning: parsed.meaning,
    description: parsed.description,
    examples: parsed.examples,
    grammar: parsed.grammar,
    model: MODEL,
    generated_at: new Date().toISOString(),
  }, { onConflict: 'word_id' });

  if (cacheError) console.warn('cache write failed:', cacheError.message);

  return json({ ...parsed, cached: false });
});
