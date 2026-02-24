

## Fix: AI CFO Sets Wrong Date and Overwrites Amount When Updating Expenses

### Problem
Two bugs when asking the AI CFO to update an expense (e.g., "add yesterday's date to my groceries expense"):

1. **Wrong date**: The AI said "May 21st" instead of "February 23rd" because the system prompt has no knowledge of the current date, so the model hallucinates one.
2. **Amount changed from 20 to 150 USD**: The AI generated an `UPDATE_EXPENSE` action with an `amount` field (required in the current schema), overwriting the original value. Also, the `UPDATE_EXPENSE` action doesn't support `expense_date` at all, so date-only updates are impossible.
3. **Missing item details**: The portfolio summary sent to the AI only shows totals for expenses/income, not individual item names and amounts. The AI can't look up the correct current values.

### Solution

**1. Add current date to the system prompt** (`supabase/functions/financial-advisor/index.ts`)
- Inject the current UTC date (e.g., "Today's date is 2026-02-24") into the system prompt so the AI can correctly compute "yesterday", "last week", etc.

**2. Add `expense_date` and `income_date` to the action schema** (`supabase/functions/financial-advisor/index.ts`)
- Update the system prompt's action documentation:
  - `UPDATE_EXPENSE`: add optional `expense_date` field (format: `YYYY-MM-DD`)
  - `UPDATE_INCOME`: add optional `income_date` field (format: `YYYY-MM-DD`)
  - `ADD_EXPENSE`: add optional `expense_date` field
  - `ADD_INCOME`: add optional `income_date` field
- Instruct the AI to only include fields the user wants to change (don't require `amount` for updates)

**3. Handle date fields in the action executor** (`src/hooks/useVoiceActions.ts`)
- In `UPDATE_EXPENSE`: pass through `expense_date` from `data` if present, and only include `amount` if explicitly provided
- In `UPDATE_INCOME`: pass through `income_date` from `data` if present
- In `ADD_EXPENSE`: pass through `expense_date` if present
- In `ADD_INCOME`: pass through `income_date` if present

**4. List individual expenses and income in the portfolio summary** (`src/components/FinancialAdvisorChat.tsx`)
- Expand the expense section in `buildPortfolioSummary` to list each expense by name, amount, currency, and date (if set)
- Do the same for income items
- This gives the AI the exact names and current amounts to reference

### What Won't Change
- No changes to the edit dialogs or database schema
- No visual changes to the chat UI
- Existing voice command parsing continues to work as before

### Technical Details

```text
System prompt additions:
  "Today's date is 2026-02-24 (Monday)."
  
  UPDATE_EXPENSE schema change:
    Before: {"name": string, "amount": number}
    After:  {"name": string, "amount"?: number, "expense_date"?: string}
    
  Portfolio context change:
    Before: "Monthly Expenses: $500 (3 recurring) + $20 (1 one-time)"
    After:  "Monthly Expenses: $500 (3 recurring) + $20 (1 one-time)
             - Netflix ($15/mo, USD, recurring)
             - Groceries ($20, USD, one-time, date: 2026-02-20)
             - ..."
```

Files to edit:
- `supabase/functions/financial-advisor/index.ts` -- date injection + schema update
- `src/hooks/useVoiceActions.ts` -- pass date fields through
- `src/components/FinancialAdvisorChat.tsx` -- list individual items in portfolio summary
