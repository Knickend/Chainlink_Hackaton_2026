
# Fix Missing Network Names and Error Feeds in Chainlink Tab

## Problem

1. **Network column is empty**: When Chainlink data is served from the database cache, the `network` field is not stored in `price_cache`, so it shows blank.
2. **Error feeds are hidden**: Feeds that fail RPC calls are not stored in `price_cache`, so they disappear when cached data is returned.

## Solution

### 1. Store network info in price_cache

**`supabase/functions/fetch-chainlink-feeds/index.ts`**

Add a `metadata` or encode the network into the cache. Since `price_cache` likely doesn't have a metadata column, the simplest approach is to store the network as part of a composite key or add it to the symbol (e.g. keep `symbol` as the pair but add a new approach).

Better approach: use the existing `price_cache` table and store network in a way that's retrievable. Two options:
- Option A: Store as `symbol = "base:cbBTC/USD"` (prefix with network)
- Option B: Add a `network` column to `price_cache`

Option A is simpler and avoids a migration. The edge function will store `network:pair` as the symbol, and the frontend will parse it back.

Actually, even simpler: the edge function already knows the feed config. Instead of relying on DB cache to carry network info, we can **map the network from the CHAINLINK_FEEDS config** when building DB cache results. But the frontend doesn't have the config.

Simplest fix: **Store network in the symbol field** as `"network:pair"` format in the edge function, then parse it in the frontend.

### 2. Store error feeds too

In the edge function's DB upsert, also store feeds that errored (with `price = 0` or a sentinel) so they appear in the cached response with an error indicator.

### Changes

**File: `supabase/functions/fetch-chainlink-feeds/index.ts`**

- When upserting to `price_cache`, use `symbol = "network:pair"` format (e.g. `"base:cbBTC/USD"`) instead of just the pair name
- Also upsert error feeds with `price = -1` as a sentinel value
- When reading DB cache, reconstruct the full feed objects including network (parsed from symbol) and error status (from price = -1)

**File: `src/hooks/useLivePrices.ts`**

- Update the `loadCachedPrices` chainlink mapping (around line 271) to parse `"network:pair"` format from the symbol field
- Detect error feeds (price = -1) and set the `error` field accordingly

**File: `src/components/ExchangeRatesDialog.tsx`**

- No changes needed -- it already displays `feed.network` and handles `feed.error`; it will work once the data is correct

## Technical details

| File | Change |
|------|--------|
| `supabase/functions/fetch-chainlink-feeds/index.ts` | Store symbol as `"network:pair"`, store error feeds with price=-1, parse network when reading DB cache |
| `src/hooks/useLivePrices.ts` | Parse `"network:pair"` format and detect error sentinel in cached chainlink data |

## Result

- Network column will show "sepolia" or "base" for all feeds
- Feeds that failed RPC calls will show with "Error" answer and "Fallback" status badge
- No database migration needed
