
## Fix Colombian Peso (COP) Currency Conversion Bug for Stocks

### ✅ COMPLETED

**Problem**: Colombian stocks (CELSIA, MSA, PEI) had values stored in COP but the system treated them as USD, causing ~€52M net worth instead of ~€6,500.

**Solution Implemented**:

1. ✅ **Database Migration**: Added `currency` column to assets table, defaulting to 'USD'. Existing Colombian stocks updated to 'COP'.

2. ✅ **Type Updates** (`src/lib/types.ts`): Added optional `currency` field to Asset interface.

3. ✅ **Data Layer** (`src/hooks/usePortfolioData.ts`): 
   - Maps `currency` field from database
   - Includes currency in add/update operations

4. ✅ **Portfolio Calculations** (`src/hooks/usePortfolio.ts`):
   - Detects stocks with non-USD currency
   - Converts native currency values to USD using live forex rates
   - Falls back to static rates if live rates unavailable

5. ✅ **Add Asset Dialog** (`src/components/AddAssetDialog.tsx`):
   - Shows currency selector for manual stock entries (when no ticker selected)
   - Stores currency in database for non-USD stocks

6. ✅ **Asset Display** (`src/components/AssetCategoryCard.tsx`):
   - Non-USD stocks display native currency amount + converted value
   - Currency badge shown for stocks with non-USD currencies
   - Uses single-line layout for non-USD stocks (no live price available)

**Expected Result**:
- CELSIA: COP 30,690,000 → ~€6,500 EUR (with live forex rates)
- Colombian stocks now show correct values in any display unit
- New stocks can be added with any supported currency

