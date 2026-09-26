#!/usr/bin/env node
/**
 * Stage 07 — rule checks, with one escalation to the stronger model.
 *
 *   node scripts/content/07_validate.mjs [--escalate] [--yes]
 *
 * This is the gate that makes a cheap first pass safe: anything the rules catch
 * is re-generated once on ANTHROPIC_MODEL_TEXT, re-checked, and rejected if it
 * still fails. Rejections never reach a learner.
 *
 * If content/sources/wiktionary_de.jsonl is present (kaikki.org extract,
 * CC BY-SA), articles and plurals are cross-checked against it too. Absent, the
 * stage says so rather than silently skipping the strongest check it has.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SOURCES, STAGE, arg, ask, chunk, confirmSpend, pmap, requireKey, stage } from './_lib.mjs';

const OUT = join(STAGE, '07_validated.jsonl');
const REJECTS = join(STAGE, '07_rejects.csv');
const ESCALATE_MODEL = process.env.ANTHROPIC_MODEL_TEXT || 'claude-opus-5';

/** Crude but effective: an English sentence smuggled into example_de. */
const ENGLISH_MARKERS = /\b(the|is|are|was|were|this|that|with|from|have|has|they|you|and the)\b/i;

/** Does the sentence contain the headword or a plausible inflection of it? */
function containsLemma(sentence, lemma) {
  if (!sentence) return false;
  const s = sentence.toLowerCase();
  const l = lemma.toLowerCase();
  if (s.includes(l)) return true;
  // German inflection mostly appends or changes the tail; match a generous stem.
  const stem = l.length > 5 ? l.slice(0, Math.max(4, l.length - 2)) : l.slice(0, Math.max(3, l.length - 1));
  return s.includes(stem);
}

function checkRow(r, wik) {
  const problems = [];
  if (!r.english || r.english.length < 2) problems.push('no english');
  if (!r.example_de) problems.push('no example_de');
  if (!r.example_en) problems.push('no example_en');
  if (r.example_de && ENGLISH_MARKERS.test(r.example_de)) problems.push('english in example_de');
  if (r.example_de && !containsLemma(r.example_de, r.lemma)) problems.push('example missing headword');

  if (r.word_type === 'noun') {
    if (!r.article) problems.push('noun without article');
    if (!r.forms?.plural) problems.push('noun without plural');
  } else if (r.article) {
    problems.push('article on a non-noun');
  }

  if (r.word_type === 'verb') {
    if (!r.forms?.past_participle) problems.push('verb without Partizip II');
    if (!r.forms?.auxiliary) problems.push('verb without auxiliary');
  }

  if (wik) {
    const w = wik.get(r.lemma.toLowerCase());
    if (w) {
      if (w.article && r.article && w.article !== r.article) problems.push(`article disagrees with Wiktionary (${w.article})`);
      if (w.plural && r.forms?.plural && w.plural !== r.forms.plural) problems.push(`plural disagrees with Wiktionary (${w.plural})`);
    }
  }
  return problems;
}

const REPAIR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['w'],
  properties: {
    w: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['l', 'a', 'e', 'pl', 'pp', 'aux', 'de', 'en'],
        properties: {
          l: { type: 'string' },
          a: { type: ['string', 'null'], enum: ['der', 'die', 'das', null] },
          e: { type: 'string' },
          pl: { type: ['string', 'null'] },
          pp: { type: ['string', 'null'] },
          aux: { type: ['string', 'null'], enum: ['haben', 'sein', null] },
          de: { type: 'string' },
          en: { type: 'string' },
        },
      },
    },
  },
};

