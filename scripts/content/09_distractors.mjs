#!/usr/bin/env node
/**
 * Stage 09 — choose reviewed wrong answers (distractors) for the vocabulary test.
 *
 *   node scripts/content/09_distractors.mjs            # dry run: counts and cost only
 *   node scripts/content/09_distractors.mjs --yes      # spend, then write the seed
 *   node scripts/content/09_distractors.mjs --levels=A1,A2,B1,B2,C1 --yes
 *
 * For each served content word, candidates are the words of the SAME part of speech,
 * at the same or an adjacent level, whose short English meaning is different. The model
 * then keeps the five candidates whose meaning clearly differs from the target and from
 * each other. Nothing copied: the output is pairs of dictionary ids.
 *
 * Writes:
 *   content/stage/09_distractors.jsonl        resumable, one line per target word
 *   supabase/seeds/020_word_distractors.sql   idempotent; ON CONFLICT DO NOTHING
 *
 * Token efficiency: 10 target words per request, each with 12 candidates. Haiku, no
 * thinking. The gloss is shortened here exactly as gloss_short() does in SQL.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, STAGE, LEVELS, arg, ask, chunk, confirmSpend, pmap, requireKey, stage } from './_lib.mjs';

const MODEL = 'claude-haiku-4-5';
const TARGETS_PER_REQUEST = 10;
const CANDIDATES = 12;
const KEEP = 5;
const OUT = join(STAGE, '09_distractors.jsonl');
const SEED = join(ROOT, 'supabase', 'seeds', '020_word_distractors.sql');
const POS = ['noun', 'verb', 'adjective', 'adverb'];

/** Same rule as public.gloss_short() in migration 016. Keep the two in step. */
export function glossShort(english) {
  const first = String(english ?? '').split(';')[0].split(',')[0];
  return first.replace(/\([^)]*\)/g, '').trim().slice(0, 32);
}

const contentWords = (gloss) =>
  new Set(gloss.toLowerCase().split(/[^a-zäöüß]+/).filter((w) => w.length > 2 && w !== 'the' && w !== 'and'));

function loadWords(levels) {
  const sql = `select id, german, coalesce(article,''), word_type, level, coalesce(thema,''), english
                 from deck_words
                where level in (${levels.map((l) => `'${l}'`).join(',')})
                  and word_type in (${POS.map((p) => `'${p}'`).join(',')})
                order by frequency_rank nulls last, id`;
  const tsv = execFileSync(
    'docker',
    ['exec', 'supabase_db_einfachlernen', 'psql', '-U', 'postgres', '-t', '-A', '-F', '\t', '-c', sql],
    { encoding: 'utf8', maxBuffer: 1 << 26 },
  ).trim();
  return tsv.split('\n').filter(Boolean).map((line) => {
    const [id, german, article, word_type, level, thema, english] = line.split('\t');
    return { id, german, article, word_type, level, thema, english, gloss: glossShort(english) };
  });
}

/** Candidates for one target: same part of speech, same or adjacent level, a different and
 *  non-overlapping meaning. Themed words are preferred, then glosses of similar length. */
