

## Fix: Display and Open Coinbase Onramp URL After Fund Action

### Problem
The backend successfully returns `onramp_url` in the fund response, but the frontend discards it. After the user approves "Fund wallet", they see "Onramp session created for $5" but have no way to actually complete the payment.

### Solution
Propagate the `onramp_url` from the backend response through the hook chain and open it for the user. Two parts:

1. **Open the onramp URL automatically** when the fund action completes successfully
2. **Show a clickable link** in the chat message so the user can re-open it if needed

### Changes

**`src/hooks/useAgentWallet.ts`** -- `fundWallet` already returns `result` which contains `onramp_url`. No changes needed here since the result is passed through.

**`src/hooks/useVoiceActions.ts`** -- Update the `FUND_WALLET` case in `confirmAction` (line ~392-396):
- After calling `handlers.fundWallet(data.amount)`, check if the result contains `onramp_url`
- If yes, open it with `window.open(result.onramp_url, '_blank')`
- Include a clickable link in the success message

```typescript
case 'FUND_WALLET': {
  if (!handlers.fundWallet) return { success: false, message: 'Agent wallet not connected.' };
  const result = await handlers.fundWallet(data.amount);
  if (result?.onramp_url) {
    window.open(result.onramp_url, '_blank', 'noopener,noreferrer');
  }
  const msg = result?.onramp_url
    ? `Onramp session created for $${data.amount}. A payment window has been opened. [Click here if it didn't open](${result.onramp_url})`
    : result?.message || `Funding initiated for $${data.amount}.`;
  return { success: true, message: msg };
}
```

**`src/components/FinancialAdvisorChat.tsx`** -- No structural changes needed. The chat already renders markdown via `ReactMarkdown`, so the clickable link in the message will render automatically.

### Files Modified
- `src/hooks/useVoiceActions.ts` -- update `FUND_WALLET` case in `confirmAction` to open `onramp_url`
