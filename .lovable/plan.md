
# Fix: Income Currency Not Saving & Wrong Monthly Total

## Problems Identified

### Problem 1: Currency from Form is Being Ignored
When you add income in the dialog, the form correctly captures the currency (e.g., SATS, EUR), but it gets **overwritten** in `Index.tsx`. 

The current code on line 443:
```tsx
onAdd={(data) => addIncome({ 
  ...data, 
  currency: displayUnit === 'BTC' || displayUnit === 'GOLD' ? 'USD' : displayUnit 
})}
```

This **ignores** the currency you selected in the form and always uses the dashboard's display unit instead.

### Problem 2: Type Definition Missing 'mining'
The type signature only allows `'work' | 'passive' | 'investment'` but not `'mining'`, which means mining income isn't handled correctly.

### Problem 3: Wrong Monthly Income Total
Once the data fix is applied, the monthly income total should calculate correctly. Currently, 250,000 SATS is being treated as $250,000 USD because the database stores `currency: USD`.

---

## Solution

### Step 1: Fix the Index.tsx Income Handler
Update line 443 to:
- Include 'mining' in the type definition
- Use the currency **from the form data** instead of overwriting it
- Only fallback to display unit if no currency is provided

### Step 2: Re-enter the Income Data
After the fix is deployed, delete the existing income entries and re-add them:
- "antminer" with Bitcoin Mining type (will auto-select SATS)
- "Rental income" with EUR currency selected

---

## Technical Changes

| File | Line | Change |
|------|------|--------|
| `src/pages/Index.tsx` | 443 | Update `onAdd` handler to preserve form currency |

### Code Change
```tsx
// Before (line 443)
actionButton={isDemo ? undefined : <AddIncomeDialog 
  onAdd={(data: { source: string; amount: number; type: 'work' | 'passive' | 'investment' }) => 
    addIncome({ ...data, currency: displayUnit === 'BTC' || displayUnit === 'GOLD' ? 'USD' : displayUnit })} 
  displayUnit={displayUnit} />}

// After
actionButton={isDemo ? undefined : <AddIncomeDialog 
  onAdd={(data: { source: string; amount: number; type: 'work' | 'passive' | 'investment' | 'mining'; currency: string }) => 
    addIncome(data)} 
  displayUnit={displayUnit} />}
```

This change:
1. Adds 'mining' to the type definition
2. Adds 'currency' to the type definition  
3. Passes the form data directly without overwriting the currency

---

## Expected Result
After deploying the fix and re-entering your income:
- Mining income of 250,000 SATS will display as "250,000 sats"
- Rental income of 2,020 EUR will display as "€2,020.00"
- Monthly Income total will correctly convert all currencies to the selected display unit
