
# Plan: Add Edit and Delete Transaction Options in P&L Dialog

## Overview

Add the ability to edit or delete individual transactions directly from the expanded asset view in the Profit & Loss Details dialog. Each transaction row will have edit (pencil) and delete (trash) icons that appear on hover.

## Current State

| Component | Behavior |
|-----------|----------|
| ProfitLossDetailDialog | Shows transaction list when asset is expanded |
| Transaction row | Display only - no actions available |
| useAssetTransactions | Has `deleteTransaction` but no `updateTransaction` |
| DeleteConfirmDialog | Reusable delete confirmation component exists |

## Proposed Solution

1. Add an `updateTransaction` function to the `useAssetTransactions` hook
2. Create a new `EditTransactionDialog` component for editing transactions
3. Modify `ProfitLossDetailDialog` to show edit/delete icons on each transaction row
4. Pass callbacks from Index.tsx through the component chain

## UI Design

```text
+----------------------------------------------------------+
| Transaction History                                       |
|----------------------------------------------------------|
| ▼ SELL  0.5 BTC      @$78,954.00   Feb 2, 2026  [✏️] [🗑] |
|                      P&L: +$35,477.00                     |
|----------------------------------------------------------|
| ▼ SELL  0.1 Bitcoin  @$10,000.00   Feb 2, 2026  [✏️] [🗑] |
|                      P&L: +$200.00                        |
+----------------------------------------------------------+
```

## Detailed Changes

### 1. Add `updateTransaction` to useAssetTransactions.ts

```typescript
interface UpdateTransactionData {
  quantity?: number;
  price_per_unit?: number;
  total_value?: number;
  realized_pnl?: number;
  transaction_date?: string;
  notes?: string;
}

const updateTransaction = useCallback(async (id: string, data: UpdateTransactionData) => {
  // Update in Supabase and local state
}, [user, toast]);
```

### 2. Create EditTransactionDialog.tsx

A new dialog component allowing users to edit:
- Quantity
- Price per unit (auto-calculates total value)
- Transaction date
- Notes (optional)
- Realized P&L (for sell transactions only)

Features:
- Pre-populated form with current transaction values
- Form validation using Zod
- Auto-calculate total value when quantity or price changes
- Follows existing dialog patterns (fixed header/footer, scrollable content)

### 3. Modify ProfitLossDetailDialog.tsx

**Add new props:**
```typescript
interface ProfitLossDetailDialogProps {
  // ... existing props
  onEditTransaction?: (transaction: AssetTransaction) => void;
  onDeleteTransaction?: (transactionId: string) => void;
}
```

**Add action buttons to each transaction row:**
- Pencil icon for edit (opens EditTransactionDialog)
- Trash icon for delete (uses DeleteConfirmDialog)
- Icons appear on hover with smooth opacity transition
- Stop event propagation to prevent collapsible toggle

**Add state for edit dialog:**
```typescript
const [editingTransaction, setEditingTransaction] = useState<AssetTransaction | null>(null);
```

### 4. Update ProfitLossCard.tsx

Pass new callbacks through to ProfitLossDetailDialog:
```typescript
<ProfitLossDetailDialog
  // ... existing props
  onEditTransaction={onEditTransaction}
  onDeleteTransaction={onDeleteTransaction}
/>
```

### 5. Update Index.tsx

- Destructure `updateTransaction` and `deleteTransaction` from `useAssetTransactions`
- Pass callbacks to `ProfitLossCard`:

```typescript
<ProfitLossCard 
  pnlData={pnlData} 
  formatValue={formatValue} 
  transactions={transactions}
  onEditTransaction={(tx) => updateTransaction(tx.id, tx)}
  onDeleteTransaction={(id) => deleteTransaction(id)}
/>
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/EditTransactionDialog.tsx` | Dialog for editing transaction details |

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAssetTransactions.ts` | Add `updateTransaction` function |
| `src/components/ProfitLossDetailDialog.tsx` | Add edit/delete icons to transaction rows |
| `src/components/ProfitLossCard.tsx` | Pass callbacks to detail dialog |
| `src/pages/Index.tsx` | Wire up update/delete callbacks |

## EditTransactionDialog Form Fields

| Field | Type | Validation |
|-------|------|------------|
| Quantity | number input | Required, > 0 |
| Price per unit | number input | Required, >= 0 |
| Total value | computed display | Auto-calculated |
| Transaction date | date picker | Required |
| Notes | textarea | Optional, max 500 chars |
| Realized P&L | number input | Only for sell transactions |

## Transaction Row Layout (Updated)

```text
+---------------------------------------------------------------+
| [icon] [BADGE] quantity symbol      @price  date    [✏️] [🗑] |
|                                     P&L: ±value               |
+---------------------------------------------------------------+
```

- Edit/delete icons use `opacity-0 group-hover:opacity-100` for hover reveal
- Icons are positioned on the right side of the row
- Click handlers use `e.stopPropagation()` to prevent row expansion

## Technical Notes

- The DeleteConfirmDialog component is reused for delete confirmation
- Edit dialog uses react-hook-form with zod validation (consistent with other dialogs)
- Total value is auto-calculated: `quantity * price_per_unit`
- For sell transactions, users can optionally adjust the realized P&L
- Transactions are matched by ID for updates
- After edit/delete, the local state is updated immediately for responsive UI
