

## Fix: Currency Conversion Bug in Financial Advisor Portfolio Summary

### Problem

The `buildPortfolioSummary()` function in `FinancialAdvisorChat.tsx` sums all asset values, income, expenses, and debts as raw numbers, treating them all as USD. A Colombian stock worth 50,000,000 COP gets reported as "$50,000,000" -- inflating the portfolio from its real value to **$61.49 million**.

### Root Cause

Line 30 of the function does `assets.reduce((s, a) => s + a.value, 0)` without any currency awareness. The same issue affects income totals (lines 56-57), expense totals (lines 64-65), and debt totals (line 69).

### Solution

Instead of computing a single grand total (which requires live forex rates the component may not have readily available in the helper), the fix will:

1. **Annotate every item with its native currency** so the AI can interpret values correctly (e.g., "Celsia SA -- 1,000 shares (COP 50,000,000)" instead of "$50,000,000").
2. **Group asset totals by currency** instead of one misleading USD total (e.g., "Assets: USD $11,200 + COP $50,000,000").
3. **Show income/expense/debt amounts with their native currency symbol** to prevent the AI from incorrectly summing COP and USD values.

This approach is robust because it doesn't require injecting forex conversion logic into the summary builder -- the AI model is smart enough to understand multi-currency portfolios when properly labeled.

### File Changes

**`src/components/FinancialAdvisorChat.tsx`** -- Rewrite `buildPortfolioSummary()`:

- **Assets section**: Group the total by currency. For market-priced assets (crypto, stocks, commodities), show quantity and symbol. For assets with a non-USD `currency` field (like COP stocks), label the value with that currency. For banking/realestate, use the `symbol` field (which stores currency code like "EUR", "COP") to label the native amount.
- **Income section**: Prefix each amount with `getCurrencySymbol(i.currency)` instead of hardcoded `$`.
- **Expenses section**: Same currency-aware formatting.
- **Debts section**: Already uses `getCurrencySymbol(d.currency)` for individual items (line 70) but the total on line 71 still uses `$` -- fix that to group by currency too.

### Example Output (After Fix)

```text
## Current Portfolio Snapshot
Assets (7 total):
  By currency: USD ~$11,200 | COP ~$50,000,000

- Cash & Stablecoins:
  . Savings Account -- $10,000 (USD)
- Stocks, Bonds & ETFs:
  . AAPL -- 10 shares ($1,200)
  . Celsia SA Esp -- 1,000 shares (COP 50,000,000)
  . Patrimonio Autonomo -- 500 units (COP 8,500,000)

Monthly Income: $5,500 (USD, 3 recurring)
Monthly Expenses: $3,200 (USD, 8 recurring)
Debts: USD $15,000 total
```

The AI will then correctly interpret this as a ~$25K USD portfolio (after COP conversion) rather than $61.49M.

