import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PriceData {
  price: number;
  change: number;
  changePercent: number;
}

export interface CommodityPriceData extends PriceData {
  priceUnit?: string;
}

export interface LivePrices {
  btc: number;
  eth: number;
  link: number;
  gold: number;
  silver: number;
  timestamp: string;
  stocks?: Record<string, PriceData>;
  crypto?: Record<string, PriceData>;
  commodities?: Record<string, CommodityPriceData>;
  forex?: Record<string, number>;
  forexTimestamp?: string;
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
  crypto: {},
  commodities: {},
  forex: { USD: 1 },
  forexTimestamp: new Date().toISOString(),
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
  const hasFetchedForexRef = useRef(false);
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
          crypto: prev.crypto,
          forex: prev.forex,
          forexTimestamp: prev.forexTimestamp,
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
          const updatedCrypto = { ...prev.crypto };
          for (const [symbol, priceData] of Object.entries(data.data)) {
            const pd = priceData as { price: number; change: number; changePercent: number };
            updatedCrypto[symbol.toUpperCase()] = {
              price: pd.price,
              change: pd.change,
              changePercent: pd.changePercent,
            };
          }
          return { ...prev, crypto: updatedCrypto };
        });
        console.log('Additional crypto prices loaded:', Object.keys(data.data).join(', '));
      }
    } catch (err) {
      console.error('Failed to fetch additional crypto prices:', err);
    }
  }, []);

  // Fetch forex rates
  const fetchForexRates = useCallback(async () => {
    console.log('Fetching forex rates...');
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-forex-rates');

      if (fnError) {
        console.error('Forex rate fetch error:', fnError);
        return;
      }

      if (data?.success && data?.data) {
        setPrices((prev) => ({
          ...prev,
          forex: data.data,
          forexTimestamp: data.timestamp || new Date().toISOString(),
        }));
        console.log('Forex rates loaded:', Object.keys(data.data).length, 'currencies');
      }
    } catch (err) {
      console.error('Failed to fetch forex rates:', err);
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

          const stocksMap: Record<string, PriceData> = {};
          const cryptoMap: Record<string, PriceData> = {};
          const commoditiesMap: Record<string, CommodityPriceData> = {};
          const forexMap: Record<string, number> = { USD: 1 };
          
          cachedPrices.forEach(p => {
            // Skip reserved spot symbols - they have dedicated fields
            if (RESERVED_SPOT_SYMBOLS.has(p.symbol)) return;
            
            const priceData: PriceData = {
              price: Number(p.price),
              change: Number(p.change) || 0,
              changePercent: Number(p.change_percent) || 0,
            };
            
            // Route to appropriate map based on asset_type
            if (p.asset_type === 'stock') {
              stocksMap[p.symbol] = priceData;
            } else if (p.asset_type === 'crypto') {
              cryptoMap[p.symbol] = priceData;
            } else if (p.asset_type === 'commodity') {
              commoditiesMap[p.symbol] = { ...priceData, priceUnit: p.price_unit || undefined };
            } else if (p.asset_type === 'forex') {
              forexMap[p.symbol] = Number(p.price);
            }
          });

          const oldestUpdate = Math.min(...cachedPrices.map(p => new Date(p.updated_at).getTime()));
          
          // Find the oldest forex update for forex-specific timestamp
          const forexPrices = cachedPrices.filter(p => p.asset_type === 'forex');
          const forexUpdate = forexPrices.length > 0 
            ? Math.min(...forexPrices.map(p => new Date(p.updated_at).getTime()))
            : oldestUpdate;

          setPrices({
            btc: btcPrice ? Number(btcPrice.price) : DEFAULT_PRICES.btc,
            eth: ethPrice ? Number(ethPrice.price) : DEFAULT_PRICES.eth,
            link: linkPrice ? Number(linkPrice.price) : DEFAULT_PRICES.link,
            gold: goldPrice ? Number(goldPrice.price) : DEFAULT_PRICES.gold,
            silver: silverPrice ? Number(silverPrice.price) : DEFAULT_PRICES.silver,
            timestamp: new Date(oldestUpdate).toISOString(),
            stocks: stocksMap,
            crypto: cryptoMap,
            commodities: commoditiesMap,
            forex: Object.keys(forexMap).length > 0 ? forexMap : { USD: 1 },
            forexTimestamp: new Date(forexUpdate).toISOString(),
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

    // Load cache first, then fetch live prices and forex
    loadCachedPrices().then(() => {
      fetchPrices(false);
      fetchForexRates();
    });
  }, [fetchPrices, fetchForexRates]);

  // Initial forex fetch
  useEffect(() => {
    if (hasFetchedForexRef.current) return;
    hasFetchedForexRef.current = true;
    // Forex is fetched in the main useEffect above
  }, []);

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

  // Periodic refresh for prices and crypto
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrices(true);
      if (additionalCryptoSymbols && additionalCryptoSymbols.length > 0) {
        fetchAdditionalCryptoPrices(additionalCryptoSymbols);
      }
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrices, fetchAdditionalCryptoPrices, additionalCryptoSymbols, refreshInterval]);

  // Periodic refresh for forex (every hour)
  useEffect(() => {
    const forexInterval = setInterval(() => {
      fetchForexRates();
    }, 60 * 60 * 1000); // 1 hour
    return () => clearInterval(forexInterval);
  }, [fetchForexRates]);

  // Manual refetch that includes forex
  const refetchAll = useCallback(async (showToast = true) => {
    await Promise.all([
      fetchPrices(showToast),
      fetchForexRates(),
      additionalCryptoSymbols && additionalCryptoSymbols.length > 0 
        ? fetchAdditionalCryptoPrices(additionalCryptoSymbols) 
        : Promise.resolve(),
    ]);
  }, [fetchPrices, fetchForexRates, fetchAdditionalCryptoPrices, additionalCryptoSymbols]);

  return {
    prices,
    isLoading,
    lastUpdated,
    error,
    isCached,
    refetch: refetchAll,
    addStockPrice,
  };
}
