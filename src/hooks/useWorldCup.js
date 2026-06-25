import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';
const ENDPOINT = `${API_BASE}/api/worldcup`;

/**
 * Fetches World Cup matches (with multi-market data) and derives a flattened
 * list of live arbitrage opportunities across ALL markets (roi > 0).
 */
export default function useWorldCup(intervalMs = 10000) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINT);
      const data = await res.json();
      setMatches(Array.isArray(data) ? data : []);
      setLastUpdate(new Date());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, intervalMs);
    return () => clearInterval(id);
  }, [fetchData, intervalMs]);

  return { matches, loading, error, lastUpdate, refetch: fetchData };
}

/**
 * Flatten every match's markets into a single list of live arbitrage cards
 * (only markets where roi > 0). Sorted by ROI descending.
 */
export function deriveLiveArbitrages(matches) {
  const out = [];
  for (const m of matches) {
    const isPast = new Date(m.scheduledTime) < new Date();
    if (isPast) continue;
    for (const mkt of m.markets || []) {
      if (mkt.roi > 0) {
        out.push({
          id: `${m.eventId}_${mkt.key}`,
          eventId: m.eventId,
          matchName: `${m.home} vs ${m.away}`,
          home: m.home,
          away: m.away,
          league: m.league,
          location: m.location,
          scheduledTime: m.scheduledTime,
          market: mkt,
        });
      }
    }
  }
  out.sort((a, b) => b.market.roi - a.market.roi);
  return out;
}
