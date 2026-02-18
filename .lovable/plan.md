

# Fix: Show Swap Amounts in Trade Confirmation Email

## Problem
The trade confirmation email is missing the amounts because the email template only renders an "Amount" row when both `details.amount` and `details.token` are provided. For trades, `token` is not passed (only `fromToken` and `toToken`), so the amount row is skipped entirely.

## Solution
Update the `sendTransactionEmail` function in `supabase/functions/agent-wallet/index.ts` to handle trade-specific amount display. Two changes needed:

### Change 1: Pass trade amounts to the email function
Update the trade email call (line 1041-1043) to also pass the `fromAmount` and `toAmount` values from the swap result so the email can show exactly what was swapped.

```typescript
await sendTransactionEmail(wallet.wallet_email, 'Trade', {
  amount, fromToken: from_token, toToken: to_token, txHash,
  fromAmount: swapResult?.fromAmount,
  toAmount: swapResult?.toAmount,
  fromDecimals: from_token === 'USDC' ? 6 : 18,
  toDecimals: to_token === 'ETH' ? 18 : 6,
});
```

### Change 2: Update the email template to render trade amounts
In the `sendTransactionEmail` function, add a trade-specific row that shows "Amount: 0.2 USDC -> 0.000100 ETH" when `fromToken`, `toToken`, and `amount` are all present.

Update the details type to include optional `fromAmount`/`toAmount` fields and add a new template row:

```typescript
// For trades, show the input amount alongside the pair
if (details.fromToken && details.toToken && details.amount !== undefined) {
  detailsHtml += `<tr><td style="...">Amount</td><td style="...;font-weight:600;">${details.amount} ${details.fromToken}</td></tr>`;
  detailsHtml += `<tr><td style="...">Pair</td><td style="...;font-weight:600;">${details.fromToken} -> ${details.toToken}</td></tr>`;
}
```

This way the email will show:
- **Amount**: 0.2 USDC
- **Pair**: USDC -> ETH
- **Tx Hash**: 0x144385ec...bb58cf7c
- **Time**: Wed, 18 Feb 2026 01:48:20 GMT

### File changed
- `supabase/functions/agent-wallet/index.ts` -- update `sendTransactionEmail` to show amounts for trades
