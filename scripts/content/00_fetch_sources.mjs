#!/usr/bin/env node
/**
 * Stage 00 — fetch the open corpora and record provenance.
 *
 *   node scripts/content/00_fetch_sources.mjs
 *
 * Writes content/sources/* and content/sources/MANIFEST.json (url, licence,
 * retrieved-at, sha256 per file). Licences are recorded as claimed by each
 * project; verify them on the download page before any public release
 * (docs/runbooks/content-sources.md).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { SOURCES, ensureDirs, stage, writeState, readState } from './_lib.mjs';

const FILES = [
  {
    name: 'leipzig_news_2023_100k.tar.gz',
    url: 'https://downloads.wortschatz-leipzig.de/corpora/deu_news_2023_100K.tar.gz',
    licence: 'CC BY (Leipzig Corpora Collection) — verify on the download page',
    role: 'written frequency (primary level signal)',
  },
  {
    name: 'opensubtitles_de_50k.txt',
    url: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt',
    licence: 'MIT (repo) over OpenSubtitles/OPUS data (CC BY-SA)',
    role: 'spoken frequency (signal 2)',
  },
];

const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

await stage('00_fetch_sources', async () => {
  ensureDirs();
  const manifest = { retrievedAt: new Date().toISOString(), files: {} };

  for (const f of FILES) {
    const dest = join(SOURCES, f.name);
    if (existsSync(dest)) {
      console.log(`  cached  ${f.name}`);
    } else {
      console.log(`  fetch   ${f.name}`);
      execFileSync('curl', ['-sSL', '--max-time', '180', '-o', dest, f.url], { stdio: 'inherit' });
    }
    manifest.files[f.name] = {
      url: f.url,
      licence: f.licence,
      role: f.role,
      bytes: statSync(dest).size,
      sha256: sha256(dest),
    };
  }

  // Unpack the Leipzig words list: <id>\t<word>\t<frequency>, most frequent first.
  const tgz = join(SOURCES, 'leipzig_news_2023_100k.tar.gz');
  const wordsOut = join(SOURCES, 'leipzig_words.tsv');
  if (!existsSync(wordsOut)) {
    const listing = execFileSync('tar', ['tzf', tgz], { encoding: 'utf8' }).split('\n');
    const member = listing.find((l) => l.endsWith('-words.txt'));
    if (!member) throw new Error('no *-words.txt inside the Leipzig archive');
    const data = execFileSync('tar', ['xzfO', tgz, member], { encoding: 'utf8', maxBuffer: 1 << 28 });
    writeFileSync(wordsOut, data);
    console.log(`  extract ${member} → leipzig_words.tsv`);
  }
  manifest.files['leipzig_words.tsv'] = {
    derivedFrom: 'leipzig_news_2023_100k.tar.gz',
    licence: FILES[0].licence,
    role: FILES[0].role,
    bytes: statSync(wordsOut).size,
    sha256: sha256(wordsOut),
  };

  writeFileSync(join(SOURCES, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  const s = readState();
  writeState(s);
  return { out: Object.keys(manifest.files).length, note: 'open corpora only; no licensed wordlist' };
});
