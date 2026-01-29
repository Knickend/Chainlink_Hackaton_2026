

# Fix Currency Conversion Bug for Debts, Income, and Expenses

## Problem

When you enter €400,000 for a debt while EUR is selected as the display currency, switching between EUR and USD causes the value to change incorrectly (€400,000 becomes €368,000).

**Why this happens:**
- The debt form shows the currency symbol (€) matching your selected display unit
- But when you enter 400,000, it stores this raw number in the database
- The system then treats 400,000 as USD when displaying
- Converting "400,000 USD" to EUR (×0.92) shows €368,000

The same issue exists for Income and Expenses - they don't store the currency they were entered in.

---

## Solution Overview

There are two possible approaches:

### Option A: Store Currency with Each Record (Recommended)

Add a `currency` field to debts, income, and expenses tables (similar to how banking assets work). This allows accurate multi-currency tracking but requires database changes.

### Option B: Always Store as USD (Simpler)

Convert values to USD when saving, then convert to display currency when showing. The label would always show the selected display symbol, and the value would be converted on save.

**Recommended: Option A** - This matches the existing pattern for banking assets and provides better accuracy for users tracking finances in multiple currencies.

---

## Technical Implementation

### 1. Database Changes

Add `currency` column to three tables:

```sql
-- Add currency column to debts table
ALTER TABLE debts ADD COLUMN currency text DEFAULT 'USD';

-- Add currency column to income table  
ALTER TABLE income ADD COLUMN currency text DEFAULT 'USD';

-- Add currency column to expenses table
ALTER TABLE expenses ADD COLUMN currency text DEFAULT 'USD';
```

### 2. Type Updates (`src/lib/types.ts`)

Update the `Debt`, `Income`, and `Expense` interfaces:

```typescript
export interface Debt {
  id: string;
  name: string;
  debt_type: DebtType;
  principal_amount: number;
  interest_rate: number;
  monthly_payment?: number;
  currency: string;  // NEW: 'USD', 'EUR', 'GBP', etc.
}

export interface Income {
  id: string;
  source: string;
  amount: number;
  type: 'work' | 'passive' | 'investment';
  currency: string;  // NEW
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  is_recurring: boolean;
  expense_date?: string;
  currency: string;  // NEW
}
```

### 3. Hook Updates

**useDebts.ts:**
- Save the `displayUnit` as `currency` when adding/updating
- When displaying, check if the debt's currency matches the display unit
- If match: show amount directly without conversion
- If different: convert from debt's currency → USD → display currency

**Similar updates for usePortfolioData.ts** for income and expenses.

### 4. Dialog Updates

**AddDebtDialog.tsx / EditDebtDialog.tsx:**
- Accept `displayUnit` prop (already done)
- Pass the current `displayUnit` as `currency` when saving

**Similar for Income and Expense dialogs.**

### 5. Display Logic

When formatting values in DebtOverviewCard, IncomeExpenseCard, etc.:

```typescript
const displayDebtValue = (debt: Debt, displayUnit: DisplayUnit): number => {
  // If the debt's currency matches display unit, show original amount
  if (debt.currency === displayUnit) {
    return debt.principal_amount;
  }
  
  // Otherwise, convert: debt currency → USD → display unit
  const amountInUSD = debt.principal_amount * FOREX_RATES_TO_USD[debt.currency];
  return amountInUSD * conversionRates[displayUnit];
};
```

---

## Files to Modify

| Category | File | Changes |
|----------|------|---------|
| Database | Migration | Add `currency` column to debts, income, expenses |
| Types | `src/lib/types.ts` | Add `currency` field to interfaces |
| Hooks | `src/hooks/useDebts.ts` | Save/load currency, add conversion logic |
| Hooks | `src/hooks/usePortfolioData.ts` | Save/load currency for income/expenses |
| Dialogs | `src/components/AddDebtDialog.tsx` | Pass currency when adding |
| Dialogs | `src/components/EditDebtDialog.tsx` | Handle currency in edit |
| Dialogs | `src/components/AddIncomeDialog.tsx` | Pass currency when adding |
| Dialogs | `src/components/EditIncomeDialog.tsx` | Handle currency in edit |
| Dialogs | `src/components/AddExpenseDialog.tsx` | Pass currency when adding |
| Dialogs | `src/components/EditExpenseDialog.tsx` | Handle currency in edit |
| Dialogs | `src/components/AddOneTimeExpenseDialog.tsx` | Pass currency when adding |
| Cards | `src/components/DebtOverviewCard.tsx` | Use currency-aware display |
| Cards | `src/components/IncomeExpenseCard.tsx` | Use currency-aware display |
| Page | `src/pages/Index.tsx` | Update totals calculation |

---

## Special Considerations

### Existing Data Migration
- Existing debts/income/expenses will default to USD (matching current behavior)
- No data loss - users can edit existing items to set correct currency if needed

### Display Unit vs Entry Currency
- The form label shows the currently selected display unit symbol (€, £, $)
- When saved, the `currency` field stores which currency was active
- This ensures values display correctly regardless of display unit changes

### BTC and Gold Units
- For BTC and GOLD display units, values would still be stored in USD
- These are display-only conversions since debts/expenses are in fiat currencies

---

## Testing Checklist

After implementation:

1. Add a debt of €400,000 while EUR is selected
2. Switch to USD - debt should show ~$435,000 (400k × 1.08)
3. Switch back to EUR - debt should show exactly €400,000
4. Add an income in GBP, verify it displays correctly across currencies
5. Verify existing debts/income/expenses still work (default to USD)
6. Test editing a debt - verify currency is preserved

