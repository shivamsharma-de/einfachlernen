#!/usr/bin/env node
/**
 * Stage 04 — collapse forms into lemmas, combine the signals, gate on agreement.
 *
 *   node scripts/content/04_gate.mjs [--threshold=0.70]
 *
 * This is where a level is actually decided. Free, no model.
 *
 * 1. Group the three model samples per surface form (majority lemma / POS /
 *    teachable; the three levels are kept as a spread).
 * 2. Collapse forms into lemmas, summing written frequency — `gehen`, `geht`
 *    and `ging` are one word a learner learns once.
 * 3. Re-rank lemmas by summed frequency and read the band off PRD F5.2's
 *    cumulative targets. Only now does a rank mean anything.
 * 4. Combine band + model median, nudged by morphology and spoken bias.
 * 5. Confidence = how much the signals agreed. Below the threshold, or any
 *    disagreement wider than one level, the word is 'estimated' and stays draft.
 */
import { join } from 'node:path';
import { BANDS, LEVELS, STAGE, arg, readJsonl, stage, writeJsonl } from './_lib.mjs';

const THRESHOLD = Number(arg('threshold', 0.7));
// C1 lemmas agree less often across the three samples, and the calibration run showed
// 0.60 still keeps the wrong ones out. Every other level keeps the general threshold.
const C1_THRESHOLD = Number(arg('c1-threshold', 0.6));
const idx = (l) => LEVELS.indexOf(l);

function bandOf(rank) {
  for (const [level, ceiling] of BANDS) if (rank <= ceiling) return level;
  return 'C2';
}

const majority = (xs) => {
  const c = new Map();
  for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

await stage('04_gate', async () => {
  const signals = readJsonl(join(STAGE, '02_signals.jsonl'));
  const samples = readJsonl(join(STAGE, '03_levels.jsonl'));
  const signalBy = new Map(signals.map((s) => [s.surface, s]));

  // ── 1. group samples per surface form
  const perForm = new Map();
  for (const r of samples) {
    if (!perForm.has(r.s)) perForm.set(r.s, { lemmas: [], pos: [], keep: [], levels: [] });
    const f = perForm.get(r.s);
    f.lemmas.push(r.l);
    f.pos.push(r.p);
    f.keep.push(r.k);
    f.levels.push(r.v);
  }

  // ── 2. collapse forms into lemmas
  const lemmas = new Map();
  for (const [surface, f] of perForm) {
    const sig = signalBy.get(surface);
    if (!sig) continue;
    const lemma = majority(f.lemmas);
    const keep = f.keep.filter(Boolean).length >= Math.ceil(f.keep.length / 2);
    if (!keep) continue; // proper nouns, names, fragments

    const key = lemma.toLowerCase();
    if (!lemmas.has(key)) {
      lemmas.set(key, {
        lemma,
        written: 0,
        spoken: 0,
        forms: 0,
        pos: [],
        levels: [],
        morph: sig.morph,
        spokenBias: sig.spokenBias,
      });
    }
    const L = lemmas.get(key);
    L.written += sig.written;
    L.spoken += sig.spoken;
    L.forms += 1;
    L.pos.push(...f.pos);
    L.levels.push(...f.levels);
    // Judge complexity on the lemma, not on whichever inflected form we saw.
    L.morph = Math.min(L.morph, sig.morph);
  }

  // ── 3. rank lemmas on BOTH corpora, then read the band
  //
  // Ranking on written frequency alone put `billig`, `grau`, `hungrig` and
  // `Entschuldigung` at B1 — they are A1 words that a news corpus simply does
  // not use. Normalising each corpus to a per-million rate and summing gives
  // everyday vocabulary its due weight without letting either corpus dominate.
  const all = [...lemmas.values()];
  const writtenTotal = all.reduce((a, l) => a + l.written, 0) || 1;
  const spokenTotal = all.reduce((a, l) => a + l.spoken, 0) || 1;
  for (const l of all) {
    l.writtenPM = (l.written / writtenTotal) * 1e6;
    l.spokenPM = (l.spoken / spokenTotal) * 1e6;
    l.combinedPM = l.writtenPM + l.spokenPM;
  }
  const ranked = all.sort((a, b) => b.combinedPM - a.combinedPM);
  ranked.forEach((l, i) => {
    l.rank = i + 1;
    l.band = bandOf(l.rank);
  });

  // ── 4 + 5. combine and score
  const out = ranked.map((l) => {
    const levelIdx = l.levels.map(idx).filter((i) => i >= 0).sort((a, b) => a - b);
    const modelMedian = levelIdx[Math.floor(levelIdx.length / 2)] ?? idx(l.band);
    const spread = levelIdx.length ? levelIdx[levelIdx.length - 1] - levelIdx[0] : 3;
    const bandIdx = idx(l.band);
    const bandDelta = Math.abs(bandIdx - modelMedian);

    // The model carries semantic judgment, frequency carries usage evidence.
    // No spoken-bias term here any more: the rank above is already computed from
    // both corpora, so applying it again would count the same evidence twice.
    let combined = 0.6 * modelMedian + 0.4 * bandIdx;
    if (l.morph >= 3) combined += 0.4;
    const finalIdx = Math.max(0, Math.min(LEVELS.length - 1, Math.round(combined)));

    // Confidence: sample agreement first, then band agreement.
    let confidence = 1 - 0.22 * spread - 0.16 * bandDelta;
    if (l.forms >= 3) confidence += 0.03; // seen in several inflections
    confidence = Math.max(0, Math.min(1, confidence));

    const agrees = spread <= 1 && bandDelta <= 1;
    const threshold = LEVELS[finalIdx] === 'C1' ? C1_THRESHOLD : THRESHOLD;
    const derived = agrees && confidence >= threshold;

    return {
      lemma: l.lemma,
      level: LEVELS[finalIdx],
      level_source: derived ? 'derived' : 'estimated',
      level_confidence: Number(confidence.toFixed(3)),
      review_status: derived ? 'reviewed' : 'draft',
      word_type: majority(l.pos),
      frequency_rank: l.rank,
      band: l.band,
      model_level: LEVELS[modelMedian],
      spread,
      band_delta: bandDelta,
      morph: l.morph,
      spoken_bias: l.spokenBias,
      written: l.written,
      forms: l.forms,
    };
  });

  await writeJsonl(join(STAGE, '04_levelled.jsonl'), out);

  const derived = out.filter((r) => r.level_source === 'derived');
  const dist = {};
  for (const r of derived) dist[r.level] = (dist[r.level] ?? 0) + 1;
  console.log(`  ${out.length} lemmas from ${perForm.size} forms`);
  console.log(`  derived ${derived.length} · estimated ${out.length - derived.length} (threshold ${THRESHOLD}, C1 ${C1_THRESHOLD})`);
  console.log('  derived by level:', dist);

  return {
    in: perForm.size,
    out: out.length,
    gate: { threshold: THRESHOLD, derived: derived.length, estimated: out.length - derived.length },
  };
});