export function candidatesFor(target, all) {
  const li = LEVELS.indexOf(target.level);
  const target_words = contentWords(target.gloss);
  const seen = new Set([target.gloss.toLowerCase()]);
  const pool = [];
  for (const w of all) {
    if (w.id === target.id || w.word_type !== target.word_type) continue;
    if (Math.abs(LEVELS.indexOf(w.level) - li) > 1) continue;
    if (!w.gloss || seen.has(w.gloss.toLowerCase())) continue;
    const shared = [...contentWords(w.gloss)].some((x) => target_words.has(x));
    if (shared) continue;
    seen.add(w.gloss.toLowerCase());
    const score =
      (w.thema && w.thema === target.thema ? 3 : 0) +
      (Math.abs(w.gloss.length - target.gloss.length) <= 12 ? 1 : 0) +
      Math.random();
    pool.push({ w, score });
  }
  return pool.sort((a, b) => b.score - a.score).slice(0, CANDIDATES).map((p) => p.w);
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['target', 'keep'],
        properties: {
          target: { type: 'string' },
          keep: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

const SYSTEM =
  'You design wrong answers for a German vocabulary quiz. The learner sees a German word and must pick ' +
  'its English meaning from four options. For each target you get a list of candidate words, each with ' +
  'its English meaning. Keep up to five candidates whose meaning is CLEARLY DIFFERENT from the target ' +
  'and from each other. Reject any candidate that could also be a correct translation of the target, a ' +
  'near-synonym, a more general or more specific form of it, or a meaning that overlaps another kept ' +
  'candidate. When in doubt, reject. Return the candidate ids exactly as given.';

function buildPrompt(targets, candidatesByTarget) {
  return targets
    .map((t) => {
      const cands = candidatesByTarget.get(t.id).map((c) => `  - ${c.id}: ${c.gloss}`).join('\n');
      return `TARGET ${t.id}: ${t.article ? t.article + ' ' : ''}${t.german} = ${t.gloss}\n${cands}`;
    })
    .join('\n\n');
}

await stage('09_distractors', async () => {
  const levels = String(arg('levels', 'A1,A2,B1,B2,C1')).split(',');
  const all = loadWords(levels);
  const targets = all.filter((w) => w.gloss);

  const done = new Set();
  if (existsSync(OUT)) {
    for (const line of readFileSync(OUT, 'utf8').split('\n').filter(Boolean)) done.add(JSON.parse(line).target);
  }

  const todo = targets.filter((t) => !done.has(t.id));
  const candidatesByTarget = new Map();
  let withEnough = 0;
  for (const t of todo) {
    const c = candidatesFor(t, all);
    candidatesByTarget.set(t.id, c);
    if (c.length >= KEEP) withEnough++;
  }
  const work = todo.filter((t) => candidatesByTarget.get(t.id).length >= KEEP);

  const batches = chunk(work, TARGETS_PER_REQUEST);
  // ~350 input tokens per target (glosses and ids), ~60 output tokens per target.
  const estUsd = (batches.length * 900 * 1 + batches.length * 700 * 5) / 1e6;

  console.log(`  levels          ${levels.join(', ')}`);
  console.log(`  content words   ${targets.length.toLocaleString()}`);
  console.log(`  already done    ${done.size.toLocaleString()}`);
  console.log(`  to judge        ${work.length.toLocaleString()} (${todo.length - work.length} lack enough candidates)`);
  console.log(`  requests        ${batches.length.toLocaleString()}`);

  if (work.length === 0) {
    console.log('  nothing to do');
    return { status: 'complete', out: done.size };
  }

  if (!(await confirmSpend({
    words: work.length,
    requests: batches.length,
    estUsd,
    what: `Stage 09: ${KEEP} reviewed distractors per word, ${MODEL}`,
  }))) return { status: 'pending', note: 'awaiting cost confirmation' };

  requireKey();
  const { appendFileSync } = await import('node:fs');
  let cost = 0;
  let input = 0;
  let output = 0;
  let kept = 0;

  await pmap(batches, 8, async (batch) => {
    const allowed = new Map(batch.flatMap((t) => candidatesByTarget.get(t.id).map((c) => [c.id, t.id])));
    const res = await ask({
      model: MODEL,
      system: SYSTEM,
      user: buildPrompt(batch, candidatesByTarget),
      schema: SCHEMA,
      maxTokens: 4000,
    });
    cost += res.cost;
    input += res.usage.input_tokens ?? 0;
    output += res.usage.output_tokens ?? 0;

    const returned = new Map((res.parsed?.items ?? []).map((i) => [i.target, i.keep]));
    for (const t of batch) {
      const keep = (returned.get(t.id) ?? [])
        .filter((id, i, arr) => allowed.get(id) === t.id && arr.indexOf(id) === i)
        .slice(0, KEEP);
      appendFileSync(OUT, JSON.stringify({ target: t.id, keep }) + '\n');
      kept += keep.length;
    }
  }, 'judging');

  // Seed the approved pairs. Re-running adds only new pairs (ON CONFLICT DO NOTHING).
  const lines = readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const values = lines.flatMap((r) => r.keep.map((d) => `  ('${r.target}', '${d}')`));
  mkdirSync(join(ROOT, 'supabase', 'seeds'), { recursive: true });
  writeFileSync(
    SEED,
    `-- 020_word_distractors.sql — generated by scripts/content/09_distractors.mjs. Do not hand-edit.\n` +
      `-- ${values.length} approved pairs for ${lines.length} words. Re-run the stage to extend.\n\n` +
      `INSERT INTO public.word_distractors (word_id, distractor_word_id, approved, source)\n` +
      `SELECT v.w, v.d, true, 'auto' FROM (VALUES\n${values.join(',\n')}\n) AS v(w, d)\n` +
      `ON CONFLICT (word_id, distractor_word_id) DO NOTHING;\n`,
  );

  console.log(`  judged ${work.length} words · ${kept} pairs kept · $${cost.toFixed(2)} this run`);
  return {
    in: work.length,
    out: kept,
    model: MODEL,
    tokens: { input, output },
    costUsd: Number(cost.toFixed(4)),
    note: `${TARGETS_PER_REQUEST} words/request, ${CANDIDATES} candidates each`,
  };
});
