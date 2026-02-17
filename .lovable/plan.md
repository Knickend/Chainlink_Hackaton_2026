

## Transaction Email Notifications

### Overview

Add an opt-in toggle so users receive email notifications when transactions (send USDC, send ETH, trade, fund) are executed from their agentic wallet. Emails are sent via Resend (already configured) after each successful transaction.

### Changes

#### 1. Database Migration

Add a `notify_transactions` boolean column to `agent_wallets`:

```sql
ALTER TABLE agent_wallets
  ADD COLUMN notify_transactions boolean NOT NULL DEFAULT false;
```

#### 2. Edge Function: `agent-wallet/index.ts`

- Add a helper function `sendTransactionEmail(email, subject, details)` that calls Resend directly (same pattern as `send-confirmation-email`) to send a styled HTML email with transaction details (type, amount, token, recipient/pair, tx hash, timestamp).
- After each successful transaction in the `send`, `send-eth`, `trade`, and `fund` actions, check if `wallet.notify_transactions` is true. If so, call the email helper with relevant details.
- Add a new `update-notifications` action to toggle the `notify_transactions` column.

Email template will include:
- Transaction type (Send USDC, Send ETH, Trade, Fund)
- Amount and token(s)
- Recipient address (for sends) or token pair (for trades)
- Transaction hash (linked to BaseScan)
- Timestamp

#### 3. Hook: `useAgentWallet.ts`

- Add `notify_transactions` to the `AgentWalletStatus` interface
- Include it in the status response mapping
- Add `updateNotifications(enabled: boolean)` method that calls `invoke('update-notifications', { notify_transactions: enabled })`

#### 4. UI: `AgentSection.tsx`

- Add a "Notifications" card (below Spending Limits, when wallet is connected)
- Contains a single toggle: "Email me when transactions occur"
- Uses the new `updateNotifications` method from the hook

### Technical Details

**Email helper (inside agent-wallet/index.ts):**

```typescript
async function sendTransactionEmail(
  email: string,
  txType: string,
  details: { amount?: number; token?: string; recipient?: string; fromToken?: string; toToken?: string; txHash?: string }
) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return;

  // Build subject and body based on txType
  // POST to https://api.resend.com/emails with styled HTML
}
```

**Files to modify:**

| File | Action |
|------|--------|
| Database migration | Add `notify_transactions` column |
| `supabase/functions/agent-wallet/index.ts` | Add email helper, call after txs, add `update-notifications` action |
| `src/hooks/useAgentWallet.ts` | Add `notify_transactions` to status, add `updateNotifications` method |
| `src/components/settings/AgentSection.tsx` | Add notifications toggle card |

