

# Implement Live Forex Rate Fetching

## Problem Statement

Forex exchange rates are currently **hardcoded static values** in `src/lib/types.ts`:

```typescript
export const FOREX_RATES_TO_USD: Record<BankingCurrency, number> = {
  USD: 1,
  EUR: 1.08,  // Static - never updates
  GBP: 1.27,  // Static - never updates
  // ... 20 currencies total
};
```

These rates are used across the app for:
- Banking account USD conversions
- Income/expense totals
- Debt calculations
- Display unit conversions (EUR, GBP)

This means users see potentially outdated exchange rates without any indication that the values are approximate.

## Solution Overview

Implement live forex rate fetching following the same proven pattern used for crypto and commodities:

1. **Edge Function**: Create `fetch-forex-rates` to fetch live rates with caching
2. **Database**: Store forex rates in `price_cache` table (reuse existing infrastructure)
3. **Frontend Hook**: Extend `useLivePrices` to include forex rates
4. **Dynamic Rates**: Replace static `FOREX_RATES_TO_USD` with live data
5. **Visual Indicator**: Show forex data freshness in PriceIndicator

## Architecture

```text
+------------------+     +--------------------+     +---------------+
|  useLivePrices   | --> | fetch-forex-rates  | --> | ExchangeRate  |
|  (frontend hook) |     | (edge function)    |     | API (free)    |
+------------------+     +--------------------+     +---------------+
         |                        |
         v                        v
+------------------+     +--------------------+
| UI Components    |     | price_cache table  |
| (DebtCard, etc)  |     | (existing)         |
+------------------+     +--------------------+
```

## API Selection

**Recommended: Frankfurter API** (free, no API key required)
- Base URL: `https://api.frankfurter.app`
- Rate limits: Reasonable for our use case
- Coverage: All 20 currencies we support
- Endpoint: `/latest?from=USD&to=EUR,GBP,CHF,...`

Alternative: exchangerate-api.com (requires free API key)

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/fetch-forex-rates/index.ts` | Edge function to fetch and cache forex rates |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/config.toml` | Add `fetch-forex-rates` function config |
| `src/hooks/useLivePrices.ts` | Add forex rates to LivePrices interface and fetch logic |
| `src/lib/types.ts` | Export forex rates as mutable or provide getter function |
| `src/components/PriceIndicator.tsx` | Show forex update status in tooltip |

## Detailed Implementation

### 1. Edge Function: `fetch-forex-rates/index.ts`

```typescript
// Structure
const FOREX_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour (forex updates less frequently)
const SUPPORTED_CURRENCIES = ['EUR', 'GBP', 'CHF', 'JPY', 'CAD', ...];

// Flow:
// 1. Check price_cache for forex rates with asset_type='forex'
// 2. If cache valid (< 1 hour old), return cached rates
// 3. If cache expired, fetch from Frankfurter API
// 4. Validate response and update cache
// 5. Return rates to frontend
```

Response format:
```json
{
  "success": true,
  "data": {
    "EUR": 0.92,
    "GBP": 0.79,
    "CHF": 0.88,
    ...
  },
  "timestamp": "2026-01-30T19:00:00Z",
  "cached": false
}
```

### 2. Database: Reuse `price_cache` Table

Store forex rates with `asset_type = 'forex'`:

| symbol | price | asset_type | updated_at |
|--------|-------|------------|------------|
| EUR | 0.92 | forex | 2026-01-30 |
| GBP | 0.79 | forex | 2026-01-30 |

No schema changes needed - existing table structure works perfectly.

### 3. Frontend: Extend `useLivePrices`

Update the `LivePrices` interface:

```typescript
export interface LivePrices {
  btc: number;
  eth: number;
  link: number;
  gold: number;
  silver: number;
  timestamp: string;
  stocks?: Record<string, { price: number; change: number; changePercent: number }>;
  forex?: Record<string, number>;  // NEW: { EUR: 0.92, GBP: 0.79, ... }
}
```

Add `fetchForexRates()` function similar to `fetchAdditionalCryptoPrices()`.

### 4. Dynamic Forex Rates

Create a function to get current forex rates (live or fallback to static):

```typescript
// In types.ts or new forex.ts
export function getForexRateToUSD(currency: string, liveRates?: Record<string, number>): number {
  // Live rate takes priority
  if (liveRates && liveRates[currency]) {
    return 1 / liveRates[currency]; // API returns USD→X, we need X→USD
  }
  // Fallback to static rates
  return FOREX_RATES_TO_USD[currency as BankingCurrency] || 1;
}
```

### 5. Update Components

Components that use forex rates will receive them via props from the parent:

```typescript
// Example: DebtOverviewCard
interface DebtOverviewCardProps {
  // ... existing props
  forexRates?: Record<string, number>;  // Pass from useLivePrices
}

// Use in conversion:
const rate = forexRates?.[currency] ?? FOREX_RATES_TO_USD[currency];
```

### 6. PriceIndicator Enhancement

Add forex status to the tooltip:

```text
Live Prices Active
├── Crypto: 5m ago
├── Commodities: 15m ago
└── Forex: 45m ago    <- NEW
```

## Cache TTL Strategy

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Crypto | 15 min | Volatile, free API |
| Commodities | 30 min | Paid API (Perplexity) |
| **Forex** | **60 min** | **Stable, free API** |

Forex rates change slowly throughout the day, so hourly updates provide good accuracy without excessive API calls.

## User Experience

Before:
- Users see static rates without knowing they're approximate
- EUR/GBP display units use outdated conversions

After:
- Forex rates update automatically every hour
- PriceIndicator shows when forex was last refreshed
- Users can manually refresh all prices including forex
- Fallback to static rates if API fails (graceful degradation)

## Summary

This implementation:
1. Follows the existing price-fetching pattern (cache-first, edge function, graceful fallback)
2. Reuses the `price_cache` infrastructure with no schema changes
3. Uses a free API requiring no additional configuration
4. Updates forex rates hourly for accuracy without excessive calls
5. Provides visual feedback about data freshness

