

## Expense Date Attribution and Upcoming Expenses Agenda

### Overview

Two related improvements to expense tracking:

1. **Past-month expense attribution**: When logging a non-recurring expense that happened in a previous month, it should only count toward that month's calculations, not the current month.
2. **Upcoming/future expenses via an Agenda view**: Allow users to log future expenses (e.g., planned purchases, bills due next month) and see them in a new "Agenda" section. These should not impact current-month calculations until their date arrives.

---

### How It Works Today

- Non-recurring expenses already have an `expense_date` field stored in the database.
- However, the dashboard metrics (`usePortfolio.ts`) sum **all** expenses regardless of date -- past, present, and future all count toward the current month's totals.
- The calendar date picker in the "Add Non-Recurring Expense" dialog currently blocks future dates (`disabled={(date) => date > new Date()`).

---

### Changes

#### 1. Filter expenses by month in calculations

**File: `src/hooks/usePortfolio.ts`**

Update the metrics calculation to only include non-recurring expenses whose `expense_date` falls within the current month. Recurring expenses continue to count every month as they do today.

Logic:
- Recurring expenses: always included (no date filter)
- Non-recurring expenses with `expense_date` in the current month (YYYY-MM matches): included
- Non-recurring expenses with `expense_date` in a past or future month: excluded from current totals
- Non-recurring expenses with no `expense_date`: included (backward compatibility)

#### 2. Allow future dates in expense entry

**File: `src/components/AddOneTimeExpenseDialog.tsx`**
**File: `src/components/AddExpenseDropdown.tsx`**

Remove the `disabled={(date) => date > new Date()}` constraint from the calendar picker so users can select future dates for upcoming expenses.

#### 3. Add "Upcoming Expenses" agenda section

**New file: `src/components/UpcomingExpensesCard.tsx`**

A new card on the dashboard showing future non-recurring expenses sorted by date. Displays:
- Expense name, amount (in native currency), date, and category
- A total of upcoming expenses
- Visual distinction (e.g., calendar icon, "Upcoming" badge)
- Edit and delete actions (reuses existing EditExpenseDialog and DeleteConfirmDialog)

**File: `src/pages/Index.tsx`**

Add the UpcomingExpensesCard to the dashboard layout, placed near the existing Income/Expense cards.

#### 4. Show date on past non-recurring expenses in the expense list

**File: `src/components/IncomeExpenseCard.tsx`**

For non-recurring expenses, show the `expense_date` as a small label so users can see which month each expense belongs to.

---

### Technical Details

**Filtering logic** (in `usePortfolio.ts` metrics calculation):

```text
const currentYearMonth = new Date().toISOString().slice(0, 7); // "2026-02"

// Only include non-recurring expenses that belong to the current month
const isCurrentMonthExpense = (exp: Expense) => {
  if (exp.is_recurring) return true;
  if (!exp.expense_date) return true; // backward compat
  return exp.expense_date.startsWith(currentYearMonth);
};
```

**Upcoming expenses filter** (for the agenda card):

```text
const upcomingExpenses = expenses.filter(exp =>
  !exp.is_recurring && exp.expense_date && exp.expense_date > today
);
```

**No database changes needed** -- the `expense_date` column already exists and supports future dates.

**Files modified:**
- `src/hooks/usePortfolio.ts` -- date-aware expense filtering in metrics
- `src/components/AddOneTimeExpenseDialog.tsx` -- allow future dates
- `src/components/AddExpenseDropdown.tsx` -- allow future dates
- `src/components/IncomeExpenseCard.tsx` -- show expense date labels
- `src/pages/Index.tsx` -- add UpcomingExpensesCard

**New files:**
- `src/components/UpcomingExpensesCard.tsx` -- agenda card for future expenses
