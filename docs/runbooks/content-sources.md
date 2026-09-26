# Content sources

**Decision: no licensed wordlists.** No Goethe, telc, ÖSD or publisher list is used in this project, and
none will be obtained. Everything below is open-licensed, and CEFR level is *derived* by the ensemble in
`docs/agents/04-data-integrations.md` §2a rather than copied from anyone's list.

Two consequences worth being explicit about:

- **Our levels will not match Goethe's exactly.** A learner cramming for a specific exam will meet words
  in their level's deck that are not on that exam's list. The product claim is "the ~10,000 most useful
  German words, banded by level and ordered by frequency", not "the Goethe A1 list".
- **Frequency rank is an observed property of a corpus, not a creative work.** That is what makes this
  route clean. The ensemble's judgment is our own.

---

## Sources

| Source | Used for | Licence | Verify |
|---|---|---|---|
| **Leipzig Corpora Collection** (German) | the candidate pool and `frequency_rank` — the primary level signal | states CC BY on its download pages | **Confirm the terms on the specific file you download**, and record them in `MANIFEST.json`. Terms differ per corpus and per year. |
| **SUBTLEX-DE** (subtitle frequency) | spoken-vs-written ratio — signal 2 | published for research; terms vary by mirror | Confirm before use. If terms are unclear, drop the signal and note it — the ensemble degrades to three signals rather than blocking. |
| **Wiktionary German** (kaikki.org extract) | ground truth for article, plural, Partizip II in `07_validate.ts` | CC BY-SA | Attribution required if any extract is redistributed. We use it to validate, not to ship. |

**None of these carry CEFR levels.** That is expected — the levels are ours to derive, which is the whole
design. If an openly-licensed CEFR-banded German list does turn up (the EU **KELLY** project is worth
checking, though German coverage and current licence terms need verifying), add it as a *fourth* signal in
the ensemble, never as the sole source of truth.

## Rules for the pipeline

1. **Never scrape.** Use each project's published download endpoint. If there isn't one, the source is out.
2. **Record provenance per file** in `content/sources/MANIFEST.json`: URL, retrieval date, licence string,
   SHA256. `08_seed.ts` writes a `source` value per row so any source can be swapped later without a rebuild.
3. **Verify the licence at download time, not from this document.** This runbook records the decision;
   the download page records the terms, and they change.
4. If a source's terms turn out narrower than assumed, **stop and write it in `docs/agents/status/data.md`.**
   Do not substitute a different source unilaterally.

## Open question for the lead

PRD Q5 (commercial vs personal release) no longer gates the *wordlist*, since nothing here is licensed
content. It still applies to anything redistributed under CC BY-SA — currently only the Wiktionary extract,
which stays a build-time input and is not shipped. Revisit if that changes.

*Not legal advice — confirm terms with each source.*
