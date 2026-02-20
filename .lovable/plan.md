

# Fix: AI Advisor DCA Strategy Creation

## Problem

The AI advisor discusses DCA strategies conversationally but never actually creates them in the database. Two root causes:

1. **parse-voice-command failure**: The edge function call fails ("Failed to fetch"), so `CREATE_DCA` is never triggered
2. **Multi-turn conversations don't trigger actions**: The advisor builds strategy details across multiple messages (as seen in your screenshots), but `parse-voice-command` only parses single messages -- it can't accumulate intent across a conversation

## Solution

Enable the `financial-advisor` edge function itself to return structured action commands embedded in its response, so the frontend can detect and execute them -- no dependency on `parse-voice-command`.

### How It Works

1. Update the `financial-advisor` system prompt to emit a special JSON block (e.g. `<!--ACTION:{"action":"CREATE_DCA","data":{...}}-->`) when the user confirms they want to create a strategy
2. After streaming the advisor's response, the frontend scans for this action block
3. If found, it extracts the action and runs it through `executeAction` (same path as voice commands)
4. The strategy gets created in the database and appears on the `/dca` page

### Step 1: Update `financial-advisor` System Prompt

**File: `supabase/functions/financial-advisor/index.ts`**

Add instructions telling the AI to embed an action block when the user has confirmed all DCA parameters. The format:

```
<!--ACTION:{"action":"CREATE_DCA","data":{"to_token":"cbBTC","frequency":"daily","amount_per_execution":10,"total_budget_usd":210,"max_executions":21,"dip_threshold_pct":5,"dip_multiplier":2}}-->
```

The AI should only emit this after the user confirms. It should continue providing its normal conversational response around the action block.

### Step 2: Parse Action Blocks in Frontend

**File: `src/components/FinancialAdvisorChat.tsx`**

After `streamChat` returns the assistant's response, scan for `<!--ACTION:...-->` patterns. If found:
- Extract the JSON payload
- Call `executeAction` with the parsed action
- Strip the action block from the displayed message (so the user sees clean text)
- Show a toast confirming the strategy was created

### Step 3: Ensure parse-voice-command Still Works as Fast Path

No changes needed to the existing `parse-voice-command` flow -- it remains as an optimization for simple one-shot commands like "Create a weekly DCA of $50 into ETH". The new embedded-action approach handles the multi-turn conversation case.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/financial-advisor/index.ts` | Add ACTION block instructions to system prompt |
| `src/components/FinancialAdvisorChat.tsx` | Parse ACTION blocks from streamed responses and execute them |

## No New Files

## Result

- The AI advisor can create DCA strategies through natural multi-turn conversation
- Strategies appear immediately on the `/dca` dashboard after creation
- Works independently of `parse-voice-command` (no single point of failure)
- One-shot commands still use the fast `parse-voice-command` path when available

