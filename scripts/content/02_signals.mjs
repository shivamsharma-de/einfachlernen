#!/usr/bin/env node
/**
 * Stage 02 — the deterministic per-form signals. Free, no model.
 *
 *   node scripts/content/02_signals.mjs
 *
 *   spokenBias  log2(written_rank / spoken_rank). Positive → ranks higher in
 *               speech than in writing, so conversational and probably earlier.
 *               Negative → written/academic, probably later.
 *   morph       morphological complexity: length, compounding, derivational
 *               affixes. Higher → later.
 *
 * The frequency band is deliberately NOT computed here. These are word forms;
 * `gehen`, `geht` and `ging` are three rows that must collapse into one lemma
 * with their frequencies summed before any rank means anything. That happens in
 * stage 04, once stage 03 has supplied the lemmas.
 */
import { join } from 'node:path';
import { STAGE, readJsonl, stage, writeJsonl } from './_lib.mjs';

const SUFFIXES = ['keit', 'heit', 'schaft', 'ung', 'nis', 'tum', 'ismus', 'ität', 'ierung', 'barkeit'];
const PREFIXES = ['ver', 'ent', 'zer', 'miss', 'wider', 'unter', 'über', 'durch'];

/** Ranks are noise in the top few hundred, where everything is frequent in both
 *  corpora; applying a ratio nudge there moved `der` to A2. Suppress it. */
const NOISE_FLOOR_RANK = 300;

export function morphScore(w) {
  const s = w.toLowerCase();
  let score = 0;
  if (s.length > 8) score += 1;
  if (s.length > 12) score += 1;
  if (s.length > 16) score += 1;
  if (SUFFIXES.some((x) => s.endsWith(x))) score += 1;
  if (PREFIXES.some((x) => s.startsWith(x) && s.length > 7)) score += 1;
  if (s.includes('-')) score += 1;
  return Math.min(score, 4);
}

await stage('02_signals', async () => {
  const pool = readJsonl(join(STAGE, '01_pool.jsonl'));

  const bySpoken = [...pool].filter((p) => p.spoken > 0).sort((a, b) => b.spoken - a.spoken);
  const spokenRank = new Map(bySpoken.map((p, i) => [p.surface, i + 1]));

  const out = pool.map((p) => {
    const sr = spokenRank.get(p.surface) ?? null;
    let spokenBias = 0;
    if (p.written_rank > NOISE_FLOOR_RANK) {
      // Absent from a 50k spoken corpus while common in writing is itself a
      // signal: treat it as clearly written-leaning rather than unknown.
      spokenBias = sr ? Math.log2(p.written_rank / sr) : -2;
      spokenBias = Math.max(-3, Math.min(3, spokenBias));
    }
    return {
      ...p,
      spokenBias: Number(spokenBias.toFixed(2)),
      morph: morphScore(p.surface),
    };
  });

  await writeJsonl(join(STAGE, '02_signals.jsonl'), out);
  const withSpoken = out.filter((r) => r.spoken > 0).length;
  console.log(`  ${out.length} forms · ${withSpoken} found in the spoken corpus`);
  return { in: pool.length, out: out.length };
});
