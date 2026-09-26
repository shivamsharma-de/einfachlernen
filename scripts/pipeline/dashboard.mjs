#!/usr/bin/env node
/**
 * Content pipeline dashboard — stage progress, spend, and what actually landed
 * in the database.
 *
 *   npm run content:status          # snapshot
 *   npm run content:status -- -w    # refresh every 15s
 *   npm run content:status -- --db  # force the DB section even if the stack looks down
 *
 * Two halves, deliberately:
 *   PIPELINE     — what the stages claim, from content/state.json + the stage files on disk
 *   PERSISTENCE  — what is really in Postgres and on disk right now
 * When those two disagree, that is the finding. A stage that says "complete"
 * while the DB holds nothing means the seed never ran.
 *
 * Read-only. Never writes, never calls a model. Lead-owned.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CONTENT = join(ROOT, 'content');
const STATE = join(CONTENT, 'state.json');
const DB_CONTAINER = 'supabase_db_einfachlernen';

const c = {
  d: (s) => `\x1b[2m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  r: (s) => `\x1b[31m${s}\x1b[0m`,
  cy: (s) => `\x1b[36m${s}\x1b[0m`,
};

/** The stages, in run order. Keep in sync with 04-data-integrations.md §2. */
const STAGES = [
  ['00_fetch_sources', 'fetch open corpora'],
  ['01_pool', 'lemmatise + filter pool'],
  ['02_signals', 'frequency / spoken / morphology'],
  ['03_level', 'model level judgment ×3'],
  ['04_gate', 'ensemble + confidence gate'],
  ['05_calibrate', 'score vs gold set'],
  ['06_enrich', 'article, forms, examples'],
  ['07_validate', 'Wiktionary cross-check'],
  ['08_seed', 'emit seed SQL'],
];

const STATUS_STYLE = {
  complete: (s) => c.g('✓ ' + s),
  running: (s) => c.cy('▸ ' + s),
  submitted: (s) => c.y('⏳ ' + s),
  failed: (s) => c.r('✗ ' + s),
  pending: (s) => c.d('· ' + s),
};

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function ago(iso) {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(m)) return '';
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function n(x) {
  return typeof x === 'number' ? x.toLocaleString('en-US') : '—';
}

/** Count lines in a .jsonl without loading it all. */
function countLines(p) {
  try {
    const buf = readFileSync(p);
    let lines = 0;
    for (let i = 0; i < buf.length; i++) if (buf[i] === 10) lines++;
    if (buf.length && buf[buf.length - 1] !== 10) lines++;
    return lines;
  } catch {
    return null;
  }
}

