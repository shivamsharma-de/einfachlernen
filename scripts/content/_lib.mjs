/**
 * Shared plumbing for the content pipeline.
 *
 * Every stage is resumable and records itself in content/state.json, which is
 * what `npm run content:status` renders. Nothing here calls a model on import —
 * stages do that explicitly.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const CONTENT = join(ROOT, 'content');
export const SOURCES = join(CONTENT, 'sources');
export const STAGE = join(CONTENT, 'stage');
export const GOLD = join(CONTENT, 'gold');
export const STATE_PATH = join(CONTENT, 'state.json');

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** Cumulative frequency-rank targets per level (PRD F5.2). */
export const BANDS = [
  ['A1', 650],
  ['A2', 1300],
  ['B1', 2400],
  ['B2', 4400],
  ['C1', 7400],
  ['C2', 10000],
];

/** USD per 1M tokens. Keep in step with the pricing page. */
export const PRICES = {
  'claude-haiku-4-5': { in: 1.0, out: 5.0 },
  'claude-sonnet-5': { in: 2.0, out: 10.0 },
  'claude-opus-5': { in: 5.0, out: 25.0 },
};

export const ensureDirs = () => {
  for (const d of [CONTENT, SOURCES, STAGE, GOLD]) mkdirSync(d, { recursive: true });
};

// ───────────────────────────────────────────────────────────── state ──

export function readState() {
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { updatedAt: null, stages: {}, totals: { costUsd: 0, words: 0 } };
  }
}

export function writeState(s) {
  ensureDirs();
  s.updatedAt = new Date().toISOString();
  writeFileSync(STATE_PATH, JSON.stringify(s, null, 2) + '\n');
}

export function patchState(fn) {
  const s = readState();
  fn(s);
  writeState(s);
  return s;
}

/**
 * Wrap a stage so its status, timing, counts, spend and errors always land in
 * state.json — including when it throws, so the next run can resume.
 */
export async function stage(name, fn) {
  ensureDirs();
  const started = new Date().toISOString();
  patchState((s) => {
    s.stages[name] = { ...(s.stages[name] ?? {}), status: 'running', startedAt: started, error: null };
  });
  const t0 = Date.now();
  try {
    const result = (await fn()) ?? {};
    patchState((s) => {
      s.stages[name] = {
        ...(s.stages[name] ?? {}),
        ...result,
        status: result.status ?? 'complete',
        startedAt: started,
        finishedAt: new Date().toISOString(),
        error: null,
      };
      s.totals ??= { costUsd: 0, words: 0 };
      s.totals.costUsd = Object.values(s.stages).reduce((a, x) => a + (x.costUsd ?? 0), 0);
    });
    console.log(`\n✓ ${name} finished in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return result;
  } catch (err) {
    patchState((s) => {
      s.stages[name] = {
        ...(s.stages[name] ?? {}),
        status: 'failed',
        startedAt: started,
        finishedAt: new Date().toISOString(),
        error: String(err?.message ?? err).slice(0, 300),
      };
    });
    console.error(`\n✗ ${name} failed: ${err?.message ?? err}`);
    throw err;
  }
}

// ────────────────────────────────────────────────────────────── jsonl ──

export function writeJsonl(path, rows) {
  ensureDirs();
  const out = createWriteStream(path);
  for (const r of rows) out.write(JSON.stringify(r) + '\n');
  out.end();
  return new Promise((res, rej) => {
    out.on('finish', res);
    out.on('error', rej);
  });
}

export function readJsonl(path) {
  if (!existsSync(path)) throw new Error(`missing ${path} — run the previous stage first`);
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

// ──────────────────────────────────────────────────────────── model ──

/** Built lazily: requireKey() may still need to load the key from the env file. */
let _client = null;
const client = () => (_client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));

export function costOf(model, usage) {
  const p = PRICES[model];
  if (!p) return 0;
  return ((usage.input_tokens ?? 0) * p.in + (usage.output_tokens ?? 0) * p.out) / 1e6;
}

/**
 * One structured-output call. `schema` is raw JSON Schema — the shape the SDK's
 * zod helper emits, used directly so the pipeline needs no zod dependency.
 */
export async function ask({ model, system, user, schema, maxTokens = 8000, effort }) {
  const res = await client().messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { format: { type: 'json_schema', schema }, ...(effort ? { effort } : {}) },
  });
  const text = res.content.find((b) => b.type === 'text')?.text ?? '';
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* caller decides what an unparseable response means */
  }
  return { parsed, usage: res.usage, cost: costOf(model, res.usage), stop: res.stop_reason };
}

/** Bounded-concurrency map with a live progress line. */
export async function pmap(items, limit, fn, label = '') {
  const out = new Array(items.length);
  let next = 0;
  let done = 0;
  const tick = () => {
    done++;
    if (label && (done % 5 === 0 || done === items.length)) {
      process.stdout.write(`\r  ${label}: ${done}/${items.length}`);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
        tick();
      }
    }),
  );
  if (label) process.stdout.write('\n');
  return out;
}

/** Split an array into fixed-size chunks — this is the token-efficiency lever. */
export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split('=').slice(1).join('=');
  return process.argv.includes(`--${name}`) ? true : fallback;
}

export function requireKey() {
  if (process.env.ANTHROPIC_API_KEY) return;
  const envFile = join(ROOT, 'supabase', 'functions', '.env.local');
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split('\n')) {
      const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set — add it to supabase/functions/.env.local');
  }
}

/** The hard rule from the brief: never spend without showing the bill first. */
export async function confirmSpend({ words, requests, estUsd, what }) {
  console.log(`\n  ${what}`);
  console.log(`    words          ${words.toLocaleString()}`);
  console.log(`    requests       ${requests.toLocaleString()}`);
  console.log(`    est. cost      $${estUsd.toFixed(2)}`);
  if (arg('yes')) {
    console.log('    --yes given, proceeding.\n');
    return true;
  }
  console.log('\n  Re-run with --yes to proceed.\n');
  return false;
}
