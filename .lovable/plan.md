

## Fix: Pre-fill Amount on Coinbase Onramp Page

### Root Cause
The CDP Onramp Sessions API accepts `paymentAmount` in the request body to generate a quote, but the resulting onramp URL does **not** automatically pre-fill the amount on the payment page. According to Coinbase's documentation, pre-filling requires appending query parameters directly to the onramp URL:
- `presetFiatAmount` -- the dollar amount (e.g., `5`)
- `fiatCurrency` -- the currency code (e.g., `USD`)

### Fix
In `supabase/functions/agent-wallet/index.ts`, after extracting the `onrampUrl` from the CDP response, append the pre-fill query parameters before returning it to the frontend:

```typescript
// After extracting onrampUrl from CDP response:
if (onrampUrl) {
  const separator = onrampUrl.includes('?') ? '&' : '?';
  const prefillUrl = `${onrampUrl}${separator}presetFiatAmount=${amount}&fiatCurrency=USD`;
  // Use prefillUrl instead of onrampUrl in the response
}
```

### Files Modified
- `supabase/functions/agent-wallet/index.ts` -- append `presetFiatAmount` and `fiatCurrency` query params to the onramp URL before returning it

### Testing
Trigger "Fund my wallet with $5" again. The Coinbase Onramp page should now open with $5.00 (or local equivalent) pre-filled instead of $0.

