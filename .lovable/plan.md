
## Fix plan: AI CFO should always attach a date when user mentions one

### What I found
The missing date is happening on a different path than the AI CFO backend function:

1. **Text chat commands are pre-routed through `parse-voice-command` first** in `src/components/FinancialAdvisorChat.tsx` (`sendMessage`).
2. For actionable text like “add bill for dinner 3 days ago for 56 usd”, the app calls `parse-voice-command` and executes immediately (without using the AI CFO `financial-advisor` flow).
3. Current parser schema in `supabase/functions/parse-voice-command/index.ts` does **not include** `expense_date`/`income_date`, so date gets dropped.
4. Confirmed from network/logs:
   - `POST /functions/v1/parse-voice-command` returns:
     `{"action":"ADD_EXPENSE","data":{"name":"dinner","amount":56,"category":"Food","is_recurring":false,"currency":"USD"}}`
   - No matching `financial-advisor` log for that message.

So the AI CFO date rules were improved, but the active command path for add/update still omitted date fields.

---

## Implementation approach

### 1) Upgrade command parser contract to support dates (primary fix)
**File:** `supabase/functions/parse-voice-command/index.ts`

- Extend parser action schemas to include:
  - `ADD_EXPENSE`: `expense_date?: string`
  - `UPDATE_EXPENSE`: `expense_date?: string`
  - `ADD_INCOME`: `income_date?: string`
  - `UPDATE_INCOME`: `income_date?: string`
- Add explicit parser rules:
  - If user mentions a date/relative date, always include date field.
  - Date must be `YYYY-MM-DD`.
  - If date is present on ADD expense/income, default to one-time (`is_recurring: false`) unless user explicitly says recurring.

### 2) Add deterministic date post-processing so it never silently drops
**File:** `supabase/functions/parse-voice-command/index.ts`

After model JSON is parsed, normalize output before returning:

- Detect temporal references from original text (examples to support):
  - `today`, `yesterday`, `tomorrow`
  - `N days ago` / `N weeks ago`
  - `last Monday` (weekday references)
  - explicit date forms (`YYYY-MM-DD`, `Feb 20`, `February 20`, etc. where practical)
- If action is expense/income ADD/UPDATE and parsed payload is missing date but temporal reference exists:
  - inject computed `expense_date` / `income_date`.
- Enforce recurrence defaults on ADD:
  - date present + no explicit recurring intent → `is_recurring = false`.

This makes behavior reliable even when model output is incomplete.

### 3) Prevent text-mode date regressions at routing layer
**File:** `src/components/FinancialAdvisorChat.tsx`

Add guard before immediate execution of parsed action in `sendMessage`:

- If parsed action is `ADD/UPDATE_EXPENSE` or `ADD/UPDATE_INCOME`,
- and user text includes temporal reference,
- and parsed payload still lacks the required date field,
- **do not execute parser result directly**; fall back to AI CFO chat flow for that message.

This is a safety net so date is never lost again in text mode.

### 4) Ensure date updates persist in backend update calls (hardening)
**File:** `src/hooks/usePortfolioData.ts`

Current update payload builders omit date fields. Extend:
- `updateExpense` payload to include `expense_date` and `is_recurring` when provided.
- `updateIncome` payload to include `income_date` and `is_recurring` when provided.

This prevents “looks updated in UI but not actually persisted” issues for date edits.

---

## Sequence
1. Update parser schema + rules.
2. Add parser post-processing normalization.
3. Add routing guard in chat send flow.
4. Add persistence hardening in portfolio update hooks.
5. Validate manually end-to-end.

---

## Validation checklist (must pass)
1. Text mode:  
   “add dinner expense 56 usd 3 days ago”  
   → creates one-time expense with correct `expense_date`, correct amount.
2. Text mode:  
   “add groceries expense of 35 dollars that I made yesterday”  
   → date auto-included (`YYYY-MM-DD`), no follow-up needed.
3. Voice mode: same phrases above  
   → same outcome with date present.
4. Non-dated add:  
   “add netflix expense 15 usd monthly”  
   → remains recurring, no date forced.
5. Update flow:  
   “set date of dinner expense to yesterday”  
   → date persists after refresh (not only local state).
6. UI verification: item row shows non-recurring badge **and** date badge in Expense list.

---

## Technical notes
- No database migration required.
- No authentication changes required.
- This fix keeps existing architecture while closing the parser-vs-chat behavior gap that caused the missed dates.
