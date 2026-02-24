

## Fix: AI CFO Should Auto-Include Date When User Mentions One

### Problem
When the user says "add groceries expense of 35 dollar that I made yesterday", the AI:
1. Adds the expense but **without a date** -- the `expense_date` field is omitted from the action
2. Marks it as **recurring** by default (because `is_recurring` defaults to `true` in the action executor)
3. The user then has to separately ask the AI to add the date

### Root Cause
- The system prompt lists `expense_date` and `is_recurring` as optional fields but doesn't tell the AI to **always extract temporal references** and set `is_recurring: false` when a date is mentioned
- The action executor defaults `is_recurring` to `true` even for expenses with specific dates

### Solution

**1. Strengthen the system prompt** (`supabase/functions/financial-advisor/index.ts`)

Add explicit instructions in the "Rules" section:
- When the user mentions a specific date or relative date (e.g., "yesterday", "last Tuesday", "on Feb 20"), ALWAYS include `expense_date` (or `income_date`) in the action data
- When an `expense_date` is provided, automatically set `is_recurring: false` since dated expenses are one-time by default
- Same logic for `ADD_INCOME` with `income_date`

**2. Fix the default in the action executor** (`src/hooks/useVoiceActions.ts`)

Change the `ADD_EXPENSE` handler so that if `expense_date` is provided but `is_recurring` is not explicitly set, it defaults to `false` instead of `true`. This ensures dated expenses are treated as one-time:

```
is_recurring: data.is_recurring ?? (data.expense_date ? false : true)
```

### Files to Edit
- `supabase/functions/financial-advisor/index.ts` -- add rules about date extraction
- `src/hooks/useVoiceActions.ts` -- fix `is_recurring` default when date is present
