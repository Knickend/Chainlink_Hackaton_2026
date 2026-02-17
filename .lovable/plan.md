

## Delete Account with Wallet Drain

### Overview

Add a "Delete Account" option to the Profile section in Settings. Before deletion, if the user has an agentic wallet with a balance, they must transfer all funds (USDC and ETH) to an external wallet address. Once funds are drained, all user data is purged and the auth account is deleted.

### User Flow

1. User clicks "Delete Account" button (red, at bottom of Profile section)
2. Confirmation dialog opens explaining consequences
3. If the user has an agentic wallet with a balance > 0:
   - Dialog shows current USDC and ETH balances
   - User must enter a destination wallet address to receive remaining funds
   - "Drain & Delete" button sends all USDC, then all ETH to that address
4. If no wallet or zero balance: skip drain step
5. A backend function deletes all user data from every public table, then deletes the auth account
6. User is signed out and redirected to the landing page

### Technical Details

#### 1. New Component: `src/components/settings/DeleteAccountDialog.tsx`

- Uses `AlertDialog` for confirmation UX
- Checks `useAgentWallet()` status for balance
- Shows wallet drain form if balance > 0 (input for destination address, validated with `/^0x[a-fA-F0-9]{40}$/`)
- Calls `sendUsdc` for USDC balance, then a new `sendEth` action for ETH balance
- After drain completes (or if no balance), calls a new `delete-account` edge function
- On success, calls `signOut()` and navigates to `/`

#### 2. New Edge Function: `supabase/functions/delete-account/index.ts`

- Authenticated endpoint (uses JWT from Authorization header)
- Steps:
  1. Verify the user's agent wallet balance is 0 (if wallet exists)
  2. Delete rows from all user-owned tables (order matters for foreign keys):
     - `agent_actions_log`
     - `agent_wallets`
     - `address_book`
     - `asset_transactions`
     - `assets`
     - `chat_memories`
     - `debts`
     - `expenses`
     - `feedback`
     - `financial_goals`
     - `income`
     - `portfolio_snapshots`
     - `rebalance_alerts`
     - `user_investment_preferences`
     - `user_subscriptions`
     - `subscription_cancellations`
     - `user_roles`
     - `profiles`
  3. Delete the auth user via `supabase.auth.admin.deleteUser(userId)`
- Returns success response

#### 3. New Action in `agent-wallet/index.ts`: `send-eth`

- Similar to existing `send` action but for native ETH
- Encodes and sends a simple value transfer (no ERC-20 data)
- Required so user can drain ETH balance before account deletion

#### 4. Update `useAgentWallet.ts`

- Add `sendEth(amount: number, recipient: string)` method mirroring `sendUsdc`

#### 5. Update `src/components/settings/ProfileSection.tsx`

- Add the `DeleteAccountDialog` trigger button at the bottom of the profile card

#### 6. Config: `supabase/config.toml`

- Add `[functions.delete-account]` with `verify_jwt = false` (auth is handled internally via the Authorization header, same pattern as other functions)

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/settings/DeleteAccountDialog.tsx` | Create |
| `supabase/functions/delete-account/index.ts` | Create |
| `supabase/functions/agent-wallet/index.ts` | Add `send-eth` action |
| `src/hooks/useAgentWallet.ts` | Add `sendEth` method |
| `src/components/settings/ProfileSection.tsx` | Add delete button |
| `supabase/config.toml` | Add delete-account function config |

