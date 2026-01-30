
# Consolidate Expense Buttons into Single Dropdown Menu

## Overview

Improve the alignment of the Income, Expenses, and Debt cards by consolidating the two expense buttons ("Add Recurring" and "Non-Recurring") into a single "Add Expense" button with a dropdown menu. This creates visual consistency across all three cards and provides a cleaner user experience.

## Current State

| Card | Buttons | Issue |
|------|---------|-------|
| Monthly Income | 1 button: "Add Income" | Aligned |
| Expenses | 2 buttons: "Add Recurring" + "Non-Recurring" | Takes extra space, misaligned |
| Debts & Liabilities | 1 button: "Add Debt" | Aligned |

## Solution

Replace the two separate expense buttons with a single "Add Expense" dropdown button that contains:
- "Recurring Expense" option
- "Non-Recurring Expense" option (with Pro badge for non-Pro users)

```text
Before:                          After:
+---------------+--------+       +---------------+
| + Add Recurring | Non...       | + Add Expense ▾
+---------------+--------+       +---------------+
                                       |
                                       ├─ Recurring Expense
                                       └─ Non-Recurring (Pro)
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/AddExpenseDropdown.tsx` | Create | New dropdown component combining both expense types |
| `src/pages/Index.tsx` | Modify | Replace two buttons with single dropdown |
| `src/components/IncomeExpenseCard.tsx` | Modify | Remove `secondaryActionButton` prop (no longer needed) |

## Component Design

### AddExpenseDropdown Component

A single button that opens a dropdown menu with two options:

```text
+---------------------+
| + Add Expense    ▾  |
+---------------------+
       ↓ (click)
+---------------------+
| ↻ Recurring         |
|---------------------|
| ⚡ Non-Recurring Pro |
+---------------------+
```

**Behavior:**
- Click "Recurring" opens the recurring expense dialog (same form as current)
- Click "Non-Recurring" opens the one-time expense dialog with date picker (same form as current)
- For non-Pro users, clicking "Non-Recurring" prompts upgrade

### Implementation Approach

The new component will:
1. Use `DropdownMenu` from shadcn/ui for the menu structure
2. Embed both expense forms in separate `Dialog` components
3. Track which dialog is open via state
4. Style consistently with the other "Add" buttons (red/danger color scheme)

## Visual Alignment Result

After implementation, all three cards will have matching single-button headers:

```text
+-------------------+  +-------------------+  +----------------------+
| Monthly Income    |  | Expenses          |  | Debts & Liabilities  |
| + Add Income      |  | + Add Expense ▾   |  | + Add Debt           |
+-------------------+  +-------------------+  +----------------------+
```

## Technical Details

### AddExpenseDropdown Props

```typescript
interface AddExpenseDropdownProps {
  onAddRecurring: (data: { name: string; amount: number; category: string }) => void;
  onAddOneTime: (data: { name: string; amount: number; category: string; is_recurring: false; expense_date: string }) => void;
  displayUnit: DisplayUnit;
  isPro: boolean;
  onUpgrade?: () => void;
}
```

### Dropdown Menu Structure

```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" className="border-danger/30 text-danger">
      <Plus /> Add Expense <ChevronDown />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => setRecurringOpen(true)}>
      <Repeat /> Recurring Expense
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleOneTime}>
      <Zap /> Non-Recurring {!isPro && <ProBadge />}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Index.tsx Changes

Replace the current expense card buttons:

```typescript
// Before:
actionButton={<AddExpenseDialog ... />}
secondaryActionButton={isPro ? <AddOneTimeExpenseDialog ... /> : undefined}

// After:
actionButton={<AddExpenseDropdown 
  onAddRecurring={...}
  onAddOneTime={...}
  displayUnit={displayUnit}
  isPro={isPro}
  onUpgrade={() => setShowSubscriptionDialog(true)}
/>}
// Remove secondaryActionButton entirely
```

## Pro Feature Handling

- Non-recurring expense tracking remains a Pro feature
- The dropdown shows both options to all users
- Non-Pro users clicking "Non-Recurring" triggers the upgrade dialog
- Pro badge displays next to "Non-Recurring" for visual indication

## Summary

This change consolidates the two expense buttons into a single dropdown, creating visual harmony across the Income, Expenses, and Debt cards. The functionality remains identical - just accessed through a cleaner, more organized interface.
