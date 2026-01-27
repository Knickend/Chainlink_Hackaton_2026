import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LivePrices {
  btc: number;
  eth: number;
  link: number;
  gold: number;
  silver: number;
  timestamp: string;
}

const DEFAULT_PRICES: LivePrices = {
  btc: 96000,
  eth: 3200,
  link: 22,
  gold: 2650,
  silver: 30,
  timestamp: new Date().toISOString(),
};

export function useLivePrices(refreshInterval = 5 * 60 * 1000) { // Default 5 min
  const [prices, setPrices] = useState<LivePrices>(DEFAULT_PRICES);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPrices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-prices');

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.success && data?.data) {
        setPrices(data.data);
        setLastUpdated(new Date(data.data.timestamp));
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch prices';
      setError(message);
      console.error('Price fetch error:', err);
      toast({
        title: 'Price Update Failed',
        description: 'Using cached prices. Will retry shortly.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval]);

  return {
    prices,
    isLoading,
    lastUpdated,
    error,
    refetch: fetchPrices,
  };
}
