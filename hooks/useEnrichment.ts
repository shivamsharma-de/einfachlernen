import { useEffect, useState } from 'react';
import { enrichWord, WordEnrichment } from '../lib/ai';

/** Fetches the AI entry for a word (PRD v2 D3).
 *
 *  `enabled` gates the call so the deck only spends a generation once the card
 *  is actually flipped — fetching on mount would enrich every card in a session
 *  the learner may never reach.
 *
 *  Failure is not surfaced as an error state: the card already shows the seeded
 *  translation and example, so enrichment is strictly additive. */
export function useEnrichment(wordId: string | undefined, enabled: boolean) {
  const [data, setData] = useState<WordEnrichment | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wordId || !enabled) return;

    let cancelled = false;
    setData(null);
    setLoading(true);

    void (async () => {
      const result = await enrichWord(wordId);
      if (cancelled) return;
      setData(result.ok ? result.data : null);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [wordId, enabled]);

  return { enrichment: data, loading };
}
