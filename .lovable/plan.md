

# Plan: Profit & Loss Overview

## Overview

Add a comprehensive Profit & Loss (P&L) tracking feature that shows users their realized and unrealized gains/losses across their portfolio. This will require tracking cost basis (purchase price) for assets and introducing a transaction history to record when assets are sold.

## Current System Analysis

The current asset tracking system:
- Stores assets with `value`, `quantity`, and `symbol`
- Does NOT track purchase price/cost basis
- Does NOT record transaction history (buys/sells)
- Uses live prices to calculate current value dynamically

To implement proper P&L tracking, we need to add:
1. **Cost basis tracking** for each asset
2. **Transaction history** for recording sells/partial sells
3. **P&L calculation logic** for unrealized and realized gains

## Database Schema Changes

### 1. Add cost basis to assets table

```sql
ALTER TABLE public.assets 
ADD COLUMN cost_basis numeric,
ADD COLUMN purchase_date date,
ADD COLUMN purchase_price_per_unit numeric;
```

- `cost_basis`: Total amount paid for the asset (quantity x purchase price)
- `purchase_date`: When the asset was acquired
- `purchase_price_per_unit`: Price paid per unit at purchase

### 2. Create asset_transactions table

```sql
CREATE TABLE public.asset_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  symbol text NOT NULL,
  asset_name text NOT NULL,
  category text NOT NULL,
  quantity numeric NOT NULL,
  price_per_unit numeric NOT NULL,
  total_value numeric NOT NULL,
  realized_pnl numeric,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

This table will:
- Record all buy/sell transactions
- Calculate and store realized P&L when selling
- Maintain history even if original asset is deleted

## P&L Calculation Logic

### Unrealized P&L (per asset)

```text
Unrealized P&L = Current Value - Cost Basis
               = (Current Price x Quantity) - (Purchase Price x Quantity)
```

### Realized P&L (from transactions)

```text
Realized P&L = Sale Proceeds - Cost of Sold Units
             = (Sale Price x Quantity Sold) - (Purchase Price x Quantity Sold)
```

### Total Portfolio P&L

```text
Total Unrealized = Sum of all assets' unrealized P&L
Total Realized = Sum of all realized P&L from transactions
Total P&L = Unrealized + Realized
```

## User Interface Components

### 1. ProfitLossCard (Dashboard)

A new stat card showing P&L summary:

```text
+----------------------------------------+
|  Profit & Loss                    [Pro]|
+----------------------------------------+
|  Total P&L                             |
|  +$12,450.32  (+8.2%)        [TrendUp] |
|                                        |
|  +------------------+  +-------------+ |
|  | Unrealized       |  | Realized    | |
|  | +$10,200.00      |  | +$2,250.32  | |
|  +------------------+  +-------------+ |
|                                        |
|  [View Details]                        |
+----------------------------------------+
```

### 2. ProfitLossDetailDialog

Detailed breakdown with:
- P&L by asset category (pie chart)
- P&L by individual asset (table)
- Transaction history with realized gains
- Time-based filtering (MTD, YTD, All Time)

### 3. Updated Add/Edit Asset Dialogs

Add optional fields for:
- Purchase date
- Purchase price per unit (auto-calculated if quantity provided)
- OR Total cost basis

### 4. SellAssetDialog (New)

For recording partial/full asset sales:
- Select quantity to sell
- Enter sale price
- Auto-calculate realized P&L
- Option to fully close position

## Data Flow

```text
User adds asset with cost basis
          |
          v
+---------------------------+
| Asset stored with:        |
| - quantity                |
| - cost_basis              |
| - purchase_price_per_unit |
+---------------------------+
          |
          v
Live price updates asset.value
          |
          v
+---------------------------+
| Unrealized P&L =          |
| value - cost_basis        |
+---------------------------+

User sells (partial) asset
          |
          v
+---------------------------+
| Transaction recorded with:|
| - quantity_sold           |
| - sale_price              |
| - realized_pnl            |
+---------------------------+
          |
          v
Asset quantity/cost_basis reduced
(or asset deleted if fully sold)
```

## Implementation Files

### New Files

| File | Purpose |
|------|---------|
| `src/components/ProfitLossCard.tsx` | Dashboard summary card |
| `src/components/ProfitLossDetailDialog.tsx` | Detailed P&L breakdown |
| `src/components/SellAssetDialog.tsx` | Record asset sales |
| `src/components/ProfitLossTeaser.tsx` | Teaser for non-Pro users |
| `src/hooks/useProfitLoss.ts` | P&L calculation and data fetching |
| `src/hooks/useAssetTransactions.ts` | Transaction history management |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add cost basis fields to Asset interface |
| `src/components/AddAssetDialog.tsx` | Add cost basis input fields |
| `src/components/EditAssetDialog.tsx` | Add cost basis editing |
| `src/hooks/usePortfolioData.ts` | Include cost basis in CRUD operations |
| `src/pages/Index.tsx` | Add ProfitLossCard to dashboard |
| `src/components/ViewAllAssetsDialog.tsx` | Add P&L column and sell action |

## Feature Gating

This will be a **Pro feature** (consistent with Performance tracking and Portfolio History):
- Free users see a teaser card with sample data
- Pro users get full access to P&L tracking

## Technical Considerations

### Cost Basis Methods

For simplicity, we'll use **Specific Identification** method:
- Each asset purchase is tracked separately
- When selling, user specifies which lot they're selling

Future enhancement could add FIFO/LIFO options.

### Backward Compatibility

Existing assets without cost basis:
- Show "Cost basis not set" indicator
- Allow users to retroactively add purchase info
- P&L calculations only apply to assets with cost basis

### Currency Handling

- Cost basis stored in original purchase currency
- P&L calculated after converting both cost and value to display unit
- Consistent with existing multi-currency system

## Implementation Steps

1. **Database**: Create migration for new columns and transactions table
2. **Types**: Update Asset interface with cost basis fields
3. **Hooks**: Create useProfitLoss and useAssetTransactions hooks
4. **Dialogs**: Update AddAssetDialog and EditAssetDialog
5. **SellDialog**: Create SellAssetDialog for recording sales
6. **Cards**: Create ProfitLossCard and teaser
7. **Details**: Create ProfitLossDetailDialog with charts
8. **Integration**: Add to dashboard and ViewAllAssetsDialog