await stage('07_validate', async () => {
  const rows = readJsonl(join(STAGE, '06_enriched.jsonl'));

  let wik = null;
  const wikPath = join(SOURCES, 'wiktionary_de.jsonl');
  if (existsSync(wikPath)) {
    wik = new Map();
    for (const line of readFileSync(wikPath, 'utf8').split('\n').filter(Boolean)) {
      try {
        const w = JSON.parse(line);
        if (w.word) wik.set(String(w.word).toLowerCase(), w);
      } catch { /* skip malformed lines */ }
    }
    console.log(`  Wiktionary cross-check active (${wik.size} entries)`);
  } else {
    console.log('  no Wiktionary extract at content/sources/wiktionary_de.jsonl — rule checks only');
  }

  let failed = rows.map((r) => ({ r, problems: checkRow(r, wik) })).filter((x) => x.problems.length);
  const passed = rows.filter((r) => !checkRow(r, wik).length);
  console.log(`  first pass: ${passed.length} ok · ${failed.length} failed`);

  let cost = 0;
  let repaired = 0;

  if (failed.length && arg('escalate') !== null && arg('escalate') !== false) {
    requireKey();
    const chunks = chunk(failed, 10);
    const estUsd = (chunks.length * 900 * 5.0 + chunks.length * 1800 * 25.0) / 1e6;
    if (
      await confirmSpend({
        words: failed.length,
        requests: chunks.length,
        estUsd,
        what: `Stage 07: re-generate ${failed.length} failed rows on ${ESCALATE_MODEL}`,
      })
    ) {
      const fixedRows = [];
      await pmap(
        chunks,
        8,
        async (batch) => {
          const prompt = batch
            .map((x) => `${x.r.lemma} (${x.r.word_type}, ${x.r.level}) — problems: ${x.problems.join('; ')}`)
            .join('\n');
          try {
            const res = await ask({
              model: ESCALATE_MODEL,
              system:
                'Fix these German dictionary entries. Each line names a headword and what is wrong with ' +
                'the current entry. Return a correct entry for every headword: article for nouns (else ' +
                'null), plural for nouns, Partizip II and auxiliary for verbs, a concise English meaning, ' +
                'and one natural German example that actually contains the headword, with its English ' +
                'translation. Never invent a plural for a verb or an auxiliary for a noun.',
              user: prompt,
              schema: REPAIR_SCHEMA,
              maxTokens: 8000,
              effort: 'low',
            });
            cost += res.cost;
            const byLemma = new Map(batch.map((x) => [x.r.lemma.toLowerCase(), x.r]));
            for (const w of res.parsed?.w ?? []) {
              const base = byLemma.get(String(w.l).toLowerCase());
              if (!base) continue;
              fixedRows.push({
                ...base,
                article: w.a ?? null,
                english: w.e,
                forms: {
                  ...(w.pl ? { plural: w.pl } : {}),
                  ...(w.pp ? { past_participle: w.pp } : {}),
                  ...(w.aux ? { auxiliary: w.aux } : {}),
                },
                example_de: w.de,
                example_en: w.en,
              });
            }
          } catch (err) {
            console.error(`\n  escalation batch failed: ${err?.message ?? err}`);
          }
        },
        'escalating',
      );
      for (const f of fixedRows) {
        if (!checkRow(f, wik).length) {
          passed.push(f);
          repaired++;
        }
      }
      const repairedSet = new Set(passed.map((p) => p.lemma.toLowerCase()));
      failed = failed.filter((x) => !repairedSet.has(x.r.lemma.toLowerCase()));
      console.log(`  repaired ${repaired} of the failures on ${ESCALATE_MODEL}`);
    }
  }

  await writeJsonlSync(OUT, passed);
  writeFileSync(
    REJECTS,
    'lemma,level,word_type,problems\n' +
      failed.map((x) => `"${x.r.lemma}",${x.r.level},${x.r.word_type},"${x.problems.join('; ')}"`).join('\n') +
      '\n',
  );

  // Which rules bite most — useful for improving the enrichment prompt.
  const tally = {};
  for (const x of failed) for (const p of x.problems) tally[p] = (tally[p] ?? 0) + 1;
  console.log(`  final: ${passed.length} validated · ${failed.length} rejected`);
  if (Object.keys(tally).length) console.log('  rejection reasons:', tally);

  return {
    in: rows.length,
    out: passed.length,
    rejected: failed.length,
    costUsd: Number(cost.toFixed(4)),
    model: repaired ? ESCALATE_MODEL : undefined,
    note: wik ? 'rule checks + Wiktionary' : 'rule checks only (no Wiktionary extract)',
  };
});

function readJsonl(p) {
  if (!existsSync(p)) throw new Error(`missing ${p} — run stage 06 first`);
  return readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
async function writeJsonlSync(p, rows) {
  writeFileSync(p, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
}
