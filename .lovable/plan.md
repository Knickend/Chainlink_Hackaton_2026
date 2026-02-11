

## Inject Portfolio Context into the Financial Advisor

### What this does

Right now, the AI advisor cannot see your actual portfolio data -- it only receives your chat messages. After this change, every message you send will include a compact summary of your assets, income, expenses, debts, and goals so the advisor can give specific, personalized answers like "You have 60% in crypto, consider adding stocks for diversification."

### Changes

**1. Add `buildPortfolioSummary()` helper in `FinancialAdvisorChat.tsx`**

A function that serializes the already-loaded dashboard data into a concise text block:

```text
## Current Portfolio Snapshot
Assets (5 total, $47,200):
- Banking: Savings Account -- $10,000 (USD)
- Crypto: Bitcoin -- 0.25 BTC
- Stocks: AAPL -- 10 shares
...
Monthly Income: $5,500 (recurring) + $200 (one-time)
Monthly Expenses: $3,200
Debts: $15,000 total (mortgage 4.5%, credit card 19.9%)
Goals: Emergency Fund -- $3,000/$10,000 (30%)
```

This uses `assets`, `income`, `expenses`, `debts`, and `goals` which are already available in the component (lines 118-139). No extra database calls needed.

**2. Pass `portfolioContext` in the `streamChat()` call**

Update `streamChat` (line 179) and `sendMessage` (line 253) to include the portfolio summary string in the request body alongside `messages` and `memories`.

**3. Update the `financial-advisor` edge function**

- Extract `portfolioContext` from the request body
- Update `buildSystemPrompt()` to accept and inject the portfolio snapshot between the base prompt and memory context
- Not Pro-gated -- all users benefit from the advisor seeing their data

### Files to modify

| File | Change |
|------|--------|
| `src/components/FinancialAdvisorChat.tsx` | Add `buildPortfolioSummary(assets, income, expenses, debts, goals)` helper. Update `streamChat` to accept and send `portfolioContext`. Call it in `sendMessage` before streaming. |
| `supabase/functions/financial-advisor/index.ts` | Extract `portfolioContext` from request body. Update `buildSystemPrompt` signature to accept it and inject between base prompt and memories section. |

### Privacy note

The portfolio summary is built client-side from data the user already owns and is visible on their dashboard. It is sent only to the AI advisor backend function and not stored or shared externally.

