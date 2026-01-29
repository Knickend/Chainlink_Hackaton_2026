
# Update Expense Labels: "Recurring" and "Non-Recurring"

## Overview

Update all user-facing labels to use clearer terminology:
- **"Expense" → "Recurring"** (for monthly recurring expenses)
- **"One-Time" → "Non-Recurring"** (for non-recurring expenses)

---

## Files to Update

### 1. `src/components/SubscriptionBanner.tsx`
| Line | Current | New |
|------|---------|-----|
| 30 | `One-time expenses` | `Non-recurring expenses` |

### 2. `src/components/AddOneTimeExpenseDialog.tsx`
| Line | Current | New |
|------|---------|-----|
| 78 | `One-Time` (button text) | `Non-Recurring` |
| 84 | `Add One-Time Expense` (dialog title) | `Add Non-Recurring Expense` |
| 178 | `Add One-Time Expense` (submit button) | `Add Non-Recurring Expense` |

### 3. `src/components/AddExpenseDialog.tsx`
| Line | Current | New |
|------|---------|-----|
| 62 | `Add Expense` (button) | `Add Recurring` |
| 67 | `Add New Expense` (dialog title) | `Add Recurring Expense` |
| 132 | `Add Expense` (submit button) | `Add Recurring Expense` |

### 4. `src/components/IncomeExpenseCard.tsx`
| Line | Current | New |
|------|---------|-----|
| 96 | `${recurringCount} monthly${oneTimeCount > 0 ? \`, \${oneTimeCount} one-time\` : ''}` | `${recurringCount} recurring${oneTimeCount > 0 ? \`, \${oneTimeCount} non-recurring\` : ''}` |
| 152 | `Monthly` (badge text) | `Recurring` |
| 154 | `One-time` (badge text) | `Non-recurring` |

### 5. `src/components/landing/PricingSection.tsx`
| Line | Current | New |
|------|---------|-----|
| 43 | `One-time expense tracking` | `Non-recurring expense tracking` |

### 6. `src/lib/subscription.ts`
| Line | Current | New |
|------|---------|-----|
| 34 | `One-time expense tracking` | `Non-recurring expense tracking` |

---

## Summary of Changes

| Component | Current Label | New Label |
|-----------|---------------|-----------|
| Add button for recurring | "Add Expense" | "Add Recurring" |
| Add dialog for recurring | "Add New Expense" | "Add Recurring Expense" |
| Add button for non-recurring | "One-Time" | "Non-Recurring" |
| Add dialog for non-recurring | "Add One-Time Expense" | "Add Non-Recurring Expense" |
| Badge for recurring | "Monthly" | "Recurring" |
| Badge for non-recurring | "One-time" | "Non-recurring" |
| Subtitle count | "X monthly, Y one-time" | "X recurring, Y non-recurring" |
| Pro feature list | "One-time expense tracking" | "Non-recurring expense tracking" |
