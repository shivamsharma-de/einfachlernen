#!/usr/bin/env node
/**
 * Stage 06 — enrich the words that passed the gate.
 *
 *   node scripts/content/06_enrich.mjs [--limit=N] [--only-derived] [--yes]
 *
 * Article, plural/forms, English meaning, two example sentences and a thema.
 * This is the expensive pass, which is exactly why the cheap gate runs first:
 * a word that failed agreement is not worth generating examples for.
 *
 * Token efficiency: 20 words per request (output is the costly side here, so
 * the batch is smaller than stage 03's 50), Haiku, effort low. Resumable.
 */
import { existsSync, appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STAGE, arg, ask, chunk, confirmSpend, pmap, requireKey, stage } from './_lib.mjs';

const MODEL = 'claude-haiku-4-5';
const PER_REQUEST = 20;
const OUT = join(STAGE, '06_enriched.jsonl');

const THEMEN = [
  'Alltag', 'Arbeit und Beruf', 'Bildung und Ausbildung', 'Essen und Trinken',
  'Gesundheit', 'Reisen und Verkehr', 'Wohnen', 'Gesellschaft und Umwelt',
];

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['w'],
  properties: {
    w: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['l', 'a', 't', 'e', 'pl', 'pp', 'aux', 'de', 'en', 'th'],
        properties: {
          l: { type: 'string', description: 'the lemma exactly as given' },
          a: { type: ['string', 'null'], enum: ['der', 'die', 'das', null], description: 'article, nouns only, else null' },
          t: { type: 'string', enum: ['noun', 'verb', 'adjective', 'adverb', 'other'] },
          e: { type: 'string', description: 'concise English meaning, one line' },
          pl: { type: ['string', 'null'], description: 'plural form, nouns only, else null' },
          pp: { type: ['string', 'null'], description: 'Partizip II, verbs only, else null' },
          aux: { type: ['string', 'null'], enum: ['haben', 'sein', null], description: 'auxiliary, verbs only, else null' },
          de: { type: 'string', description: 'example sentence in natural German containing the word' },
          en: { type: 'string', description: 'English translation of the example' },
          th: { type: 'string', enum: THEMEN },
        },
      },
    },
  },
};

const SYSTEM =
  'You are a German lexicographer writing dictionary entries for a CEFR-aligned vocabulary app. ' +
  'Be precise about grammar: set fields that do not apply to a word type to null — never invent a ' +
  'plural for a verb or an auxiliary for a noun. Each example must be natural everyday German that ' +
  'actually contains the headword (an inflected form is fine) and stays at or below the word\'s own ' +
  'level. Return one entry for every lemma given, in the same order.';

await stage('06_enrich', async () => {
  requireKey();
  const levelled = readJsonl(join(STAGE, '04_levelled.jsonl'));
  const pool = arg('only-derived') !== null && arg('only-derived') !== false
    ? levelled.filter((r) => r.level_source === 'derived')
    : levelled;
  const limit = arg('limit') ? Number(arg('limit')) : pool.length;
  const target = pool.slice(0, limit);

  const have = new Set();
  if (existsSync(OUT)) {
    for (const line of readFileSync(OUT, 'utf8').split('\n').filter(Boolean)) {
      have.add(JSON.parse(line).lemma.toLowerCase());
    }
  }
  const todo = target.filter((r) => !have.has(r.lemma.toLowerCase()));
  const chunks = chunk(todo, PER_REQUEST);
  // ~500 input, ~20×170 output tokens per request.
  const estUsd = (chunks.length * 500 * 1.0 + chunks.length * 3400 * 5.0) / 1e6;

  if (todo.length === 0) {
    console.log('  nothing to do — everything already enriched');
  } else if (
    !(await confirmSpend({
      words: todo.length,
      requests: chunks.length,
      estUsd,
      what: `Stage 06: enrichment, ${PER_REQUEST} words per request, ${MODEL}`,
    }))
  ) {
    return { status: 'pending', note: 'awaiting cost confirmation' };
  }

  let cost = 0;
  let input = 0;
  let output = 0;

  await pmap(
    chunks,
    12,
    async (batch) => {
      const prompt = batch.map((b) => `${b.lemma} (${b.word_type}, ${b.level})`).join('\n');
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const r = await ask({
            model: MODEL,
            system: SYSTEM,
            user: prompt,
            schema: SCHEMA,
            maxTokens: 8000,
            effort: 'low', // dictionary entries; depth buys nothing here
          });
          cost += r.cost;
          input += r.usage.input_tokens ?? 0;
          output += r.usage.output_tokens ?? 0;
          const byLemma = new Map(batch.map((b) => [b.lemma.toLowerCase(), b]));
          for (const w of r.parsed?.w ?? []) {
            const base = byLemma.get(String(w.l).toLowerCase());
            if (!base) continue;
            appendFileSync(
              OUT,
              JSON.stringify({
                ...base,
                lemma: base.lemma,
                article: w.a ?? null,
                word_type: w.t ?? base.word_type,
                english: w.e,
                forms: {
                  ...(w.pl ? { plural: w.pl } : {}),
                  ...(w.pp ? { past_participle: w.pp } : {}),
                  ...(w.aux ? { auxiliary: w.aux } : {}),
                },
                example_de: w.de,
                example_en: w.en,
                thema: w.th,
              }) + '\n',
            );
          }
          return;
        } catch (err) {
          const retryable = /429|rate|overload|529|timeout|ECONN/i.test(String(err?.message ?? err));
          if (!retryable || attempt === 3) throw err;
          await new Promise((res) => setTimeout(res, 2000 * 2 ** attempt));
        }
      }
    },
    'enriching',
  );

  const total = readFileSync(OUT, 'utf8').split('\n').filter(Boolean).length;
  console.log(`  ${total} enriched · $${cost.toFixed(2)} this run`);
  return {
    in: target.length,
    out: total,
    model: MODEL,
    tokens: { input, output },
    costUsd: Number(cost.toFixed(4)),
    note: `${PER_REQUEST} words/request, effort low`,
  };
});

function readJsonl(p) {
  return readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
