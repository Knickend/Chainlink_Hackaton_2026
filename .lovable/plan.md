

## Add Date Field to Edit Expense and Edit Income Dialogs

### Problem
When editing a one-time expense or income, there's no option to change the date. The Edit Expense dialog only shows Name, Amount, Currency, and Category -- missing the `expense_date` field. Same issue exists for Edit Income (missing `income_date`).

### Solution
Add a conditional date picker to both edit dialogs. The date field should only appear when the item is non-recurring (`is_recurring === false`), matching how the "Add" dialogs work.

### Changes

**1. `src/components/EditExpenseDialog.tsx`**
- Add `expense_date` (optional `Date`) to the zod schema -- only required when the expense is non-recurring
- Add imports: `Calendar`, `Popover`/`PopoverTrigger`/`PopoverContent`, `CalendarIcon`, `format`, `cn`
- Pre-populate `expense_date` from `expense.expense_date` (parse string to Date) when the dialog opens
- Add a date picker field (using the same Popover + Calendar pattern from `AddOneTimeExpenseDialog`) that only renders when `expense.is_recurring === false`
- Include `expense_date` in the `onSubmit` data, formatted as `yyyy-MM-dd`

**2. `src/components/EditIncomeDialog.tsx`**
- Same approach: add `income_date` to the schema
- Add the same date picker UI, shown only when `income.is_recurring === false`
- Include `income_date` in the submit data, formatted as `yyyy-MM-dd`

### Technical Details

The date picker pattern is already established in `AddOneTimeExpenseDialog.tsx` -- we'll reuse the exact same Popover + Calendar component approach. The schema will use `z.date().optional()` so it doesn't break recurring items that don't have a date. The label will change from "Monthly Amount" to just "Amount" when the item is non-recurring.

