
# Fix: Auto-Switch Currency to SATS When Selecting Bitcoin Mining

## Problem
When selecting "Bitcoin Mining" as the income type, the currency dropdown does not automatically switch to SATS. The user has to manually change it from USD to SATS.

## Root Cause
The `form.setValue('currency', 'SATS')` call on line 59 doesn't trigger a UI re-render of the currency Select component. React Hook Form's `setValue` doesn't automatically update the UI unless specific options are passed.

## Current Code (Line 57-61)
```tsx
useEffect(() => {
  if (selectedType === 'mining' && !isBitcoinCurrency(selectedCurrency)) {
    form.setValue('currency', 'SATS');
  }
}, [selectedType, selectedCurrency, form]);
```

## Solution
Update the `setValue` call to include options that force the form to re-render and update the Select component's displayed value.

## File Changes

**`src/components/AddIncomeDialog.tsx`** (Line 59):
```tsx
// Before
form.setValue('currency', 'SATS');

// After
form.setValue('currency', 'SATS', { shouldValidate: true, shouldDirty: true });
```

## Technical Details
| Option | Purpose |
|--------|---------|
| `shouldValidate: true` | Triggers form validation, which causes the field to re-render |
| `shouldDirty: true` | Marks the field as dirty, ensuring form state is updated |

These options ensure that when the type changes to "mining", the currency dropdown UI immediately updates to show "sats - Satoshis (sats)" instead of remaining on "USD".
