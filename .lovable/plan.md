

## Enable AI CFO to Execute Dashboard Actions

### Problem
When you ask the AI CFO to update expenses, income, or other cards in a conversational way (e.g., "Can you update my Netflix to $20?"), it responds saying it cannot interact with the dashboard. This happens because:

1. The message first goes through a command parser that tries to detect actions
2. If the parser classifies it as a general question (which happens with conversational phrasing), it falls through to the AI chat
3. The AI chat has **no knowledge** that it can trigger dashboard actions -- its system prompt only describes it as an advisor

### Solution: Teach the AI CFO to emit action commands

Update the system so the conversational AI itself can trigger dashboard actions by embedding structured action tags in its responses. The frontend will parse these tags and execute them.

### Changes

**1. Update the financial-advisor edge function system prompt** (`supabase/functions/financial-advisor/index.ts`)

Add instructions to the system prompt telling the AI it can perform CRUD operations on the user's portfolio. When the user asks to add, update, or delete items, it should include a hidden action block in its response:

```
<!--ACTION:{"action":"UPDATE_EXPENSE","data":{"name":"Netflix","amount":20}}-->
```

The AI should still provide a conversational confirmation message alongside the action tag.

Supported actions to document in the prompt:
- ADD_ASSET, UPDATE_ASSET, DELETE_ASSET
- ADD_INCOME, UPDATE_INCOME, DELETE_INCOME
- ADD_EXPENSE, UPDATE_EXPENSE, DELETE_EXPENSE
- ADD_DEBT, UPDATE_DEBT, DELETE_DEBT
- ADD_GOAL, UPDATE_GOAL, DELETE_GOAL

The AI will also have access to the portfolio snapshot, so it knows the exact names and current values of items.

**2. Parse action tags from streamed AI responses** (`src/components/FinancialAdvisorChat.tsx`)

After streaming completes:
- Scan the final assistant message for `<!--ACTION:{...}-->` patterns using regex
- Extract the JSON payload
- Strip the action tags from the visible message text
- Execute the action via the existing `executeAction` function (which already handles all CRUD operations)
- For destructive actions (DELETE), show the existing confirmation UI before executing

**3. No changes needed to:**
- `useVoiceActions.ts` -- already handles all action types
- `usePortfolio`, `useDebts`, `useGoals` hooks -- already wired up
- `parse-voice-command` edge function -- continues to work as the fast-path for clearly imperative commands

### How it will work

```text
User types: "Update my Netflix subscription to $18"

Flow:
1. parseVoiceCommand tries to parse it
   -> If it returns UPDATE_EXPENSE: executed directly (existing path, no change)
   -> If it returns QUESTION: falls through to AI chat (current behavior)

2. AI CFO (financial-advisor) receives the message WITH portfolio context
   -> Sees the user's expenses list including "Netflix" at $15
   -> Responds: "Done! I've updated your Netflix expense to $18/month."
   -> Embeds: <!--ACTION:{"action":"UPDATE_EXPENSE","data":{"name":"Netflix","amount":18}}-->

3. Frontend parses the action tag from the response
   -> Strips it from visible text
   -> Calls executeAction({action: "UPDATE_EXPENSE", data: {name: "Netflix", amount: 18}})
   -> Dashboard updates in real-time
```

### Technical Details

- The action tag format uses HTML comments so markdown renderers ignore them
- Regex pattern: `/<!--ACTION:(.*?)-->/g`
- For DELETE actions, the frontend will intercept and show the confirmation dialog before executing
- The AI is instructed to only emit ONE action per response to keep things predictable
- The portfolio context already sent to the AI includes item names, values, and categories, giving it enough information to match items correctly

