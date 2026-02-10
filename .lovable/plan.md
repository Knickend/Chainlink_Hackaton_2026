

## Chainlink Edge Function: Caching, Fallback RPC, and Frontend Throttling

### Overview

Three layers of optimization to eliminate Infura 429 rate-limit errors:

1. **Edge function in-memory cache** -- avoid hitting RPC on repeated requests within 30 seconds
2. **Fallback RPC** -- if Infura returns 429/timeout, retry with a public RPC endpoint
3. **Frontend throttling** -- debounce manual refresh and prevent redundant fetches

---

### Changes

#### 1. Edge Function: In-memory cache + shared provider + fallback RPC

**File: `supabase/functions/fetch-chainlink-feeds/index.ts`**

- Add a module-level cache variable (`let cachedResult / cachedAt`) that stores the last successful response. If a request arrives within 30 seconds of the last fetch, return the cached result immediately without any RPC calls.
- Reuse a **single provider instance** per RPC URL across all feeds in one request cycle (instead of creating a new `JsonRpcProvider` per feed).
- Add a **fallback RPC** (`https://rpc.ankr.com/eth_sepolia`). If the primary Infura call for a feed throws (429, timeout, or network error), retry that single feed with the fallback provider.
- Remove the sequential loop; use `Promise.allSettled` to fetch all feeds concurrently (fewer round-trips, faster overall).

Logic outline:

```text
const CACHE_TTL_MS = 30_000; // 30 seconds
let cachedResponse: { data: any[]; timestamp: number } | null = null;

// At start of request handler:
if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL_MS) {
  return cached response;
}

// Group feeds by RPC URL -> create one provider per unique RPC
// For each feed, try primary provider; on error, retry with fallback
// Store successful results in cachedResponse
```

#### 2. Frontend: Debounce and guard Chainlink fetches

**File: `src/hooks/useLivePrices.ts`**

- Add a `lastChainlinkFetchRef` timestamp ref. In `fetchChainlinkFeeds`, skip if called within 30 seconds of the last successful fetch (matches edge function cache TTL).
- This prevents the UI from spamming the edge function on rapid tab switches or repeated refresh clicks.

**File: `src/components/ExchangeRatesDialog.tsx`**

- Disable the global "Refresh" button for 5 seconds after a click (simple cooldown via `setTimeout`).
- On the Chainlink tab, respect the existing `chainlinkLoading` guard but also skip re-fetch if data is already loaded and less than 30 seconds old.

---

### Technical Details

**Edge function cache behavior:**
- First request in a 30-second window: fetches all feeds from RPC, caches result, returns data
- Subsequent requests within 30s: returns cached data instantly (zero RPC calls)
- Cache is per-isolate (Deno edge function instances); cold starts always fetch fresh

**Fallback RPC strategy:**
- Primary: user's configured Infura URL (from `CHAINLINK_FEEDS` JSON)
- Fallback: `https://rpc.ankr.com/eth_sepolia` (public, no key needed)
- Fallback only used per-feed when the primary throws; not a global switch

**Concurrent fetching:**
- Current code uses a `for` loop (sequential, 5 serial RPC calls)
- Changed to `Promise.allSettled` (parallel, all 5 feeds at once)
- Reduces total request time from ~5x to ~1x single feed latency

**Files modified:**
- `supabase/functions/fetch-chainlink-feeds/index.ts` -- cache, shared provider, fallback RPC, parallel fetch
- `src/hooks/useLivePrices.ts` -- 30s debounce on `fetchChainlinkFeeds`
- `src/components/ExchangeRatesDialog.tsx` -- refresh cooldown, skip redundant Chainlink fetches
