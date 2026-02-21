

# Fix Chainlink Price Feed Mapping in DCA CRE Workflow

## Problem

The DCA workflow fetches prices using `strategy.to_token` (e.g., `"cbBTC"`, `"ETH"`, `"WETH"`), but the `price_cache` table stores Chainlink feed prices with the format `network:pair` (e.g., `"base:cbBTC/USD"`, `"base:ETH/USD"`). This mismatch means the price lookup always fails, and executions are recorded with `token_price_usd: null`.

## Solution

Add a token-to-Chainlink-symbol mapping inside `main.ts` and change the price fetch to query `price_cache` directly via the Supabase REST API (instead of the generic `priceApiUrl`), filtering by the mapped symbol.

## Changes

### `incontrol-cre-ts/dca-trigger-ts/main.ts`

**1. Add a symbol mapping constant (after the interfaces, before `filterDueStrategies`):**

```typescript
const CHAINLINK_SYMBOL_MAP: Record<string, string> = {
  cbBTC: "base:cbBTC/USD",
  ETH:   "base:ETH/USD",
  WETH:  "base:ETH/USD",   // WETH tracks ETH price
};
```

**2. Replace the price fetch block (lines 122-152)** to query `price_cache` directly instead of the optional `priceApiUrl`:

- Build the mapped symbol: `CHAINLINK_SYMBOL_MAP[strategy.to_token]`
- If a mapping exists, query `{supabaseUrl}/rest/v1/price_cache?symbol=eq.{mappedSymbol}&select=price&limit=1` using the service role key
- Parse the response and extract `price`
- Fall back to `priceApiUrl` if no Chainlink mapping exists (preserves existing behavior for non-mapped tokens)
- Log which price source was used (Chainlink on-chain vs fallback)

**3. Remove `priceApiUrl` from the `DCAConfig` type** -- no, keep it as an optional fallback for tokens not in the Chainlink map.

### No other files change

The `price_cache` table and `fetch-chainlink-feeds` function already handle the on-chain data correctly. This fix is purely in the CRE workflow's price lookup logic.

---

## Technical Details

### Price fetch flow after the fix

```text
for each strategy:
  1. Look up to_token in CHAINLINK_SYMBOL_MAP
     - "cbBTC" -> "base:cbBTC/USD"
     - "ETH"   -> "base:ETH/USD"
     - "WETH"  -> "base:ETH/USD"
  2. If mapping found:
     GET {supabaseUrl}/rest/v1/price_cache?symbol=eq.base:cbBTC/USD&select=price&limit=1
     -> returns [{ price: 107234.56 }]
     -> tokenPriceUsd = 107234.56
  3. If no mapping found:
     Fall back to priceApiUrl (existing behavior)
  4. Pass tokenPriceUsd to execute-dca-order
```

### Updated price fetch code (replacing lines 122-152)

```typescript
// Fetch current price — prefer Chainlink on-chain feed via price_cache
const chainlinkSymbol = CHAINLINK_SYMBOL_MAP[strategy.to_token];

if (chainlinkSymbol) {
  try {
    const priceData = await runtime.runInNodeMode(
      (nodeRuntime: cre.NodeRuntime) => {
        const httpClient = new cre.capabilities.HTTPClient();
        const encodedSymbol = encodeURIComponent(chainlinkSymbol);
        const url = `${config.supabaseUrl}/rest/v1/price_cache?symbol=eq.${encodedSymbol}&select=price&limit=1`;

        const response = httpClient.sendRequest(nodeRuntime, {
          url,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: config.supabaseServiceRoleKey,
            Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
          },
          timeout: 10000,
        }).result();

        if (response.statusCode !== 200) {
          throw new Error(`price_cache query returned ${response.statusCode}`);
        }

        const text = new TextDecoder().decode(response.body);
        const rows = JSON.parse(text) as Array<{ price: number }>;
        return rows.length > 0 ? { price: rows[0].price } : { price: undefined };
      },
      cre.consensusMedianAggregation(),
    )(config);

    tokenPriceUsd = priceData?.price ?? null;
    if (tokenPriceUsd && tokenPriceUsd > 0) {
      runtime.log(`[DCA] Chainlink price for ${strategy.to_token} (${chainlinkSymbol}): $${tokenPriceUsd}`);
    } else {
      runtime.log(`[DCA] Chainlink price not available for ${chainlinkSymbol}`);
    }
  } catch (priceErr) {
    runtime.log(`[DCA] Chainlink price fetch failed for ${strategy.to_token}: ${priceErr}`);
  }
} else if (config.priceApiUrl) {
  // Fallback for tokens without a Chainlink mapping
  try {
    // ... existing priceApiUrl fetch logic ...
  } catch (priceErr) {
    runtime.log(`[DCA] Fallback price fetch failed for ${strategy.to_token}: ${priceErr}`);
  }
}
```

| File | Change |
|------|--------|
| `incontrol-cre-ts/dca-trigger-ts/main.ts` | Add `CHAINLINK_SYMBOL_MAP`, rewrite price fetch to query `price_cache` by mapped symbol, keep `priceApiUrl` as fallback |

