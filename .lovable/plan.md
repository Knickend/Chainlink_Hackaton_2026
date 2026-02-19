

# Fix Coinbase Onramp: Premature Email + iframe Blocked

## Problem Summary

Two issues with the "Fund Wallet" flow:

1. **"pay.coinbase.com refused to connect"**: Coinbase's payment page sets `X-Frame-Options` headers that prevent loading inside iframes. The Lovable preview runs in an iframe, so `window.open` either gets blocked or the page refuses to render. This will work correctly on your published site, but we should improve the UX regardless.

2. **Premature notification email**: The edge function sends a "Fund Wallet Transaction Executed" email immediately when the onramp *session* is created -- before you've actually paid. This is why you get the email even though the payment page failed to load.

## Solution

### 1. Stop sending email on fund action (edge function)

Remove the email notification from the `fund` action in `supabase/functions/agent-wallet/index.ts`. The onramp session creation is NOT a completed transaction -- the actual funding happens asynchronously when the user completes payment on Coinbase. The `check-wallet-balance` cron job already detects incoming deposits and can send the notification at that point instead.

**File**: `supabase/functions/agent-wallet/index.ts` (lines 1150-1154)
- Remove the `sendTransactionEmail` call from the `fund` case

### 2. Improve onramp URL handling in the frontend

Update `src/hooks/useVoiceActions.ts` to not rely solely on `window.open` (which fails in iframes). Instead, always return the URL in the message as a clickable link so the user can open it manually.

**File**: `src/hooks/useVoiceActions.ts` (lines 404-413)
- Keep `window.open` as a best-effort attempt
- Always provide the clickable link in the response message regardless of whether `window.open` succeeded

No other changes needed. The `check-wallet-balance` cron already handles incoming deposit detection and notifications.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/agent-wallet/index.ts` | Remove premature email send from `fund` action |
| `src/hooks/useVoiceActions.ts` | Improve fallback messaging for onramp URL |

