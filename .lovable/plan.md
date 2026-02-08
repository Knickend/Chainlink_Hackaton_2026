


## Save Chainlink Frontend Integration Plan

Append the Chainlink frontend integration plan to the existing `.lovable/plan.md` file, preserving the current Test Price Feed API plan that's already there.

---

## What Changes

**File:** `.lovable/plan.md`

Append a new section after the existing content with the full Chainlink frontend integration plan covering:

- Adding a 4th "Chainlink" tab to the Exchange Rates dialog
- Expected edge function response format (the API contract to code against)
- UI layout: table with Pair, Network, Answer, Deviation, Heartbeat columns
- Lazy-loading strategy (fetch only when tab is opened)
- Files to modify: `ExchangeRatesDialog.tsx` and optionally `useLivePrices.ts`
- Dependency on backend: the `fetch-chainlink-feeds` edge function being built separately

This keeps both plans documented in one place for future reference.

---

## Chainlink Frontend Integration Plan

### Overview
Add a 4th "Chainlink" tab to the Exchange Rates dialog to display on-chain forex prices from Chainlink Data Feeds.

### Expected Edge Function Response Format
```json
{
  "success": true,
  "data": [
    {
      "pair": "EUR/USD",
      "network": "sepolia",
      "address": "0x...",
      "answer": 1.1817,
      "decimals": 8,
      "updatedAt": "2026-02-07T12:00:00.000Z"
    }
  ]
}
```

### UI Layout
| Column | Source |
|--------|--------|
| Pair | `feed.pair` |
| Network | `feed.network` |
| Answer | `feed.answer` (formatted to 6 decimals) |
| Updated | `feed.updatedAt` (relative or absolute time) |

- "On-chain" status badge in a distinct color
- Footer link to https://data.chain.link/feeds?categories=Fiat

### Lazy-Loading Strategy
- Data is fetched only when the Chainlink tab is first selected
- Results are cached in component state to avoid re-fetching on tab switches
- A "Load Chainlink Feeds" button is shown if no data is loaded yet

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/ExchangeRatesDialog.tsx` | Already has 4th Chainlink tab with feed table and lazy loading |
| `src/hooks/useLivePrices.ts` | Already exposes `fetchChainlinkFeeds`, `chainlinkLoading`, and `chainlinkForex` in `LivePrices` |

### Dependencies
- Backend: `fetch-chainlink-feeds` edge function (built separately)
- Environment: `CHAINLINK_FEEDS` secret configured with feed addresses
