

## Fix: CDP Onramp `paymentAmount` Must Be a String

### Problem
The `fund` case in `supabase/functions/agent-wallet/index.ts` (line 686-692) sends:
```typescript
purchaseAmount: { value: amount.toString(), currency: 'USD' },
```
But the CDP Onramp Sessions API expects flat string fields, causing a 400 error: "value must be a string".

### Fix
Replace the request body in the `fund` case (lines 686-692) with the correct flat structure:

```typescript
const onrampResult = await cdpRequest('POST', '/platform/v2/onramp/sessions', {
  purchaseCurrency: 'USDC',
  destinationNetwork: 'base',
  destinationAddress: wallet.wallet_address,
  paymentAmount: amount.toFixed(2),
  paymentCurrency: 'USD',
  paymentMethod: 'CARD',
}) as { sessionUrl?: string; sessionId?: string };
```

### What Changes
- `purchaseAmount: { value: ..., currency: 'USD' }` (object) becomes `paymentAmount: amount.toFixed(2)` (string like "20.00") and `paymentCurrency: 'USD'` (separate field)
- `destinationAsset: 'USDC'` becomes `purchaseCurrency: 'USDC'`
- Field names aligned to the CDP Onramp Sessions v2 API spec

### Files Modified
- `supabase/functions/agent-wallet/index.ts` -- fix the `fund` case request body (lines 686-692)
