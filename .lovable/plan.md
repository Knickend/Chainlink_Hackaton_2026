

# Fix: Transaction Email Not Sending + Activity Log Delay

## Issue 1: Transaction emails silently failing (wrong domain)

The `sendTransactionEmail` function in `agent-wallet/index.ts` sends from `noreply@incontrol.app`, but the verified Resend domain is `incontrol.finance` (used by the working confirmation email). Resend rejects emails from unverified domains silently.

**Fix**: Change the `from` address in `sendTransactionEmail` (line 447) from `noreply@incontrol.app` to `noreply@incontrol.finance`.

Also fix the same issue in `check-wallet-balance/index.ts` (line 126) which uses the same wrong domain for deposit notification emails.

## Issue 2: Activity log not appearing immediately

The `tradeTokens` function in `useAgentWallet.ts` calls `fetchLogs()` after the trade completes, but there are two problems:

1. **No immediate UI refresh after fetchLogs**: The `fetchLogs` call fetches logs from the edge function, but the component may not re-render promptly if the state update races with other updates.

2. **Missing refetch after trade response**: The hook should also call `fetchStatus()` to update the wallet balance shown in the UI, not just logs.

**Fix**: In `useAgentWallet.ts`, update `tradeTokens` to call both `fetchStatus` and `fetchLogs` after a successful trade, and add a small delay before fetching logs to ensure the database write has committed:

```typescript
const result = await invoke('trade', { amount, from_token: fromToken, to_token: toToken });
// Small delay to ensure DB write is committed
await new Promise(r => setTimeout(r, 500));
await Promise.all([fetchLogs(), fetchStatus()]);
```

Apply the same pattern to `sendUsdc` and `sendEth` which have the same issue.

## Files Changed

1. **supabase/functions/agent-wallet/index.ts** - Fix email `from` domain (`incontrol.app` to `incontrol.finance`)
2. **supabase/functions/check-wallet-balance/index.ts** - Fix email `from` domain (`incontrol.app` to `incontrol.finance`)
3. **src/hooks/useAgentWallet.ts** - Add 500ms delay before log/status refetch in `tradeTokens`, `sendUsdc`, `sendEth`
