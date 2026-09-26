#!/usr/bin/env node
/**
 * Re-classify rows typed 'other' into the fine-grained word_type the schema
 * actually allows.
 *
 *   node scripts/content/fix_word_types.mjs --yes
 *
 * Stages 03 and 06 used a coarse five-value enum (noun/verb/adjective/adverb/
 * other), but de_words has had a CHECK constraint since migration 002 listing
 * phrase, conjunction, preposition, pronoun, number and interjection. 'other'
 * is not in it, so the seed failed.
 *
 * Widening the constraint would have been the lazy fix. These are ~176 function
 * words and the finer labels are genuinely more useful on a card, so they get
 * classified properly instead. Stage 03 and 06 now emit the full set, so future
 * runs never need this.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { STAGE, arg, ask, chunk, confirmSpend, pmap, requireKey, stage } from './_lib.mjs';

const MODEL = 'claude-haiku-4-5';
const FILE = join(STAGE, '07_validated.jsonl');

/** Exactly the values de_words_word_type_check allows. */
const TYPES = ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'conjunction',
               'preposition', 'pronoun', 'number', 'interjection'];

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
        required: ['l', 't'],
        properties: { l: { type: 'string' }, t: { type: 'string', enum: TYPES } },
      },
    },
  },
};

await stage('fix_word_types', async () => {
  requireKey();
  const rows = readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const bad = rows.filter((r) => !TYPES.includes(r.word_type));
  if (!bad.length) {
    console.log('  nothing to reclassify');
    return { out: rows.length };
  }

  const chunks = chunk(bad, 50);
  if (!(await confirmSpend({
    words: bad.length,
    requests: chunks.length,
    estUsd: (chunks.length * 700 * 1 + chunks.length * 700 * 5) / 1e6,
    what: `Reclassify ${bad.length} '${bad[0].word_type}' rows into the schema's word types`,
  }))) return { status: 'pending' };

  const fixed = new Map();
  let cost = 0;
  await pmap(chunks, 8, async (batch) => {
    const r = await ask({
      model: MODEL,
      system:
        'Classify each German word into exactly one part of speech from the allowed list. ' +
        'Articles (der, die, das, ein) and pronouns (ich, sie, man) are "pronoun"; ' +
        'prepositions (in, mit, auf) are "preposition"; conjunctions (und, aber, dass) are ' +
        '"conjunction"; numerals are "number"; exclamations are "interjection"; ' +
        'multi-word expressions are "phrase".',
      user: batch.map((b) => b.lemma).join(', '),
      schema: SCHEMA,
      maxTokens: 4000,
    });
    cost += r.cost;
    for (const w of r.parsed?.w ?? []) fixed.set(String(w.l).toLowerCase(), w.t);
  }, 'reclassifying');

  let changed = 0;
  for (const r of rows) {
    if (TYPES.includes(r.word_type)) continue;
    const t = fixed.get(r.lemma.toLowerCase());
    // Anything the model did not return falls back to 'phrase', which is in the
    // allowed set and is the least wrong catch-all.
    r.word_type = t ?? 'phrase';
    // An article only belongs on a noun.
    if (r.word_type !== 'noun') r.article = null;
    changed++;
  }

  writeFileSync(FILE, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`  reclassified ${changed} rows · $${cost.toFixed(3)}`);
  return { out: rows.length, costUsd: Number(cost.toFixed(4)), model: MODEL };
});
