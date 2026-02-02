
# Plan: Fix P&L Not Updating After Transaction Edit

## Problem Analysis

After editing a transaction, the P&L values displayed in the UI are not correctly updated. Based on the screenshots:

| State | Price | P&L Displayed |
|-------|-------|---------------|
| Before edit | @$10,000.00 | +$200.00 |
| After edit | @$10,100.00 | +$200.00 (unchanged) |

The user changed the price per unit from $10,000 to $10,100 (for 0.1 BTC, making total value change from $1,000 to $1,010), but the P&L display still shows the old value.

## Root Cause

The issue has two parts:

1. **UI displays `tx.realized_pnl` directly** - The transaction row in `ProfitLossDetailDialog.tsx` reads `tx.realized_pnl` from the transaction object. When price changes, the user may not manually update the realized P&L field, so it stays at the old value.

2. **The realized P&L is not auto-recalculated** - When a user changes the price per unit or quantity of a sell transaction, the realized P&L should ideally be recalculated based on the cost basis. Currently, the form just passes whatever value is in the `realized_pnl` field.

## Solution

Auto-recalculate the realized P&L when quantity or price changes in the Edit Transaction dialog. For a sell transaction, the realized P&L should be:

```text
Realized P&L = (sell_price_per_unit - cost_basis_per_unit) × quantity_sold
```

However, since we may not have the original cost basis per unit for this specific transaction easily accessible, a simpler approach is to:

1. **Recalculate total value correctly** (already done)
2. **Allow users to edit realized P&L manually** (already done)
3. **Show a warning when price/quantity changes but P&L remains unchanged**

### Alternative Approach (Recommended)

Since the realized P&L was likely calculated at the time of the original sale, when editing, we should provide a helper that suggests the new P&L based on the ratio of price change:

```text
new_pnl = original_pnl × (new_total_value / original_total_value)
```

This maintains the original profit margin percentage while adjusting for the new values.

## Implementation Changes

### 1. Modify `EditTransactionDialog.tsx`

Add logic to automatically update the realized P&L when quantity or price per unit changes:

```typescript
// Track original values to calculate P&L adjustments
const originalTotalValue = transaction.quantity * transaction.price_per_unit;
const originalRealizedPnl = transaction.realized_pnl || 0;

// Watch for changes and suggest new P&L
useEffect(() => {
  if (transaction?.transaction_type === 'sell' && transaction.realized_pnl !== undefined) {
    const newTotalValue = quantity * pricePerUnit;
    if (originalTotalValue > 0 && newTotalValue !== originalTotalValue) {
      // Calculate proportional P&L
      const newPnl = originalRealizedPnl * (newTotalValue / originalTotalValue);
      setValue('realized_pnl', Math.round(newPnl * 100) / 100);
    }
  }
}, [quantity, pricePerUnit]);
```

### 2. Update the form to recalculate P&L on price/quantity changes

When the user changes the price per unit or quantity, automatically update the realized P&L proportionally. This ensures that:
- If the original P&L was +$200 on a $1,000 sale (20% profit)
- And the user corrects the sale to $1,010
- The new P&L should be +$202 (maintaining 20% profit margin)

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/EditTransactionDialog.tsx` | Add auto-recalculation of realized P&L when price/quantity changes |

## Technical Details

### Current Flow
1. User clicks edit on a transaction
2. Form loads with original values
3. User changes price_per_unit
4. Total value updates (correctly)
5. Realized P&L stays unchanged (bug)
6. Save triggers update
7. UI displays old P&L value

### Fixed Flow
1. User clicks edit on a transaction
2. Form loads with original values
3. User changes price_per_unit
4. Total value updates (correctly)
5. **Realized P&L auto-updates proportionally** (fix)
6. Save triggers update with new P&L
7. UI displays correct P&L value

## Edge Cases Considered

- **Zero original total value**: Don't recalculate (division by zero protection)
- **Negative P&L**: Proportional adjustment works for both gains and losses
- **User manually overrides**: Allow manual editing after auto-calculation
- **Buy transactions**: Don't auto-calculate P&L (only applies to sell transactions)
