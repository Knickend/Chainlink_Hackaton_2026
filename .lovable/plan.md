

## Create Test Price Feed API (No x402 Payment)

A free, unauthenticated edge function that returns the same price data as `api-price-feed` but without requiring x402 payment. This gives the Chainlink CRE workflow a working endpoint to call during development and testing.

---

## What Gets Built

A new edge function `api-price-feed-test` that:
- Returns live price data from the `price_cache` table (same data as the paid endpoint)
- Supports GET (query params) and POST/PUT (request body) -- same filtering as the paid API
- Requires NO payment header
- Includes a `warning` field in responses indicating this is a test-only endpoint

---

## New File

### `supabase/functions/api-price-feed-test/index.ts`

Simplified version of `api-price-feed` with:
- Same filter parsing logic (type, symbols, limit)
- Same response format (prices array, byType grouping, meta)
- No x402 payment check -- serves data immediately
- Added `test: true` and `warning` fields in response so it's clearly distinguishable from production
- Standard CORS headers for browser/agent access

### `supabase/config.toml`

Add entry:
```toml
[functions.api-price-feed-test]
verify_jwt = false
```

---

## Response Format

```json
{
  "test": true,
  "warning": "This is a free test endpoint. Use api-price-feed for production.",
  "timestamp": "2026-02-06T...",
  "request": { "method": "GET", "filters": { ... } },
  "prices": [ { "symbol": "BTC", "price": 98000, ... } ],
  "byType": { "crypto": [...], "commodity": [...] },
  "meta": { "totalPrices": 12 }
}
```

---

## Usage from Chainlink CRE

The CRE workflow in `incontrol-cre-ts/portfolio-summary-ts/main.ts` can then be updated to call this endpoint:

```
GET https://edtudwkmswyjxamkdkbu.supabase.co/functions/v1/api-price-feed-test?type=crypto&symbols=BTC,ETH
```

No headers required beyond the standard `apikey` header.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/api-price-feed-test/index.ts` | Create -- free price feed endpoint |
| `supabase/config.toml` | Add `api-price-feed-test` entry |

