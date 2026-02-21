

# Speed Up Chainlink Price Feed Loading with DB Cache

## Problem

When opening the Chainlink tab, it calls the edge function which makes live RPC calls to 8 contracts across 2 networks. This takes several seconds. The 30s in-memory cache only helps on repeat calls within the same edge function isolate.

## Solution: Instant load from database, refresh in background

The edge function already upserts results to `price_cache` (with `asset_type = 'chainlink'`). The fix is to serve cached DB results immediately, then refresh on-chain data in the background.

## Changes

### 1. Edge function: return DB cache first, refresh async

**`supabase/functions/fetch-chainlink-feeds/index.ts`**

- When the in-memory cache is stale, immediately query `price_cache` for `asset_type = 'chainlink'` rows and return them with `cached: true`
- Then kick off the on-chain RPC fetches and upsert fresh results to `price_cache` (the response has already been sent, so this happens "fire-and-forget" style within the same request by returning the DB cache early)
- If no DB cache exists (first ever call), fall back to the current blocking behavior

### 2. Frontend: load chainlink from price_cache on mount

**`src/hooks/useLivePrices.ts`**

- In the existing `loadCachedPrices` function (which already reads `price_cache`), also load rows where `asset_type = 'chainlink'` and populate `chainlinkForex` from them
- This means chainlink data appears instantly when the tab is opened (from the last successful fetch), removing the need to wait for the edge function

### 3. ExchangeRatesDialog: show cached data, auto-refresh

**`src/components/ExchangeRatesDialog.tsx`**

- When switching to the Chainlink tab, if cached data already exists from the DB load, show it immediately
- Still trigger a background `fetchChainlinkFeeds()` to get fresh on-chain prices, but the user sees data instantly

## Technical details

| File | Change |
|------|--------|
| `supabase/functions/fetch-chainlink-feeds/index.ts` | Read `price_cache` as fast fallback before RPC calls |
| `src/hooks/useLivePrices.ts` | Populate `chainlinkForex` from `price_cache` during initial cache load |
| `src/components/ExchangeRatesDialog.tsx` | Show cached chainlink data immediately, refresh in background |

## Result

- First visit: chainlink prices load from DB in ~200ms instead of 3-5s RPC calls
- Subsequent visits: same fast DB cache, with background refresh for fresh prices
- Only the very first call ever (empty DB) will be slow

