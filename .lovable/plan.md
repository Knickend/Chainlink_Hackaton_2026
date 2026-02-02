

# Plan: Integrate Sell Asset Flow

## Overview

The infrastructure for selling assets already exists - we have the `SellAssetDialog`, `useAssetTransactions` hook, and the `asset_transactions` database table. What's needed is connecting these pieces to the UI so users can trigger the sell flow.

## Current State

| Component | Status |
|-----------|--------|
| `SellAssetDialog.tsx` | Created - handles form, P&L preview |
| `useAssetTransactions.ts` | Created - manages transactions in DB |
| `asset_transactions` table | Created - stores buy/sell history |
| UI integration | Missing - no way to trigger sell |

## Implementation

### 1. Add Sell Button to ViewAllAssetsDialog

Add a "Sell" button in the actions column next to Edit and Delete buttons. This should only appear for assets that have a quantity (sellable assets like stocks, crypto, commodities).

```text
+--------------------------------------------------+
| Name    | Symbol | Category | Qty  | Value | Actions     |
+--------------------------------------------------+
| Tesla   | TSLA   | Stocks   | 10   | $2,500| [Edit][Sell][Del]|
| Bitcoin | BTC    | Crypto   | 0.5  | $50k  | [Edit][Sell][Del]|
| Savings | -      | Banking  | -    | $10k  | [Edit][Del]      |
+--------------------------------------------------+
```

### 2. Wire Up the Sell Flow

When user clicks Sell:
1. Open `SellAssetDialog` with the selected asset
2. User enters quantity to sell and sale price
3. On confirm:
   - Record transaction via `useAssetTransactions.addTransaction()`
   - Update or delete the asset via `updateAsset()` or `deleteAsset()`
   - Refresh P&L data

### 3. Handle Partial vs Full Sales

- **Partial sale**: Reduce asset quantity and cost basis proportionally
- **Full sale**: Delete the asset entirely

```text
Example: Sell 5 of 10 shares at $100/share
- Original: quantity=10, cost_basis=$800 ($80/share)
- After: quantity=5, cost_basis=$400
- Transaction: realized_pnl = (5 × $100) - (5 × $80) = $100
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ViewAllAssetsDialog.tsx` | Add sell button, integrate SellAssetDialog, pass new props |
| `src/pages/Index.tsx` | Pass transaction hook and sell handler to ViewAllAssetsDialog |

## New Props for ViewAllAssetsDialog

```typescript
interface ViewAllAssetsDialogProps {
  // ... existing props
  onSellAsset?: (assetId: string, data: {
    quantity: number;
    price_per_unit: number;
    total_value: number;
    realized_pnl?: number;
    transaction_date: string;
    notes?: string;
  }) => Promise<void>;
  livePrices?: LivePrices;
}
```

## User Experience Flow

1. User opens "View All Assets" dialog
2. Clicks "Sell" button on an asset (e.g., Tesla stock)
3. Sell dialog opens showing:
   - Current quantity owned
   - Current market price (from live prices)
   - Fields for quantity to sell and sale price
   - Real-time P&L calculation preview
4. User confirms sale
5. Transaction is recorded to database
6. Asset quantity/cost basis updated (or deleted if full sale)
7. Toast notification confirms the sale with realized P&L
8. P&L card on dashboard reflects the change

## Technical Details

### Sell Handler Function

The sell handler in `Index.tsx` will:
1. Call `addTransaction()` from `useAssetTransactions` to record the sale
2. Calculate new quantity and cost basis
3. Call `updateAsset()` or `deleteAsset()` as appropriate
4. The `useProfitLoss` hook will automatically recalculate totals

### Cost Basis Reduction Formula

```text
new_quantity = old_quantity - sold_quantity
new_cost_basis = old_cost_basis × (new_quantity / old_quantity)
```

