

# Rename "Financial Advisor" to "AI CFO"

## Summary
Rename all user-facing references from "Financial Advisor" to "AI CFO" across the application to avoid implying a licensed financial advisory service. The backend edge function folder name stays the same (renaming folders in edge functions is disruptive), but all labels, system prompts, and log messages will be updated.

## Files to Change

### 1. `src/components/FinancialAdvisorChat.tsx`
- Header title: "Financial Advisor" -> "AI CFO"
- Component name and interface can stay (internal code), but the visible UI label changes

### 2. `supabase/functions/financial-advisor/index.ts`
- System prompt: "You are InControl's AI Financial Advisor" -> "You are InControl's AI CFO"
- Console log messages: "financial advisor" -> "AI CFO"

### 3. `src/components/Tutorial/tutorialSteps.ts`
- Title: "Your AI Financial Advisor" -> "Your AI CFO"
- Content: "AI financial advisor" -> "AI CFO"

### 4. `src/pages/Index.tsx`
- Comment: "AI Financial Advisor Chat" -> "AI CFO Chat"

### 5. `src/pages/Terms.tsx`
- Disclaimer text: "IS NOT a financial advisor" -> "IS NOT a financial advisor or CFO service" (keep the legal disclaimer broad)

### 6. `src/lib/subscription.ts`
- Feature label: "AI advisor with memory" -> "AI CFO with memory"

### 7. `supabase/functions/sales-bot/index.ts`
- Pricing description: "AI advisor" -> "AI CFO"

## Technical Details
- The edge function folder `supabase/functions/financial-advisor/` and its URL path remain unchanged to avoid breaking the API endpoint
- The `CHAT_URL` in `FinancialAdvisorChat.tsx` stays as `/functions/v1/financial-advisor` (no endpoint rename needed)
- The React component export name `FinancialAdvisorChat` stays the same internally -- only user-visible strings change
- The edge function will be redeployed after updating the system prompt

