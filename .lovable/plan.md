
## Fix Colombian Peso (COP) Currency Conversion Bug for Stocks

### Problem Analysis

The issue is that Colombian stocks (CELSIA, MSA, PEI) have their values stored in **Colombian Pesos (COP)** but the system treats all stock values as **USD**. This causes massive inflation:

- **CELSIA**: Stored as 30,690,000 (COP) but interpreted as $30,690,000 USD
- When converted to EUR, this becomes €26,006,399 instead of the actual ~€6,500

**Root cause**: The `stocks` category doesn't support currencies - it assumes all values are in USD. Unlike banking/real estate assets which store the currency in the `symbol` field, stock assets use `symbol` for the ticker symbol (e.g., "CELSIA").

---

## Solution Overview

Add a dedicated `currency` column to the assets table and update the application to:
1. Store the native currency for stocks that don't have USD pricing
2. Convert non-USD stock values to the user's display unit correctly
3. Allow users to select a currency when adding stocks manually

---

## Phase 1: Database Migration

Add a `currency` column to the `assets` table:

```sql
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Update existing Colombian stocks to COP (based on their symbols)
UPDATE public.assets 
SET currency = 'COP' 
WHERE category = 'stocks' 
  AND symbol IN ('CELSIA', 'PEI', 'MSA', 'MNSAF')
  AND currency IS NULL;

-- Ensure all other stocks default to USD
UPDATE public.assets 
SET currency = 'USD' 
WHERE category = 'stocks' AND currency IS NULL;
```

---

## Phase 2: Type Updates

**File: `src/lib/types.ts`**
- Update `Asset` interface to include optional `currency` field

---

## Phase 3: Portfolio Calculation Fixes

**File: `src/hooks/usePortfolio.ts`**

Update the asset value calculation to:
1. Check if a stock has a `currency` field other than USD
2. If so, convert the stored value from native currency to display unit
3. For stocks with live USD prices, continue using quantity × price

Logic:
```typescript
// For stocks without live prices but with a currency
if (asset.category === 'stocks' && !price && asset.currency && asset.currency !== 'USD') {
  // Use the stored value as native currency amount
  const currencyToUsdRate = getForexRateToUSD(asset.currency, liveForexRates);
  const valueInUSD = asset.value * currencyToUsdRate;
  return { ...asset, value: valueInUSD };
}
```

---

## Phase 4: UI Updates

**File: `src/components/AddAssetDialog.tsx`**

For stocks without a selected ticker (manual entry):
1. Show currency selector dropdown
2. Store selected currency in the new `currency` field
3. Convert value to USD before saving (for consistency)

**File: `src/components/AssetCategoryCard.tsx`**

For stocks with non-USD currencies:
- Display the native currency symbol and amount
- Show converted value in display unit

---

## Phase 5: Display Fixes

**File: `src/hooks/usePortfolio.ts`**

Update `categoryTotals` calculation:
- For stocks, check the `currency` field
- Convert values using the appropriate forex rate

---

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add `currency` column to assets table |
| `src/lib/types.ts` | Add `currency` field to Asset interface |
| `src/hooks/usePortfolioData.ts` | Map `currency` field from database |
| `src/hooks/usePortfolio.ts` | Fix value calculations for non-USD stocks |
| `src/components/AddAssetDialog.tsx` | Add currency selector for manual stock entry |
| `src/components/EditAssetDialog.tsx` | Support editing currency for stocks |
| `src/components/AssetCategoryCard.tsx` | Display native currency for non-USD stocks |

---

## Expected Result

After this fix:
- **CELSIA**: 6,200 shares × COP 4,950 = COP 30,690,000 → ~€6,500 EUR
- Colombian stocks will show their correct values in any display unit
- New stocks can be added with any supported currency
- Existing Colombian stocks will be auto-migrated to use COP

---

## Alternative Quick Fix

If a full currency implementation is too complex, a simpler approach:

1. **Reclassify Colombian stocks as "Real Estate, Equity & Misc."**
   - This category already supports currencies
   - User would need to re-add these assets with COP selected

However, the proper solution (adding currency support to stocks) is recommended for long-term maintainability.
