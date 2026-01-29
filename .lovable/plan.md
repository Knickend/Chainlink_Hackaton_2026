

# Fix Silver Price Reset Bug

## Problem Summary

When adding silver as an asset, the correct price is shown initially (~$31.50), but after saving, the displayed value resets to $32. This happens because:

1. The search function gets the correct price from Perplexity during asset search
2. The search function intentionally doesn't cache prices for "reserved" symbols like SILVER
3. After saving, the app fetches prices from a different function that has two issues:
   - It doesn't properly handle markdown formatting in API responses
   - When the API returns `null` for silver, it falls back to stale cached data ($32)

---

## Solution

Fix the `fetch-prices` function to:
1. Strip markdown formatting from Perplexity responses (same as the search function does)
2. Improve the prompt to get more reliable silver prices
3. Handle null values properly

---

## Technical Changes

### File: `supabase/functions/fetch-prices/index.ts`

**Change 1: Add markdown stripping (lines ~189-198)**

Add the same JSON extraction logic used in `search-ticker`:

```typescript
// Before parsing, strip markdown if present
let jsonStr = content.trim();
if (jsonStr.startsWith('```json')) {
  jsonStr = jsonStr.slice(7);
} else if (jsonStr.startsWith('```')) {
  jsonStr = jsonStr.slice(3);
}
if (jsonStr.endsWith('```')) {
  jsonStr = jsonStr.slice(0, -3);
}
jsonStr = jsonStr.trim();

const parsed = JSON.parse(jsonStr);
```

**Change 2: Improve the Perplexity prompt (lines ~171-179)**

Make the prompt more explicit to prevent null values:

```typescript
messages: [
  {
    role: 'system',
    content: 'You are a financial data API. Return ONLY valid JSON with no markdown formatting. Always provide numeric values, never null.'
  },
  {
    role: 'user',
    content: 'Return the current spot prices in USD as JSON: {"gold": <Gold price per troy oz as number>, "silver": <Silver price per troy oz as number>}. Both values must be positive numbers.'
  }
],
```

**Change 3: Handle null silver values (lines ~192-195)**

Validate individual fields more robustly:

```typescript
commodityPrices = {
  gold: validatePrice(parsed.gold, 'GOLD'),
  silver: parsed.silver !== null ? validatePrice(parsed.silver, 'SILVER') : getCachedPrice('SILVER'),
};
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/fetch-prices/index.ts` | Strip markdown from Perplexity response, improve prompt, handle null values |

---

## Expected Outcome

After this fix:
- The `fetch-prices` function will properly parse Perplexity responses even when they include markdown
- Silver prices will be consistently fetched and cached
- The asset value will remain accurate after saving

