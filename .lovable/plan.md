
Goal: Fix the Debt Payoff Calculator so it does not “double convert” debt amounts. A debt entered as €400,000 should show €400,000 when the display unit is EUR (and a correctly converted USD value when the display unit is USD).

## What’s happening (root cause)
- Debts are now stored with their own `currency` (e.g., EUR) and the raw `principal_amount` / `monthly_payment` are in that original currency.
- `DebtPayoffCalculator` still formats all numbers using `formatValue(...)`, which assumes every number it receives is in USD.
- So when the calculator formats a EUR-stored amount (400,000) with `formatValue`, it treats it as “400,000 USD” and converts it to EUR → ~€368,000 (using the USD→EUR rate), producing the incorrect value you see.

## Key design decision
- Keep payoff math in the debt’s own currency (principal, payment, interest).
- Only convert for display using the debt’s stored currency, so EUR stays EUR when viewing in EUR.

## Changes to make

### 1) Update `DebtPayoffCalculator` to be currency-aware
File: `src/components/DebtPayoffCalculator.tsx`

**Prop changes**
- Replace/extend current props so the calculator can:
  - Convert amounts from each debt’s stored currency into the selected display unit
  - Format those converted amounts correctly

Proposed new props:
- `displayUnit: DisplayUnit`
- `convertFromCurrency: (amount: number, fromCurrency: string) => number` (from `usePortfolio`)
- `formatCurrencyValue: (amount: number, fromCurrency: string, showDecimals?: boolean) => string` (from `usePortfolio`)
- Keep `debts` and `delay`

**In-component formatting**
- For per-debt values (principal, interest, payment, totals, minimum payment):
  - Use `formatCurrencyValue(value, debt.currency || 'USD')`
  - This ensures:
    - If debt.currency === displayUnit → shows the original number unchanged (so €400,000 stays €400,000)
    - If different → converts correctly

**Fix summary totals**
The calculator currently sums raw numbers directly (which mixes currencies and then formats as USD).
Instead:
- Compute totals in *display unit* numerically using `convertFromCurrency` on each debt’s amounts, then sum:
  - `totalMonthlyPaymentsDisplay = sum(convertFromCurrency(debt.monthly_payment, debt.currency))`
  - `totalInterestToPayDisplay = sum(convertFromCurrency(details.totalInterest, details.debt.currency))`
- Add a local helper to format numbers that are already “in display unit” (no conversion step), because the hook formatters assume a source currency:
  - For USD/EUR/GBP: symbol + 2 decimals
  - For BTC: symbol + 6 decimals
  - For GOLD: 4 decimals + “oz”
  - Use `UNIT_SYMBOLS[displayUnit]` and `displayUnit` to choose formatting

**Places in the UI to update inside the calculator**
- Summary stats:
  - Total Interest (use display-total + local “already display unit” formatting)
  - Monthly Payments (same)
- Per-debt card:
  - Progress bar labels: Principal / Interest
  - Warning: “Minimum payment needed…”
  - Payment details: Payment / Total

### 2) Pass the new props from the dashboard page
File: `src/pages/Index.tsx`

- When destructuring from `usePortfolio(...)`, also include:
  - `convertFromCurrency`
  - `formatCurrencyValue`
- Update the `<DebtPayoffCalculator />` call to pass:
  - `debts={demoDebts}`
  - `displayUnit={displayUnit}`
  - `convertFromCurrency={convertFromCurrency}`
  - `formatCurrencyValue={formatCurrencyValue}`
  - `delay={...}`
- Remove `formatValue` from the calculator call if no longer needed by that component.

## Validation checklist (what you should see after)
1. Add a debt while display unit = EUR:
   - Principal: €400,000
   - Payment: €1,400/mo
2. Switch display unit to USD:
   - Principal changes to the correctly converted USD amount
   - Payment changes to the correctly converted USD amount
3. Switch back to EUR:
   - Principal returns to exactly €400,000 (not €368,000)
4. Confirm the “Total Interest” and “Monthly Payments” in the calculator summary also look consistent with the per-debt numbers.

## Notes / edge cases
- If any older debts were created before `currency` was saved correctly, they may still have `currency='USD'` even if you meant EUR. Those would still display “wrong” because the stored currency is wrong. If that comes up, the next step would be adding an explicit “Currency” selector inside Add/Edit Debt dialogs so you can correct old entries.

## Files touched
- `src/components/DebtPayoffCalculator.tsx`
- `src/pages/Index.tsx`
