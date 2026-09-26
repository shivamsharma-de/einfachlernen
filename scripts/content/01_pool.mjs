#!/usr/bin/env node
/**
 * Stage 01 — build the candidate pool from the written-frequency corpus.
 *
 *   node scripts/content/01_pool.mjs [--take=12000]
 *
 * Deterministic and free. Keeps plausible German word forms, drops punctuation,
 * numerals, abbreviations and fragments. Lemmatisation and proper-noun removal
 * happen in stage 03, where the model is already looking at each word — doing
 * them here would need a second pass over the same data.
 *
 * Also snapshots the 168 hand-authored de_words rows as the calibration gold
 * set: their levels were assigned by a human and are independent of this
 * pipeline, which is what makes stage 05 a real check rather than a circular one.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GOLD, SOURCES, STAGE, arg, stage, writeJsonl } from './_lib.mjs';

const TAKE = Number(arg('take', 12000));

// German word form: letters (incl. umlauts/ß) and internal hyphens, 2+ chars.
const WORDY = /^[A-Za-zÄÖÜäöüßÀ-ÿ][A-Za-zÄÖÜäöüßÀ-ÿ-]{1,}$/;

await stage('01_pool', async () => {
  // ── written frequency (Leipzig): id \t word \t frequency, unordered by freq
  const rows = [];
  for (const line of readFileSync(join(SOURCES, 'leipzig_words.tsv'), 'utf8').split('\n')) {
    const [, word, freq] = line.split('\t');
    if (!word || !freq) continue;
    if (!WORDY.test(word)) continue;
    if (word.length < 2) continue;
    if (word === word.toUpperCase() && word.length > 1) continue; // abbreviations
    rows.push({ surface: word, written: Number(freq) });
  }
  rows.sort((a, b) => b.written - a.written);

  const seen = new Set();
  const pool = [];
  for (const r of rows) {
    const k = r.surface.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    pool.push({ ...r, written_rank: pool.length + 1 });
    if (pool.length >= TAKE) break;
  }

  // ── spoken frequency (OpenSubtitles): word<space>count
  const spoken = new Map();
  for (const line of readFileSync(join(SOURCES, 'opensubtitles_de_50k.txt'), 'utf8').split('\n')) {
    const [w, c] = line.trim().split(/\s+/);
    if (w && c) spoken.set(w.toLowerCase(), Number(c));
  }
  for (const p of pool) p.spoken = spoken.get(p.surface.toLowerCase()) ?? 0;

  await writeJsonl(join(STAGE, '01_pool.jsonl'), pool);

  // ── gold set: the 168 human-levelled rows, captured before 08_seed rewrites them
  const tsv = execFileSync(
    'docker',
    ['exec', 'supabase_db_einfachlernen', 'psql', '-U', 'postgres', '-t', '-A', '-F', '\t', '-c',
     "select german, level from de_words where german ~ '^[A-Za-zÄÖÜäöüß-]+$' order by german"],
    { encoding: 'utf8' },
  ).trim();
  const gold = tsv.split('\n').filter(Boolean).map((l) => {
    const [german, level] = l.split('\t');
    return `${german},${level}`;
  });
  writeFileSync(join(GOLD, 'gold.csv'), 'german,level\n' + gold.join('\n') + '\n');

  console.log(`  pool ${pool.length} forms · dropped ${rows.length - pool.length} dupes/rejects`);
  console.log(`  gold set ${gold.length} human-levelled words → content/gold/gold.csv`);
  return { in: rows.length, out: pool.length, rejected: rows.length - pool.length };
});
