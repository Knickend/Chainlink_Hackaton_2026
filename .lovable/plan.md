

## Fix: Route Typed Messages Through Command Parser

### Problem
When a user types "Fund my wallet with $20" in the chat input and presses Send, the message goes directly to the financial-advisor AI (a conversational LLM), which responds saying it cannot execute transactions. The command parsing pipeline (`parseVoiceCommand` + `executeAction`) is only triggered from voice/microphone input via `handleVoiceCommand`.

### Solution
Update `sendMessage` in `FinancialAdvisorChat.tsx` to first check if the typed text is an actionable command (DeFi or portfolio action) before falling back to the conversational AI stream.

### Changes

**`src/components/FinancialAdvisorChat.tsx`** -- Update `sendMessage`:

1. Before calling `streamChat`, first call `parseVoiceCommand(text, contacts)` to check if the message is an action
2. If the parsed result is `QUESTION` or `CLARIFY`, proceed with the normal `streamChat` flow (conversational AI)
3. If it's any other action (SEND_USDC, FUND_WALLET, ADD_ASSET, etc.), route it through `executeAction` and handle confirmations -- exactly like `handleVoiceCommand` already does
4. Wrap the parse attempt in a try/catch so if parsing fails, it gracefully falls back to the conversational AI

### Technical Details

The updated `sendMessage` flow:

```text
User types text -> sendMessage()
  |
  +-> parseVoiceCommand(text, contacts)
  |     |
  |     +-> action === 'QUESTION' -> streamChat (normal AI conversation)
  |     +-> action === 'CLARIFY'  -> streamChat (normal AI conversation)  
  |     +-> action === 'SEND_USDC' / 'FUND_WALLET' / etc.
  |           -> executeAction(parsed)
  |           -> show confirmation card if needed
  |
  +-> parse fails -> fallback to streamChat
```

This is a minimal change -- essentially extracting the core logic from `handleVoiceCommand` to be shared with `sendMessage`, or having `sendMessage` call the same parsing path. The simplest approach is to have `sendMessage` attempt parsing first and only stream-chat on QUESTION/CLARIFY/error.

### Files Modified
- `src/components/FinancialAdvisorChat.tsx` -- update `sendMessage` to parse before streaming
