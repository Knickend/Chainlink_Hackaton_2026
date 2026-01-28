import { useState, useEffect, useCallback, useRef } from 'react';
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

const RESERVED_SPOT_SYMBOLS = new Set(['BTC', 'ETH', 'LINK', 'GOLD', 'SILVER', 'XAU', 'XAG']);

const DEFAULT_PRICES: LivePrices = {
  btc: 96000,
  eth: 3200,
  link: 22,
  gold: 2650,
  silver: 30,
  timestamp: new Date().toISOString(),
  stocks: {},
};

export function useLivePrices(refreshInterval = 15 * 60 * 1000, additionalCryptoSymbols?: string[]) {
  const [prices, setPrices] = useState<LivePrices>(DEFAULT_PRICES);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const { toast } = useToast();
  const hasFetchedRef = useRef(false);
  const hasFetchedAdditionalRef = useRef(false);
  const previousSymbolsRef = useRef<string>('');

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

  // Fetch live prices from edge function
  const fetchPrices = useCallback(async (showToast = true) => {
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
          stocks: prev.stocks,
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
      if (showToast) {
        toast({
          title: 'Price Update Failed',
          description: 'Using cached prices. Will retry shortly.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch additional crypto prices
  const fetchAdditionalCryptoPrices = useCallback(async (symbols: string[]) => {
    if (!symbols || symbols.length === 0) return;
    
    // Filter out symbols already in dedicated fields
    const symbolsToFetch = symbols.filter(s => 
      !['BTC', 'ETH', 'LINK'].includes(s.toUpperCase())
    );
    
    if (symbolsToFetch.length === 0) return;
    
    console.log('Fetching additional crypto prices for:', symbolsToFetch);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-crypto-prices', {
        body: { symbols: symbolsToFetch },
      });

      if (fnError) {
        console.error('Additional crypto price fetch error:', fnError);
        return;
      }

      if (data?.success && data?.data) {
        setPrices((prev) => {
          const updatedStocks = { ...prev.stocks };
          for (const [symbol, priceData] of Object.entries(data.data)) {
            const pd = priceData as { price: number; change: number; changePercent: number };
            updatedStocks[symbol.toUpperCase()] = {
              price: pd.price,
              change: pd.change,
              changePercent: pd.changePercent,
            };
          }
          return { ...prev, stocks: updatedStocks };
        });
        console.log('Additional crypto prices loaded:', Object.keys(data.data).join(', '));
      }
    } catch (err) {
      console.error('Failed to fetch additional crypto prices:', err);
    }
  }, []);

  // Initial load: first try cache, then fetch live
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const loadCachedPrices = async () => {
      try {
        const { data: cachedPrices, error: cacheError } = await supabase
          .from('price_cache')
          .select('*');

        if (cacheError) {
          console.error('Error loading cached prices:', cacheError);
          return;
        }

        if (cachedPrices && cachedPrices.length > 0) {
          const btcPrice = cachedPrices.find(p => p.symbol === 'BTC');
          const ethPrice = cachedPrices.find(p => p.symbol === 'ETH');
          const linkPrice = cachedPrices.find(p => p.symbol === 'LINK');
          const goldPrice = cachedPrices.find(p => p.symbol === 'GOLD');
          const silverPrice = cachedPrices.find(p => p.symbol === 'SILVER');

          const stocksMap: Record<string, { price: number; change: number; changePercent: number }> = {};
          cachedPrices.forEach(p => {
            // Keep our canonical spot symbols (BTC/ETH/LINK/GOLD/SILVER) out of the per-ticker map
            // so they don't override the dedicated livePrices fields.
            // Include crypto assets in the stocks map for dynamic crypto symbols
            if ((p.asset_type === 'stock' || p.asset_type === 'commodity' || p.asset_type === 'crypto') && !RESERVED_SPOT_SYMBOLS.has(p.symbol)) {
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
          setIsLoading(false);
          console.log('Loaded cached prices from database');
        }
      } catch (err) {
        console.error('Failed to load cached prices:', err);
      }
    };

    // Load cache first, then fetch live prices
    loadCachedPrices().then(() => {
      fetchPrices(false);
    });
  }, [fetchPrices]);

  // Fetch additional crypto prices when symbols change
  useEffect(() => {
    if (!additionalCryptoSymbols || additionalCryptoSymbols.length === 0) return;
    
    const symbolsKey = additionalCryptoSymbols.sort().join(',');
    
    // Only fetch if symbols have changed or it's the first fetch
    if (symbolsKey === previousSymbolsRef.current && hasFetchedAdditionalRef.current) return;
    
    previousSymbolsRef.current = symbolsKey;
    hasFetchedAdditionalRef.current = true;
    
    fetchAdditionalCryptoPrices(additionalCryptoSymbols);
  }, [additionalCryptoSymbols, fetchAdditionalCryptoPrices]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrices(true);
      if (additionalCryptoSymbols && additionalCryptoSymbols.length > 0) {
        fetchAdditionalCryptoPrices(additionalCryptoSymbols);
      }
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrices, fetchAdditionalCryptoPrices, additionalCryptoSymbols, refreshInterval]);

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
