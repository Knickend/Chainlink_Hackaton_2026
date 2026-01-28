
# Fetch Prices for All Crypto Assets

## Overview
Extend the price fetching system to automatically fetch live prices for ALL cryptocurrency assets the user owns, not just BTC, ETH, and LINK. When a user has Solana, Cardano, or any other crypto, the system will fetch current prices on page load.

## Current Architecture
- `fetch-prices` edge function: Only fetches BTC, ETH, LINK (CoinGecko) + GOLD, SILVER (Perplexity)
- `price_cache` table: Stores all cached prices (crypto, stocks, commodities)
- `useLivePrices` hook: Loads from cache, has `stocks` map for non-hardcoded symbols
- Price lookup: Falls back to `livePrices.stocks[symbol]` for unknown crypto

## Problem
When a user owns SOL, ADA, or other crypto, prices aren't actively fetched - they only exist if previously searched. This means portfolio values may show $0 or stale data for these assets.

## Solution

### 1. Create New Edge Function: `fetch-crypto-prices`

A dedicated function to fetch prices for any list of crypto symbols using CoinGecko API.

**Endpoint:** `POST /fetch-crypto-prices`
**Request Body:**
```json
{ "symbols": ["SOL", "ADA", "DOT", "AVAX"] }
```

**Logic:**
- Map symbols to CoinGecko IDs (e.g., SOL -> solana, ADA -> cardano)
- Use CoinGecko's batch endpoint: `/simple/price?ids=solana,cardano&vs_currencies=usd`
- Cache results to `price_cache` table
- Return prices and 24h change data

**CoinGecko ID Mapping (expandable):**
| Symbol | CoinGecko ID |
|--------|--------------|
| SOL | solana |
| ADA | cardano |
| DOT | polkadot |
| AVAX | avalanche-2 |
| MATIC | matic-network |
| ATOM | cosmos |
| UNI | uniswap |
| AAVE | aave |
| ... | (lookup via CoinGecko API) |

### 2. Extend `useLivePrices` Hook

Add functionality to fetch prices for additional crypto symbols.

**New Parameter:**
```typescript
function useLivePrices(
  refreshInterval = 15 * 60 * 1000,
  additionalCryptoSymbols?: string[]  // NEW
)
```

**New Behavior:**
- On mount: If `additionalCryptoSymbols` provided, call `fetch-crypto-prices`
- Merge results into `prices.stocks` map
- Re-fetch on interval along with main prices

### 3. Update Index.tsx Integration

Pass user's crypto symbols to the `useLivePrices` hook.

```typescript
// Extract unique crypto symbols from user's assets
const cryptoSymbols = useMemo(() => {
  return assets
    .filter(a => a.category === 'crypto' && a.symbol)
    .map(a => a.symbol!.toUpperCase())
    .filter(s => !['BTC', 'ETH', 'LINK'].includes(s)); // Exclude hardcoded ones
}, [assets]);

const { prices } = useLivePrices(15 * 60 * 1000, cryptoSymbols);
```

## Technical Details

### CoinGecko API Integration
- Free tier: 30 calls/minute, no API key needed
- Batch endpoint supports up to 250 coins per request
- Response includes: current price, 24h change, 24h change %

**Sample Response:**
```json
{
  "solana": {
    "usd": 142.50,
    "usd_24h_change": 3.45
  },
  "cardano": {
    "usd": 0.65,
    "usd_24h_change": -1.23
  }
}
```

### Fallback Strategy
1. Check `price_cache` first (same 15-min TTL as other crypto)
2. If cache valid, return cached prices
3. If cache stale, fetch from CoinGecko
4. If CoinGecko fails, return cached values (graceful degradation)

### Symbol Resolution
For unknown symbols, use CoinGecko's search API to find the correct ID:
```
GET /search?query=SOL
```
This will be done once per unknown symbol and cached.

## Files to Create/Modify

| File | Changes |
|------|---------|
| `supabase/functions/fetch-crypto-prices/index.ts` | NEW: Edge function for batch crypto price fetching |
| `src/hooks/useLivePrices.ts` | Add `additionalCryptoSymbols` parameter and fetch logic |
| `src/pages/Index.tsx` | Pass crypto symbols to useLivePrices |

## Data Flow

```text
User loads app
       |
       v
usePortfolioData loads assets
       |
       v
Extract crypto symbols [SOL, ADA, DOT]
       |
       v
useLivePrices(symbols)
       |
       +---> fetch-prices (BTC, ETH, LINK, GOLD, SILVER)
       |
       +---> fetch-crypto-prices([SOL, ADA, DOT])
                    |
                    v
              Check price_cache
                    |
          +---------+---------+
          | Cache valid       | Cache stale
          v                   v
      Return cached     CoinGecko API
                              |
                              v
                        Update cache
                              |
                              v
                        Return prices
       |
       v
Merge all prices into livePrices.stocks
       |
       v
usePortfolio calculates asset values
```

## Edge Cases

- **Unknown symbol:** Use CoinGecko search to resolve, cache the mapping
- **Rate limit:** Batch requests (max 250 coins), respect 30/min limit
- **API failure:** Use cached prices, show "prices may be stale" indicator
- **New asset added:** Trigger fetch for new symbol immediately

## Cache Strategy

Same 15-minute TTL as existing crypto (BTC, ETH, LINK). The `price_cache` table already supports this - we just add more rows for additional symbols.
