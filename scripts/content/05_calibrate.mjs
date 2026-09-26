#!/usr/bin/env node
/**
 * Stage 05 — score the ensemble against the gold set and pick the threshold.
 *
 *   node scripts/content/05_calibrate.mjs
 *
 * The gold set is the hand-authored de_words rows captured in stage 01. Their
 * levels were assigned by a person before this pipeline existed, which is what
 * makes this a real check: grading the model's levels against the model's own
 * levels would be circular and would tell us nothing.
 *
 * Reports exact-match and within-one-level accuracy overall and at each
 * candidate threshold, so the gate can be set from evidence. The bar from the
 * brief is 85% within one level; below that, stop rather than ship.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GOLD, LEVELS, STAGE, readJsonl, stage } from './_lib.mjs';

const idx = (l) => LEVELS.indexOf(l);

await stage('05_calibrate', async () => {
  const levelled = readJsonl(join(STAGE, '04_levelled.jsonl'));
  const byLemma = new Map(levelled.map((r) => [r.lemma.toLowerCase(), r]));

  const gold = readFileSync(join(GOLD, 'gold.csv'), 'utf8')
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map((l) => {
      const [german, level] = l.split(',');
      return { german, level };
    });

  const matched = [];
  for (const g of gold) {
    const hit = byLemma.get(g.german.toLowerCase());
    if (hit) matched.push({ ...g, predicted: hit.level, confidence: hit.level_confidence, source: hit.level_source });
  }

  const score = (rows) => {
    if (!rows.length) return { n: 0, exact: 0, withinOne: 0 };
    let exact = 0;
    let within = 0;
    for (const r of rows) {
      const d = Math.abs(idx(r.predicted) - idx(r.level));
      if (d === 0) exact++;
      if (d <= 1) within++;
    }
    return { n: rows.length, exact: exact / rows.length, withinOne: within / rows.length };
  };

  const overall = score(matched);
  const thresholds = [0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9].map((t) => {
    const kept = matched.filter((m) => m.confidence >= t);
    return { threshold: t, kept: kept.length, coverage: kept.length / (matched.length || 1), ...score(kept) };
  });

  const report = {
    ranAt: new Date().toISOString(),
    goldSize: gold.length,
    matched: matched.length,
    overall,
    thresholds,
    note:
      'Gold set = the 168 hand-authored de_words rows (single tokens only), levelled by a human ' +
      'before this pipeline existed. Small and not externally audited — treat the numbers as a ' +
      'sanity check on the method, not a certification.',
    worst: matched
      .map((m) => ({ ...m, delta: Math.abs(idx(m.predicted) - idx(m.level)) }))
      .filter((m) => m.delta >= 2)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 15),
  };

  writeFileSync(join(GOLD, 'report.json'), JSON.stringify(report, null, 2) + '\n');

  console.log(`  gold ${gold.length} words · ${matched.length} found in the catalogue`);
  console.log(`  overall  exact ${(overall.exact * 100).toFixed(0)}%  within-one ${(overall.withinOne * 100).toFixed(0)}%`);
  console.log('  threshold  kept  coverage  exact  within-one');
  for (const t of thresholds) {
    console.log(
      `    ${t.threshold.toFixed(2)}     ${String(t.kept).padStart(4)}   ${(t.coverage * 100).toFixed(0).padStart(4)}%   ` +
        `${(t.exact * 100).toFixed(0).padStart(4)}%     ${(t.withinOne * 100).toFixed(0).padStart(4)}%`,
    );
  }
  if (report.worst.length) {
    console.log('  worst misses:', report.worst.slice(0, 6).map((w) => `${w.german} ${w.level}→${w.predicted}`).join(', '));
  }
  if (overall.withinOne < 0.85) {
    console.log('\n  ⚠ within-one accuracy is below the 85% bar — do not ship the catalogue on this run.');
  }

  return {
    out: matched.length,
    gold: { size: matched.length, exact: overall.exact, withinOne: overall.withinOne, ranAt: report.ranAt },
  };
});
