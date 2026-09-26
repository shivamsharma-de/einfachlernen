#!/usr/bin/env node
/**
 * Apply the v3 catalogue to the LIVE project, in batches.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/pipeline/seed-cloud.mjs [--dry-run] [--batch=400]
 *
 * The seed is one 3MB INSERT, which is too large for a single Management API
 * request, so it is split into batches that each carry the same
 * ON CONFLICT (id) DO UPDATE tail. That also makes the load restartable: a
 * failed batch can be retried on its own, and re-running the whole thing is
 * harmless because every statement is an upsert.
 *
 * Writes to production. Lead-only; the guard blocks agent worktrees.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REF = process.env.PROJECT_REF || 'soscxohifanqklpcfuhd';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const API = `https://api.supabase.com/v1/projects/${REF}/database/query`;
const SEED = join(ROOT, 'supabase', 'seeds', '010_de_words_v3.sql');

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const BATCH = Number((argv.find((a) => a.startsWith('--batch=')) || '--batch=400').split('=')[1]);

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN not set');
  process.exit(1);
}

async function runSql(query) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const sql = readFileSync(SEED, 'utf8');

// The generated seed is: <comments> BEGIN; INSERT ... VALUES <rows> ON CONFLICT ... ; COMMIT;
const insertStart = sql.indexOf('INSERT INTO public.de_words');
const valuesAt = sql.indexOf('\nVALUES\n', insertStart);
const conflictAt = sql.indexOf('\nON CONFLICT (id) DO UPDATE SET');
const commitAt = sql.indexOf('\nCOMMIT;');
if (insertStart < 0 || valuesAt < 0 || conflictAt < 0) {
  console.error('could not parse the seed file — has 08_seed.mjs changed shape?');
  process.exit(1);
}

const header = sql.slice(insertStart, valuesAt + '\nVALUES\n'.length);
const conflictTail = sql.slice(conflictAt, commitAt > 0 ? commitAt : undefined).replace(/;\s*$/, '');
const body = sql.slice(valuesAt + '\nVALUES\n'.length, conflictAt);

// Rows are one per line, each starting with two spaces and an open paren, and
// separated by ",\n". Splitting on that boundary keeps quoted commas intact.
const rows = body
  .split(/,\n(?=  \()/)
  .map((r) => r.trim().replace(/,$/, ''))
  .filter(Boolean);

console.log(`seed     : ${(sql.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`rows     : ${rows.length.toLocaleString()}`);
console.log(`batches  : ${Math.ceil(rows.length / BATCH)} of ${BATCH}`);
console.log(`project  : ${REF}`);

if (DRY) {
  console.log('\n--dry-run: nothing sent. First row:');
  console.log(rows[0].slice(0, 200) + '…');
  process.exit(0);
}

const before = await runSql('select count(*)::int as n from de_words');
console.log(`\nbefore   : ${before[0].n} rows in de_words\n`);

let sent = 0;
let failed = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH);
  const stmt = `${header}${slice.join(',\n')}\n${conflictTail};`;
  const label = `batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(rows.length / BATCH)}`;
  try {
    await runSql(stmt);
    sent += slice.length;
    process.stdout.write(`\r  ${label} · ${sent.toLocaleString()} rows sent`);
  } catch (err) {
    failed++;
    console.error(`\n  ✗ ${label} failed: ${err.message}`);
  }
}

const after = await runSql(
  `select level, count(*)::int as total,
          count(*) filter (where review_status = 'reviewed')::int as reviewed
     from de_words group by level order by level`,
);
console.log(`\n\nafter    :`);
let t = 0;
let r = 0;
for (const row of after) {
  t += row.total;
  r += row.reviewed;
  console.log(`  ${row.level}  ${String(row.total).padStart(6)} total  ${String(row.reviewed).padStart(6)} reviewed`);
}
console.log(`  ${'TOTAL'.padEnd(2)} ${String(t).padStart(6)} total  ${String(r).padStart(6)} reviewed`);
if (failed) console.log(`\n⚠ ${failed} batch(es) failed — re-run to retry (every statement is an upsert)`);