function psql(sql) {
  try {
    return execFileSync('docker', ['exec', DB_CONTAINER, 'psql', '-U', 'postgres', '-t', '-A', '-F', '\t', '-c', sql], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim();
  } catch {
    return null;
  }
}

// ───────────────────────────────────────────────────────── pipeline ──

function pipelineSection() {
  const state = readJson(STATE);
  const out = [c.b('PIPELINE') + c.d(state ? `  · state.json ${ago(state.updatedAt)}` : '  · no content/state.json yet')];
  out.push('');

  const stageDir = join(CONTENT, 'stage');
  const onDisk = existsSync(stageDir) ? readdirSync(stageDir) : [];

  let totalCost = 0;
  for (const [key, label] of STAGES) {
    const s = state?.stages?.[key] ?? {};
    const status = s.status ?? 'pending';
    const style = STATUS_STYLE[status] ?? STATUS_STYLE.pending;

    // Cross-check the claim against the artefact the stage should have written.
    const artefact = onDisk.find((f) => f.startsWith(key.slice(0, 2) + '_'));
    const rows = artefact ? countLines(join(stageDir, artefact)) : null;

    // A running stage's state.json entry is from its LAST completed run, so it
    // under-reports live progress. Trust the file on disk while it is running.
    const live = status === 'running' && rows != null ? rows : (s.out ?? rows);
    let detail = '';
    if (live != null) detail += `${n(live)} rows`;
    // `s.in` is also from the previous run, so it is only a usable denominator
    // when it is actually ahead of what is on disk.
    if (status === 'running' && rows != null && s.in > rows) {
      detail += c.d(` of ${n(s.in)}  (${((100 * rows) / s.in).toFixed(0)}%)`);
    }
    if (s.rejected) detail += c.y(` · ${n(s.rejected)} rejected`);
    if (s.costUsd) {
      totalCost += s.costUsd;
      detail += c.d(` · $${s.costUsd.toFixed(2)}`);
    }
    if (s.batchId && status === 'submitted') detail += c.y(` · batch ${s.batchId.slice(0, 18)}…`);
    if (s.model) detail += c.d(` · ${s.model}`);
    if (status === 'complete' && s.finishedAt) detail += c.d(` · ${ago(s.finishedAt)}`);
    if (s.error) detail += c.r(` · ${String(s.error).slice(0, 48)}`);

    // Claimed complete but nothing on disk — the thing worth catching.
    if (status === 'complete' && artefact && rows === 0) detail += c.r('  ⚠ artefact is empty');
    // 00 writes to content/sources, 05 to content/gold, 08 to supabase/seeds —
    // only the stages that produce a content/stage/ artefact are cross-checked.
    const WRITES_ELSEWHERE = ['00_fetch_sources', '05_calibrate', '08_seed'];
    if (status === 'complete' && !artefact && !WRITES_ELSEWHERE.includes(key)) {
      detail += c.r('  ⚠ no stage file on disk');
    }

    out.push(`  ${style(key.padEnd(17))} ${c.d(label.padEnd(32))} ${detail}`);
  }

  out.push('');
  const gate = state?.gate;
  if (gate) {
    const pct = gate.derived + gate.estimated ? (100 * gate.derived) / (gate.derived + gate.estimated) : 0;
    out.push(
      `  ${c.b('gate')}      threshold ${gate.threshold ?? '—'} · ` +
        `${c.g(n(gate.derived) + ' derived')} / ${c.y(n(gate.estimated) + ' estimated')} ` +
        c.d(`(${pct.toFixed(0)}% shippable)`),
    );
  }
  const gold = state?.gold;
  if (gold) {
    const ok = (gold.withinOne ?? 0) >= 0.85;
    out.push(
      `  ${c.b('gold set')}  ${n(gold.size)} words · exact ${((gold.exact ?? 0) * 100).toFixed(0)}% · ` +
        `within one ${(ok ? c.g : c.r)(((gold.withinOne ?? 0) * 100).toFixed(0) + '%')} ` +
        c.d(ago(gold.ranAt)) +
        (ok ? '' : c.r('  ⚠ below the 85% bar — do not ship the catalogue')),
    );
  }
  const spend = state?.totals?.costUsd ?? totalCost;
  if (spend) out.push(`  ${c.b('spend')}     $${spend.toFixed(2)} total` + c.d('  (budget guide: under $20)'));

  return out.join('\n');
}

// ────────────────────────────────────────────────────── persistence ──

function persistenceSection() {
  const out = [c.b('PERSISTENCE')];
  out.push('');

  const alive = psql('select 1');
  if (alive === null) {
    out.push(c.d('  local Postgres not reachable — run `supabase start`'));
    out.push('');
  } else {
    // Migration 006 adds review_status / level_source / level_confidence. Before
    // it lands, fall back to a plain per-level count instead of showing nothing.
    const cols = (
      psql(
        "select string_agg(column_name, ',') from information_schema.columns where table_name='de_words'",
      ) ?? ''
    ).split(',');
    const has006 = ['review_status', 'level_source', 'level_confidence'].every((x) => cols.includes(x));

    if (!has006) {
      out.push(c.y('  migration 006 not applied yet') + c.d(' — showing raw counts only'));
      const raw = psql('select level, count(*) from de_words group by level order by level;');
      if (raw) {
        for (const line of raw.split('\n').filter(Boolean)) {
          const [lvl, count] = line.split('\t');
          out.push(`  ${c.b(lvl.padEnd(14))}${String(count).padStart(8)} ${c.d('words')}`);
        }
      }
      out.push('');
    }

    const levels = has006 && psql(`
      select level,
             count(*) filter (where review_status='reviewed') as reviewed,
             count(*) filter (where review_status='draft')    as draft,
             count(*) filter (where level_source='derived')   as derived,
             round(avg(level_confidence)::numeric, 2)         as conf
        from de_words group by level order by level;`);

    if (levels) {
      out.push(c.d('  de_words        reviewed    draft  derived   avg conf'));
      let tR = 0;
      let tD = 0;
      for (const line of levels.split('\n').filter(Boolean)) {
        const [lvl, reviewed, draft, derived, conf] = line.split('\t');
        tR += Number(reviewed);
        tD += Number(draft);
        const confCell = conf === undefined || conf === '' ? '—' : conf;
        out.push(
          `  ${c.b(lvl.padEnd(14))}${String(reviewed).padStart(8)}${String(draft).padStart(9)}` +
            `${String(derived).padStart(9)}${String(confCell).padStart(11)}`,
        );
      }
      out.push(c.d(`  ${'total'.padEnd(14)}${String(tR).padStart(8)}${String(tD).padStart(9)}`));
      out.push('');
      out.push(
        c.d('  reviewed rows are the only ones deck_words exposes to learners.'),
      );
    }

    // user_words arrives with 006 too, so ask for it only once it exists.
    const hasUserWords =
      psql("select to_regclass('public.user_words') is not null")?.trim() === 't';
    const misc = psql(`
      select
        (select count(*) from de_words)                              as words,
        (select count(*) from de_word_ai)                            as enriched,
        ${hasUserWords ? '(select count(*) from user_words)' : '0'}   as user_words,
        (select count(*) from word_progress)                         as progress,
        (select count(*) from scan_results)                          as scans;`);
    if (misc) {
      const [words, enriched, userWords, progress, scans] = misc.split('\t');
      const cov = Number(words) ? ((100 * Number(enriched)) / Number(words)).toFixed(0) : '0';
      out.push('');
      out.push(
        `  ${c.b('enrichment cache')} ${n(Number(enriched))}/${n(Number(words))} words ${c.d(`(${cov}% — global, one AI call per word ever)`)}`,
      );
      out.push(
        c.d(`  user_words ${n(Number(userWords))} · word_progress ${n(Number(progress))} · scans ${n(Number(scans))}`),
      );
    }
    out.push('');
  }

  // On-disk persistence: sources, seed, gold set.
  const manifest = readJson(join(CONTENT, 'sources', 'MANIFEST.json'));
  const srcCount = manifest ? Object.keys(manifest.files ?? manifest).length : 0;
  out.push(
    `  ${c.b('sources')}          ${srcCount ? c.g(`${srcCount} file(s) with recorded licence + sha256`) : c.d('no MANIFEST.json yet')}`,
  );

  const seed = join(ROOT, 'supabase', 'seeds', '010_de_words_v3.sql');
  out.push(
    `  ${c.b('seed sql')}         ${
      existsSync(seed)
        ? c.g(`${(statSync(seed).size / 1024).toFixed(0)} KB`) + c.d(` · ${ago(statSync(seed).mtime.toISOString())}`)
        : c.d('not generated yet')
    }`,
  );

  const gold = join(CONTENT, 'gold', 'gold.csv');
  out.push(
    `  ${c.b('gold set')}         ${
      existsSync(gold) ? c.g(`${countLines(gold) - 1} words`) : c.d('not built yet')
    }`,
  );

  return out.join('\n');
}

function report() {
  return [
    c.b(`content pipeline · ${new Date().toLocaleTimeString()}`),
    '',
    pipelineSection(),
    '',
    persistenceSection(),
    '',
    c.d('detail: content/state.json · docs/agents/04-data-integrations.md §2 · docs/agents/status/data.md'),
  ].join('\n');
}

if (process.argv.includes('-w') || process.argv.includes('--watch')) {
  const tick = () => process.stdout.write('\x1b[2J\x1b[H' + report() + '\n');
  tick();
  setInterval(tick, 15000);
} else {
  console.log(report());
}
