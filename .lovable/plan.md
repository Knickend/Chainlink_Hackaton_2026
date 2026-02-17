

# Fix: Add Incoming Transaction Email Notifications

## Problem

The current notification system only sends emails for **outgoing** actions (send USDC, send ETH, trade, fund) because those are triggered within the `agent-wallet` edge function. When someone sends ETH or USDC **to** the wallet, no code runs — there is no detection mechanism for incoming transfers.

## Solution: Balance-Change Polling via Cron

The most reliable approach is a lightweight polling function that runs periodically, compares the current wallet balance to the last known balance, and sends an email notification if the balance increased. This avoids the complexity of registering CDP webhooks (which require a separate subscription management flow and webhook signature verification).

## Changes

### File 1: New Edge Function `supabase/functions/check-wallet-balance/index.ts`

A cron-compatible function that:
1. Queries all `agent_wallets` where `notify_transactions = true` and `wallet_address` is not null
2. For each wallet, calls CDP's token-balances endpoint to get current USDC and ETH balances
3. Compares against `last_known_balance` and `last_known_eth_balance` columns stored in the `agent_wallets` table
4. If balance increased, sends an email notification via Resend with details (token, amount received, new balance)
5. Updates `last_known_balance` and `last_known_eth_balance` in the database

### File 2: Database Migration

Add two columns to `agent_wallets`:
- `last_known_balance` (numeric, default 0) — last recorded USDC balance
- `last_known_eth_balance` (numeric, default 0) — last recorded ETH balance

### File 3: Update `supabase/functions/agent-wallet/index.ts`

After any successful outgoing action (send, trade, fund), update `last_known_balance` and `last_known_eth_balance` to the post-transaction values. This prevents the cron from double-notifying for outgoing transactions that change the balance.

### File 4: `supabase/config.toml`

Add the new function entry with `verify_jwt = false` (cron invocations don't carry JWTs).

## How the Cron Works

The function would be invoked periodically (e.g., every 5 minutes) via Lovable Cloud's cron scheduling or an external scheduler hitting the function URL. On each run:

1. Fetch all wallets with notifications enabled
2. For each wallet, get live balances from CDP
3. Compare: if `current_balance > last_known_balance`, compute `received = current - last_known`
4. Send email: "You received X.XX ETH/USDC to your InControl wallet"
5. Update stored balances

## Technical Details

### Balance Comparison Logic

```
received_eth = current_eth - last_known_eth
received_usdc = current_usdc - last_known_usdc

if received_eth > 0.0001:  // ignore dust
  send notification for ETH deposit
if received_usdc > 0.01:   // ignore dust  
  send notification for USDC deposit

// Always update stored values (even if balance decreased from outgoing tx)
update last_known_balance = current_usdc
update last_known_eth_balance = current_eth
```

### Email Template

Similar to the existing transaction notification emails but with "Deposit Received" subject and details showing the amount, token, and current total balance.

### Preventing Double Notifications

After every outgoing action in the main `agent-wallet` function (send, trade, fund), we update the `last_known_*` columns. This way, when the cron next runs, it sees the post-transaction balance and won't flag the outgoing decrease-then-increase as a deposit.

### Initial Seeding

On migration, `last_known_balance` and `last_known_eth_balance` default to 0. On first cron run, the current balance will appear as a "deposit." To avoid this false notification, the cron should skip notifications for wallets where `last_known_balance = 0 AND last_known_eth_balance = 0` (first run) and just seed the values silently.

