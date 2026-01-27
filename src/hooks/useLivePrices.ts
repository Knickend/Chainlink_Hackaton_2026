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
  stocks?: Record<string, { price: number; change: number; changePercent: number }>;
}

const DEFAULT_PRICES: LivePrices = {
  btc: 96000,
  eth: 3200,
  link: 22,
  gold: 2650,
  silver: 30,
  timestamp: new Date().toISOString(),
  stocks: {},
};

export function useLivePrices(refreshInterval = 5 * 60 * 1000) { // Default 5 min
  const [prices, setPrices] = useState<LivePrices>(DEFAULT_PRICES);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const { toast } = useToast();

  // Load cached prices from database on startup
  const loadCachedPrices = useCallback(async () => {
    try {
      const { data: cachedPrices, error: cacheError } = await supabase
        .from('price_cache')
        .select('*');

      if (cacheError) {
        console.error('Error loading cached prices:', cacheError);
        return false;
      }

      if (cachedPrices && cachedPrices.length > 0) {
        const btcPrice = cachedPrices.find(p => p.symbol === 'BTC');
        const ethPrice = cachedPrices.find(p => p.symbol === 'ETH');
        const linkPrice = cachedPrices.find(p => p.symbol === 'LINK');
        const goldPrice = cachedPrices.find(p => p.symbol === 'GOLD');
        const silverPrice = cachedPrices.find(p => p.symbol === 'SILVER');

        // Build stocks object from cached stock/commodity prices
        const stocksMap: Record<string, { price: number; change: number; changePercent: number }> = {};
        cachedPrices.forEach(p => {
          if (p.asset_type === 'stock' || p.asset_type === 'commodity') {
            stocksMap[p.symbol] = {
              price: Number(p.price),
              change: Number(p.change) || 0,
              changePercent: Number(p.change_percent) || 0,
            };
          }
        });

        const oldestUpdate = Math.min(...cachedPrices.map(p => new Date(p.updated_at).getTime()));

        setPrices({
          btc: btcPrice ? Number(btcPrice.price) : DEFAULT_PRICES.btc,
          eth: ethPrice ? Number(ethPrice.price) : DEFAULT_PRICES.eth,
          link: linkPrice ? Number(linkPrice.price) : DEFAULT_PRICES.link,
          gold: goldPrice ? Number(goldPrice.price) : DEFAULT_PRICES.gold,
          silver: silverPrice ? Number(silverPrice.price) : DEFAULT_PRICES.silver,
          timestamp: new Date(oldestUpdate).toISOString(),
          stocks: stocksMap,
        });
        setLastUpdated(new Date(oldestUpdate));
        setIsCached(true);
        console.log('Loaded cached prices from database');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to load cached prices:', err);
      return false;
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-prices');

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.success && data?.data) {
        setPrices((prev) => ({
          ...data.data,
          stocks: prev.stocks, // Preserve stock prices
        }));
        setLastUpdated(new Date(data.data.timestamp));
        setIsCached(data.cached === true);
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

  // Add or update a stock price
  const addStockPrice = useCallback((symbol: string, price: number, change: number, changePercent: number) => {
    setPrices((prev) => ({
      ...prev,
      stocks: {
        ...prev.stocks,
        [symbol.toUpperCase()]: { price, change, changePercent },
      },
    }));
  }, []);

  // Initial load: first try cache, then fetch live
  useEffect(() => {
    const init = async () => {
      await loadCachedPrices();
      fetchPrices();
    };
    init();
  }, [loadCachedPrices, fetchPrices]);

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
    isCached,
    refetch: fetchPrices,
    addStockPrice,
  };
}
