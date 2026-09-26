#!/usr/bin/env node
/**
 * Stage 03 — the model pass: lemma, part of speech, teachability, CEFR level.
 *
 *   node scripts/content/03_level.mjs [--limit=N] [--samples=3] [--yes]
 *
 * One call does four jobs at once — lemmatise, tag, filter proper nouns, and
 * level — because the model is already reading the word; separate passes would
 * re-send the same input three more times.
 *
 * Token efficiency (brief §2c):
 *   - 50 words per request, so the system prompt and schema amortize: ~12 input
 *     tokens per word instead of ~270
 *   - short JSON keys, because output is the expensive side
 *   - 3 samples per word: the VARIANCE is the signal, not the answer
 *   - Haiku, no thinking — this is labelling, not reasoning
 *
 * Resumable: completed chunks are appended to 03_levels.jsonl and skipped on
 * a re-run.
 */
import { existsSync, appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STAGE, arg, ask, chunk, confirmSpend, pmap, requireKey, stage } from './_lib.mjs';

const MODEL = 'claude-haiku-4-5';
const PER_REQUEST = 50;
const OUT = join(STAGE, '03_levels.jsonl');

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
        required: ['s', 'l', 'p', 'v', 'k'],
        properties: {
          s: { type: 'string', description: 'the surface form exactly as given' },
          l: { type: 'string', description: 'dictionary form: nominative singular for nouns, infinitive for verbs' },
          p: { type: 'string', enum: ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'conjunction', 'preposition', 'pronoun', 'number', 'interjection'] },
          v: { type: 'string', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
          k: { type: 'boolean', description: 'true if this is general vocabulary worth teaching; false for proper nouns, names, places, brands, abbreviations, foreign words, fragments' },
        },
      },
    },
  },
};

const SYSTEM =
  'You are a German lexicographer levelling vocabulary for a CEFR-aligned learning app. ' +
  'For each surface form give its dictionary form, part of speech, the CEFR level at which a ' +
  'learner of German typically needs it, and whether it is general vocabulary worth teaching. ' +
  'Mark k=false for proper nouns, personal and place names, brands, abbreviations, foreign ' +
  'words and fragments. Judge the level on how early a learner needs the word, not on how ' +
  'hard it looks. Return one entry for every surface form given, in the same order.';

await stage('03_level', async () => {
  requireKey();
  const rows = readJsonl(join(STAGE, '02_signals.jsonl'));
  const limit = arg('limit') ? Number(arg('limit')) : rows.length;
  const samples = Number(arg('samples', 3));
  const target = rows.slice(0, limit);

  // Resume: skip surfaces already carrying the full sample count.
  const have = new Map();
  if (existsSync(OUT)) {
    for (const line of readFileSync(OUT, 'utf8').split('\n').filter(Boolean)) {
      const r = JSON.parse(line);
      have.set(r.s, (have.get(r.s) ?? 0) + 1);
    }
  }
  const todo = target.filter((r) => (have.get(r.surface) ?? 0) < samples);

  const chunks = chunk(todo.map((r) => r.surface), PER_REQUEST);
  const requests = chunks.length * samples;
  // ~600 input and ~50×18 output tokens per request, at Haiku's $1/$5 per MTok.
  const estUsd = (requests * 600 * 1.0 + requests * 900 * 5.0) / 1e6;

  if (todo.length === 0) {
    console.log('  nothing to do — all words already have their samples');
  } else if (
    !(await confirmSpend({
      words: todo.length,
      requests,
      estUsd,
      what: `Stage 03: ${samples} level samples per word, ${PER_REQUEST} words per request, ${MODEL}`,
    }))
  ) {
    return { status: 'pending', note: 'awaiting cost confirmation' };
  }

  let cost = 0;
  let input = 0;
  let output = 0;
  const jobs = [];
  for (let s = 0; s < samples; s++) for (const cwords of chunks) jobs.push({ s, cwords });

  await pmap(
    jobs,
    12,
    async ({ s, cwords }) => {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const r = await ask({
            model: MODEL,
            system: SYSTEM,
            // A different framing per sample, so the three draws are genuinely
            // independent rather than the same question asked three times.
            user:
              s === 0
                ? cwords.join(', ')
                : s === 1
                  ? `Level these for a learner working towards the exam at each level:\n${cwords.join(', ')}`
                  : `A teacher is sorting these into course levels. Where does each belong?\n${cwords.join(', ')}`,
            schema: SCHEMA,
            maxTokens: 8000,
          });
          cost += r.cost;
          input += r.usage.input_tokens ?? 0;
          output += r.usage.output_tokens ?? 0;
          for (const w of r.parsed?.w ?? []) {
            appendFileSync(OUT, JSON.stringify({ s: w.s, l: w.l, p: w.p, v: w.v, k: w.k, n: s }) + '\n');
          }
          return;
        } catch (err) {
          const retryable = /429|rate|overload|529|timeout|ECONN/i.test(String(err?.message ?? err));
          if (!retryable || attempt === 3) throw err;
          await new Promise((res) => setTimeout(res, 2000 * 2 ** attempt));
        }
      }
    },
    'level samples',
  );

  const total = readFileSync(OUT, 'utf8').split('\n').filter(Boolean).length;
  console.log(`  ${total} sample rows · $${cost.toFixed(2)} this run`);
  return {
    in: target.length,
    out: total,
    model: MODEL,
    tokens: { input, output },
    costUsd: Number(cost.toFixed(4)),
    note: `${samples} samples/word, ${PER_REQUEST} words/request`,
  };
});

// local import to keep the top of the file tidy
function readJsonl(p) {
  return readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
