
# Fix Currency Display Unit Across All Components

## Problem

When switching the display unit from USD to another currency (GBP, EUR, BTC, Gold) using the currency selector, multiple components continue showing hardcoded `$` or `USD` text in their form labels instead of reflecting the selected currency symbol.

---

## Components Affected

I've identified **8 components** with hardcoded currency references:

### Form Dialogs (Labels need dynamic currency symbol)

| Component | Hardcoded Labels | Lines |
|-----------|------------------|-------|
| `AddDebtDialog.tsx` | "Outstanding Balance ($)" and "Monthly Payment ($ - optional)" | 130, 172 |
| `EditDebtDialog.tsx` | "Outstanding Balance ($)" and "Monthly Payment ($ - optional)" | 135, 177 |
| `AddIncomeDialog.tsx` | "Monthly Amount (USD)" | 80 |
| `EditIncomeDialog.tsx` | "Monthly Amount (USD)" | 90 |
| `AddExpenseDialog.tsx` | "Monthly Amount (USD)" | 88 |
| `EditExpenseDialog.tsx` | "Monthly Amount (USD)" | 98 |
| `AddOneTimeExpenseDialog.tsx` | "Amount (USD)" | 111 |

### Chart Component (Y-axis labels need dynamic symbol)

| Component | Issue | Line |
|-----------|-------|------|
| `NetWorthChart.tsx` | Y-axis tickFormatter uses hardcoded `$` | 47 |

---

## Solution Overview

### Approach: Pass `displayUnit` as a prop to all affected components

Since the `displayUnit` state lives in the `Index.tsx` page (via `usePortfolio`), we need to pass it down to each component that displays currency labels. The components will then use the `UNIT_SYMBOLS` map from `lib/types.ts` to get the correct symbol.

---

## Technical Implementation

### 1. Update Types (No changes needed)

The `UNIT_SYMBOLS` map already exists in `src/lib/types.ts`:

```tsx
export const UNIT_SYMBOLS: Record<DisplayUnit, string> = {
  USD: '$',
  BTC: '₿',
  GOLD: 'oz',
  EUR: '€',
  GBP: '£',
};
```

### 2. Update Form Dialog Components

For each form dialog, add `displayUnit` prop and use it in labels:

**AddDebtDialog.tsx** (and EditDebtDialog.tsx):
```tsx
import { DisplayUnit, UNIT_SYMBOLS } from '@/lib/types';

interface AddDebtDialogProps {
  onAdd: (data: DebtFormData) => void;
  displayUnit: DisplayUnit;  // Add prop
}

// In FormLabel:
<FormLabel>Outstanding Balance ({UNIT_SYMBOLS[displayUnit]})</FormLabel>
<FormLabel>Monthly Payment ({UNIT_SYMBOLS[displayUnit]} - optional)</FormLabel>
```

**AddIncomeDialog.tsx** (and EditIncomeDialog.tsx):
```tsx
import { DisplayUnit, UNIT_SYMBOLS } from '@/lib/types';

interface AddIncomeDialogProps {
  onAdd: (income: IncomeFormData) => void;
  displayUnit: DisplayUnit;
}

// In FormLabel:
<FormLabel>Monthly Amount ({UNIT_SYMBOLS[displayUnit]})</FormLabel>
```

**AddExpenseDialog.tsx** (and EditExpenseDialog.tsx):
```tsx
import { DisplayUnit, UNIT_SYMBOLS } from '@/lib/types';

interface AddExpenseDialogProps {
  onAdd: (expense: ExpenseFormData) => void;
  displayUnit: DisplayUnit;
}

// In FormLabel:
<FormLabel>Monthly Amount ({UNIT_SYMBOLS[displayUnit]})</FormLabel>
```

**AddOneTimeExpenseDialog.tsx**:
```tsx
import { DisplayUnit, UNIT_SYMBOLS } from '@/lib/types';

interface AddOneTimeExpenseDialogProps {
  onAdd: (...) => void;
  displayUnit: DisplayUnit;
}

// In FormLabel:
<FormLabel>Amount ({UNIT_SYMBOLS[displayUnit]})</FormLabel>
```

### 3. Update NetWorthChart.tsx

```tsx
import { DisplayUnit, UNIT_SYMBOLS } from '@/lib/types';

interface NetWorthChartProps {
  formatValue: (value: number, showDecimals?: boolean) => string;
  displayUnit: DisplayUnit;
}

// Update YAxis tickFormatter:
tickFormatter={(value) => {
  const symbol = UNIT_SYMBOLS[displayUnit];
  if (displayUnit === 'GOLD') {
    return `${(value / 1000).toFixed(2)} ${symbol}`;
  }
  if (displayUnit === 'BTC') {
    return `${symbol}${value.toFixed(4)}`;
  }
  return `${symbol}${(value / 1000).toFixed(0)}k`;
}}
```

### 4. Update Index.tsx to Pass displayUnit

Pass `displayUnit` to all the affected components:

```tsx
<AddDebtDialog onAdd={addDebt} displayUnit={displayUnit} />
<AddIncomeDialog onAdd={addIncome} displayUnit={displayUnit} />
<AddExpenseDialog onAdd={...} displayUnit={displayUnit} />
<AddOneTimeExpenseDialog onAdd={...} displayUnit={displayUnit} />
<NetWorthChart formatValue={formatValue} displayUnit={displayUnit} />
```

### 5. Update Child Components (Edit Dialogs)

The Edit dialogs are rendered inside `DebtOverviewCard` and `IncomeExpenseCard`, so we also need to pass `displayUnit` through these parent components.

**DebtOverviewCard.tsx**: Add `displayUnit` prop and pass to `EditDebtDialog`
**IncomeExpenseCard.tsx**: Add `displayUnit` prop and pass to `EditIncomeDialog` and `EditExpenseDialog`

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AddDebtDialog.tsx` | Add displayUnit prop, update 2 FormLabels |
| `src/components/EditDebtDialog.tsx` | Add displayUnit prop, update 2 FormLabels |
| `src/components/AddIncomeDialog.tsx` | Add displayUnit prop, update 1 FormLabel |
| `src/components/EditIncomeDialog.tsx` | Add displayUnit prop, update 1 FormLabel |
| `src/components/AddExpenseDialog.tsx` | Add displayUnit prop, update 1 FormLabel |
| `src/components/EditExpenseDialog.tsx` | Add displayUnit prop, update 1 FormLabel |
| `src/components/AddOneTimeExpenseDialog.tsx` | Add displayUnit prop, update 1 FormLabel |
| `src/components/NetWorthChart.tsx` | Add displayUnit prop, update YAxis tickFormatter |
| `src/components/DebtOverviewCard.tsx` | Add displayUnit prop, pass to EditDebtDialog |
| `src/components/IncomeExpenseCard.tsx` | Add displayUnit prop, pass to Edit dialogs |
| `src/pages/Index.tsx` | Pass displayUnit to all affected components |

---

## Testing Checklist

After implementation:

1. Select USD - all labels show `$` and chart Y-axis shows `$150k`
2. Select EUR - all labels show `€` and chart Y-axis shows `€150k`
3. Select GBP - all labels show `£` and chart Y-axis shows `£150k`
4. Select BTC - all labels show `₿` and chart Y-axis shows `₿0.0015`
5. Select Gold - all labels show `oz` and chart Y-axis shows `45.00 oz`
6. Open Add Debt dialog - verify labels update
7. Open Add Income dialog - verify labels update
8. Open Add Expense dialog - verify labels update
9. Click edit on existing items - verify labels update

