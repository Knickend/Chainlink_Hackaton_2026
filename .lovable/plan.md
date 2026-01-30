

# Fix Exchange Rates Dialog Asset Categorization

## Problem

The Crypto tab is displaying stock/ETF assets (FDM, CL, MIY, AMID, AMDY, etc.) instead of only cryptocurrencies. The Commodities tab only shows Gold and Silver, missing other commodities the user may have (Copper, Wheat, Oil, etc.).

## Root Cause

1. The `price_cache` table correctly stores `asset_type` for each symbol:
   - `stock`: FDM, AMID, AMDY, AMLP, etc.
   - `crypto`: BTC, ETH, AAVE, ADA, etc.  
   - `commodity`: GOLD, SILVER, COPPER, WTI, etc.

2. However, `useLivePrices.ts` loads ALL cached prices into a single `stocks` map, losing the asset type distinction:
   ```typescript
   if ((p.asset_type === 'stock' || p.asset_type === 'commodity' || p.asset_type === 'crypto') ...) {
     stocksMap[p.symbol] = {...}
   }
   ```

3. `ExchangeRatesDialog.tsx` then adds everything from `prices.stocks` to the Crypto tab with only a basic filter excluding GOLD/SILVER.

## Solution

### Approach A: Restructure LivePrices Data (Recommended)

Separate the `stocks` map into three distinct maps with proper typing:

```typescript
export interface LivePrices {
  btc: number;
  eth: number;
  link: number;
  gold: number;
  silver: number;
  timestamp: string;
  stocks?: Record<string, { price: number; change: number; changePercent: number }>;
  crypto?: Record<string, { price: number; change: number; changePercent: number }>;  // NEW
  commodities?: Record<string, { price: number; change: number; changePercent: number; priceUnit?: string }>; // NEW
  forex?: Record<string, number>;
  forexTimestamp?: string;
}
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useLivePrices.ts` | Split the `stocksMap` into three separate maps based on `asset_type` |
| `src/components/ExchangeRatesDialog.tsx` | Update to use separate `crypto` and `commodities` maps |

## Implementation Details

### 1. Update `useLivePrices.ts`

In the cache loading section (around line 185-198), split into three maps:

```typescript
const stocksMap: Record<string, { price: number; change: number; changePercent: number }> = {};
const cryptoMap: Record<string, { price: number; change: number; changePercent: number }> = {};
const commoditiesMap: Record<string, { price: number; change: number; changePercent: number; priceUnit?: string }> = {};

cachedPrices.forEach(p => {
  if (RESERVED_SPOT_SYMBOLS.has(p.symbol)) return;
  
  const priceData = {
    price: Number(p.price),
    change: Number(p.change) || 0,
    changePercent: Number(p.change_percent) || 0,
  };
  
  if (p.asset_type === 'stock') {
    stocksMap[p.symbol] = priceData;
  } else if (p.asset_type === 'crypto') {
    cryptoMap[p.symbol] = priceData;
  } else if (p.asset_type === 'commodity') {
    commoditiesMap[p.symbol] = { ...priceData, priceUnit: p.price_unit };
  }
});
```

Update the `LivePrices` interface and state to include the new maps.

### 2. Update `ExchangeRatesDialog.tsx`

Update the Crypto tab to pull from `prices.crypto` instead of `prices.stocks`:

```typescript
const cryptoAssets = prices ? [
  { name: 'Bitcoin', symbol: 'BTC', price: prices.btc ?? 0, status: 'live' as RateStatus },
  { name: 'Ethereum', symbol: 'ETH', price: prices.eth ?? 0, status: 'live' as RateStatus },
  { name: 'Chainlink', symbol: 'LINK', price: prices.link ?? 0, status: 'live' as RateStatus },
  ...(prices.crypto  // Changed from prices.stocks
    ? Object.entries(prices.crypto)
        .map(([symbol, data]) => ({
          name: symbol,
          symbol,
          price: data.price,
          change: data.changePercent,
          status: 'live' as RateStatus,
        }))
    : []),
] : [];
```

Update the Commodities tab to include all commodities from `prices.commodities`:

```typescript
const commodityAssets = prices ? [
  { name: 'Gold', symbol: 'XAU', price: prices.gold ?? 0, unit: '/oz' },
  { name: 'Silver', symbol: 'XAG', price: prices.silver ?? 0, unit: '/oz' },
  ...(prices.commodities
    ? Object.entries(prices.commodities)
        .filter(([symbol]) => !['GOLD', 'SILVER', 'XAU', 'XAG'].includes(symbol))
        .map(([symbol, data]) => ({
          name: symbol,
          symbol,
          price: data.price,
          unit: data.priceUnit || '',
          change: data.changePercent,
          status: 'live' as RateStatus,
        }))
    : []),
] : [];
```

### 3. Add Stocks Tab (Optional Enhancement)

Since we now have properly separated stock data, consider adding a fourth "Stocks" tab to display the user's stock/ETF prices.

## Expected Result

After this fix:
- **Forex Tab**: Shows currency exchange rates (unchanged)
- **Crypto Tab**: Shows ONLY cryptocurrencies (BTC, ETH, LINK, AAVE, SOL, etc.)
- **Commodities Tab**: Shows Gold, Silver, and any other commodities (Copper, Oil, Wheat, etc.)
- **Stocks Tab** (optional): Shows stock/ETF prices (AAPL, MSFT, FDM, AMID, etc.)

