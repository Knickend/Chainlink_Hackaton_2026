import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TickerResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
  price?: number;
  change?: number;
  changePercent?: number;
  priceUnit?: string; // e.g., "per oz" for commodities
}

export type AssetSearchType = 'stocks' | 'crypto' | 'commodities';

export function useTickerSearch() {
  const [results, setResults] = useState<TickerResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, assetType: AssetSearchType = 'stocks') => {
    if (!query || query.length < 1) {
      setResults([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-ticker', {
        body: { query, assetType },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.success) {
        setResults(data.data || []);
      } else {
        throw new Error(data?.error || 'Search failed');
      }
    } catch (err) {
      console.error('Ticker search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clearResults,
  };
}
