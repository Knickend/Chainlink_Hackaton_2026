

## Fix: Currency Conversion Bug in Portfolio Rebalancer

### Problem
The rebalancer uses raw `asset.value` for all categories when computing allocation percentages. This is incorrect because:

- **Banking & Real Estate** assets store values in their native currency (e.g., EUR 1,300 stored as `value: 1300`)
- **Stocks with non-USD currencies** (e.g., Colombian stocks in COP) store values in the native currency

A COP-denominated stock with `value: 50,000,000` (about $12,000 USD) dominates the total, making Stocks appear as 96% of the portfolio.

### Solution
Apply the same currency normalization logic used by `usePortfolio.ts` -- convert all asset values to USD before computing category percentages and trade suggestion amounts.

### Technical Details

**1. `src/hooks/useRebalancer.ts`** -- add `livePrices` parameter and normalize values:

- Import `getForexRateToUSD`, `FOREX_RATES_TO_USD`, `BankingCurrency` from `@/lib/types` and `LivePrices` from `./useLivePrices`
- Add `livePrices` as a third parameter: `useRebalancer(assets, preferences, livePrices)`
- In the `driftData` useMemo, replace `asset.value` with a helper that:
  - For `banking` / `realestate`: takes `asset.quantity ?? asset.value` as native amount, converts from the asset's currency (`asset.symbol`) to USD using live forex rates with static fallback
  - For `stocks` with a non-USD `asset.currency`: converts `asset.value` from native currency to USD using `getForexRateToUSD`
  - For all other categories (crypto, commodities, USD stocks): uses `asset.value` as-is (already in USD)

**2. `src/components/PortfolioHistoryCard.tsx`** -- pass `livePrices` through:

- Accept `livePrices` as an optional prop (type `LivePrices`)
- Pass it to `useRebalancer(assets, preferences, livePrices)`

**3. `src/pages/Index.tsx`** -- pass `livePrices` to `PortfolioHistoryCard`:

- Add `livePrices={livePrices}` to the `PortfolioHistoryCard` component props

This ensures the rebalancer's percentage calculations and dollar-denominated trade suggestions match the rest of the dashboard.
