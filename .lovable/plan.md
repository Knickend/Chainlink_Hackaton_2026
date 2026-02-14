

## Fix: Onramp Opens with $0 Instead of Requested Amount

### Root Cause
The `amount` parameter arrives from JSON body parsing and may be a string (e.g., `"5"` instead of `5`). When calling `.toFixed(2)` on a string, JavaScript returns `undefined` or throws, causing `paymentAmount` to be empty/invalid. Additionally, based on the CDP Onramp Session docs, the `purchaseAmount` field (crypto amount) might be more reliable than `paymentAmount` for pre-filling amounts.

### Fix
In `supabase/functions/agent-wallet/index.ts`, line 690:

1. Explicitly cast `amount` to a number before calling `.toFixed(2)`
2. Log the exact `paymentAmount` value being sent to confirm it's correct

```typescript
case 'fund': {
  const amount = Number(params.amount);
  if (!amount || isNaN(amount)) throw new Error('Valid amount is required');
  
  // ... wallet lookup stays the same ...

  const paymentAmountStr = amount.toFixed(2);
  console.log('[AgentWallet] Fund amount:', params.amount, '-> paymentAmount:', paymentAmountStr);
  
  const onrampResult = await cdpRequest('POST', '/platform/v2/onramp/sessions', {
    purchaseCurrency: 'USDC',
    destinationNetwork: 'base',
    destinationAddress: wallet.wallet_address,
    paymentAmount: paymentAmountStr,
    paymentCurrency: 'USD',
    paymentMethod: 'CARD',
  });
```

### Files Modified
- `supabase/functions/agent-wallet/index.ts` -- ensure `amount` is cast to `Number()`, add logging of the exact `paymentAmount` string being sent

### Testing
After deploying, trigger "Fund my wallet with $5" again. Check the backend logs for the new `[AgentWallet] Fund amount:` line to confirm the value is `"5.00"`. If the onramp page still shows $0, we'll know the CDP Sessions API doesn't respect `paymentAmount` and will need to append it as a URL query parameter instead.
