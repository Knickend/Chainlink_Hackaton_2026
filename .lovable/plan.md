

# Add DCA Navigation Link + AI Advisor DCA Strategy Creation

## Overview

Two changes: (1) add a visible navigation link to `/dca` from the main dashboard, and (2) enable the AI CFO advisor to create DCA strategies through conversation.

## Step 1: Add DCA Navigation to Dashboard Header

**File: `src/pages/Index.tsx`**

Add a "DCA" button in the header controls section (next to the Settings icon) that navigates to `/dca`. Uses the `Repeat` icon from lucide-react to represent recurring purchases. Only shown for authenticated (non-demo) users.

## Step 2: Add `CREATE_DCA` Action to Voice Command Parser

**File: `supabase/functions/parse-voice-command/index.ts`**

Add a new action type to the system prompt:

```
CREATE_DCA: { action: "CREATE_DCA", data: { to_token: "WETH"|"ETH"|"cbBTC", frequency: "daily"|"weekly"|"biweekly"|"monthly", amount_per_execution: number, total_budget_usd?: number, dip_threshold_pct?: number, dip_multiplier?: number } }
```

This lets the parser recognize DCA-related commands like "Set up a weekly DCA of $50 into ETH" or "Create a daily DCA buying $25 of cbBTC with a $5000 budget".

## Step 3: Handle `CREATE_DCA` in `useVoiceActions`

**File: `src/hooks/useVoiceActions.ts`**

- Accept `createDCAStrategy` as an optional handler prop
- Add a `CREATE_DCA` case that calls `createDCAStrategy` with the parsed parameters
- Returns a confirmation message with the strategy details

## Step 4: Wire DCA Hook into FinancialAdvisorChat

**File: `src/components/FinancialAdvisorChat.tsx`**

- Import and use `useDCAStrategies` hook
- Pass `createStrategy` to `useVoiceActions` as `createDCAStrategy`
- This enables the chat to create DCA strategies from natural conversation

## Step 5: Update AI CFO System Prompt

**File: `supabase/functions/financial-advisor/index.ts`**

Add DCA awareness to the system prompt so the AI knows:
- Users can set up automated DCA strategies via chat commands
- Available tokens: WETH, ETH, cbBTC (from USDC)
- Available frequencies: daily, weekly, bi-weekly, monthly
- It can suggest DCA when users ask about investment strategies
- Example phrasing: "Set up a weekly DCA of $100 into ETH"

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add DCA navigation button in header |
| `supabase/functions/parse-voice-command/index.ts` | Add CREATE_DCA action type |
| `src/hooks/useVoiceActions.ts` | Handle CREATE_DCA action |
| `src/components/FinancialAdvisorChat.tsx` | Wire useDCAStrategies into chat |
| `supabase/functions/financial-advisor/index.ts` | Add DCA context to system prompt |

## No New Files

All changes are modifications to existing files.

