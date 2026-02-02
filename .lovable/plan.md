
# Plan: Fix Realized P&L Calculation Using Average Cost Basis

## Problem

When editing a sell transaction, changing the price should recalculate P&L based on the asset's **average purchase price**, not through proportional scaling. Currently:

| Scenario | Sale Price | Expected P&L Calculation |
|----------|-----------|-------------------------|
| 4 buys of 0.5 BTC at different prices | Total 2 BTC, total cost $50,000 | Avg cost = $25,000/BTC |
| Sell 0.2 BTC at $30,000 | Proceeds: $6,000 | P&L = $6,000 - (0.2 × $25,000) = +$1,000 |
| Edit sale to $20,000 | Proceeds: $4,000 | P&L = $4,000 - (0.2 × $25,000) = -$1,000 |

The correct formula is:
```
Realized P&L = Sale Proceeds - (Quantity × Average Cost Per Unit)
```

## Root Cause

`EditTransactionDialog` currently only receives the transaction data, not the parent asset's cost basis. It cannot calculate the correct P&L because it doesn't know the average purchase price.

## Solution

Pass the asset's average cost per unit to `EditTransactionDialog` and use it for P&L recalculation.

## Implementation Changes

### 1. Modify EditTransactionDialog to accept cost basis info

Add a new optional prop `avgCostPerUnit`:

```typescript
interface EditTransactionDialogProps {
  transaction: AssetTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: EditTransactionFormData) => Promise<void>;
  formatValue: (value: number) => string;
  avgCostPerUnit?: number; // NEW: Average cost per unit from asset
}
```

### 2. Update P&L recalculation logic

Change the useEffect to use the correct formula:

```typescript
// Current (wrong):
const newPnl = originalRealizedPnl * (newTotalValue / originalTotalValue);

// Fixed:
if (avgCostPerUnit && avgCostPerUnit > 0) {
  const costBasisOfSoldUnits = quantity * avgCostPerUnit;
  const newPnl = newTotalValue - costBasisOfSoldUnits;
  setValue('realized_pnl', Math.round(newPnl * 100) / 100);
}
```

### 3. Modify ProfitLossDetailDialog to pass cost basis

When rendering the EditTransactionDialog, pass the current asset's average cost:

```typescript
<EditTransactionDialog
  transaction={editingTransaction}
  open={!!editingTransaction}
  onOpenChange={(open) => !open && setEditingTransaction(null)}
  onSave={async (id, data) => {
    await onEditTransaction(id, data);
  }}
  formatValue={formatValue}
  avgCostPerUnit={currentEditingAsset?.cost_basis && currentEditingAsset?.quantity 
    ? currentEditingAsset.cost_basis / currentEditingAsset.quantity 
    : undefined}
/>
```

### 4. Track which asset's transaction is being edited

Add state to track the current asset when editing:

```typescript
const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

// When opening edit dialog, also store the asset:
onClick={(e) => {
  e.stopPropagation();
  setEditingTransaction(tx);
  setEditingAsset(asset); // Store asset for cost basis lookup
}}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/EditTransactionDialog.tsx` | Add `avgCostPerUnit` prop, fix P&L calculation formula |
| `src/components/ProfitLossDetailDialog.tsx` | Track editing asset, pass `avgCostPerUnit` to dialog |

## Data Flow

```text
Asset (from assetsWithCostBasis)
├── cost_basis: $50,000
├── quantity: 2 BTC
└── avgCostPerUnit: $25,000/BTC

↓ User clicks edit on a sell transaction

EditTransactionDialog
├── Receives avgCostPerUnit: $25,000
├── User changes price to $30,000 for 0.2 BTC
├── newTotalValue: $6,000
├── costBasisOfSold: 0.2 × $25,000 = $5,000
└── newRealizedPnL: $6,000 - $5,000 = +$1,000 ✓
```

## Edge Cases

| Case | Handling |
|------|----------|
| No cost basis available | Skip auto-recalculation, let user enter manually |
| Buy transactions | Don't recalculate P&L (buys don't have realized P&L) |
| Quantity changes | Recalculate: `(qty × price) - (qty × avgCost)` |
| Asset not found | Fall back to proportional scaling or manual entry |
