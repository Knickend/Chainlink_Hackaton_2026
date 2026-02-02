
# Add Currency Selector to Expense Dialogs

## Overview
Add a currency selection dropdown to both the Add Expense and Edit Expense dialogs, matching the income dialog pattern. This will allow you to track expenses in their native currency (EUR, GBP, CHF, etc.) rather than only in the global display unit.

## What You'll Get
- Currency dropdown in the Add Recurring Expense dialog
- Currency dropdown in the Edit Expense dialog  
- Currency dropdown in the Add One-Time Expense dialog
- Dynamic label updates showing the selected currency symbol (e.g., "Monthly Amount (€)")
- All fiat currencies available (20 options: USD, EUR, GBP, CHF, JPY, etc.)

---

## Implementation Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/AddExpenseDialog.tsx` | Add currency field to form, add currency selector dropdown, update amount label to show selected currency symbol |
| `src/components/EditExpenseDialog.tsx` | Add currency field to form, add currency selector dropdown, update amount label dynamically |
| `src/components/AddOneTimeExpenseDialog.tsx` | Add currency field to form, add currency selector dropdown, update amount label dynamically |

### Key Changes

**Form Schema Update:**
- Add `currency: z.string().min(1, 'Currency is required')` to zod schema
- Default value: `'USD'`

**New Currency Selector Field:**
- Position after Category field (matching income dialog layout)
- Uses `BANKING_CURRENCIES` from `@/lib/types`
- Displays format: `€ - Euro`, `£ - British Pound`, etc.

**Dynamic Label:**
- Watch the currency field using `useWatch`
- Update "Monthly Amount" label to show the selected currency symbol

### Code Pattern (from AddIncomeDialog)
```tsx
// Watch currency to update label
const selectedCurrency = useWatch({ control: form.control, name: 'currency' });
const currencySymbol = BANKING_CURRENCIES.find(c => c.value === selectedCurrency)?.symbol || '$';

// Currency field in form
<FormField
  control={form.control}
  name="currency"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Currency</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger className="bg-secondary/50">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
        </FormControl>
        <SelectContent className="max-h-[300px]">
          {BANKING_CURRENCIES.map((currency) => (
            <SelectItem key={currency.value} value={currency.value}>
              {currency.symbol} - {currency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## Notes
- The database already has a `currency` column in the expenses table
- The `usePortfolioData` hook already handles saving/loading the currency field
- No backend changes required
