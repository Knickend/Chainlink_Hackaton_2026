

## Fix Deposit Flow: Backend Wallet Signs On-Chain Deposit on Behalf of User

### Problem
The current `deposit` action only returns the shielded address and tells the user to send tokens there. But the vault protocol doesn't auto-credit balances from shielded addresses — an actual on-chain `vault.deposit(token, amount)` transaction is required. The signing wallet `0x8E6B...` must perform this on-chain deposit on behalf of the user.

### Correct Workflow
1. User generates a shielded address
2. User sends tokens to their shielded address from any external wallet/exchange
3. Backend detects the token balance on the shielded address, then `0x8E6B...` calls `approve(vault, amount)` + `vault.deposit(token, amount)` on-chain — but the deposit is credited to the **user's account** (the account derived from the private key, which is associated with their shielded addresses)
4. Private transfers and withdrawals work via the API + on-chain ticket redemption as before

### Key Insight
The deposit **does** need `approve + deposit` on-chain, but the tokens come from the **shielded address balance**, not from `0x8E6B...`'s own balance. However, since shielded addresses are receive-only (no private key to sign from them), the actual mechanism is:
- The signing wallet `0x8E6B...` is the **account** registered with the vault protocol
- When users send tokens to their shielded address, the protocol's indexer associates those tokens with the account `0x8E6B...`
- The backend then calls `deposit(token, amount)` from `0x8E6B...` to move those indexed tokens into the private vault ledger

So the deposit action should:
1. Check the user's shielded address on-chain balance for the selected token
2. Call `ensureTokenRegistered` (existing)
3. Call `approve(vault, amount)` from the signing wallet
4. Call `vault.deposit(token, amount)` from the signing wallet
5. The vault credits the private balance to the account

### Backend Changes (`supabase/functions/privacy-vault/index.ts`)

**`deposit` action** — Restore the on-chain approve+deposit flow but with the correct understanding:
- Accept `amount` and `token` parameters
- If no amount specified, read the shielded address's on-chain ERC20 balance and deposit all of it
- Call `ensureTokenRegistered(token)` first
- Call `approve(vaultContract, amount)` signed by `0x8E6B...`
- Call `deposit(token, amount)` on the vault contract signed by `0x8E6B...`
- The vault protocol associates this deposit with the account and increments the private ledger
- Log the result

**Keep the "get deposit address" sub-flow** — if no `amount` param is provided, just return the shielded address (existing behavior). If `amount` is provided, perform the on-chain deposit.

Add a new action `"deposit-from-shielded"` that:
1. Reads the on-chain ERC20 balance of the user's shielded address
2. If balance > 0, performs approve + deposit from the signing wallet for that amount
3. Returns the tx hashes

### Frontend Changes (`src/components/settings/PrivacyVaultSection.tsx`)

**Deposit section** — Two-phase UX:
1. Phase 1 (current): "Get Deposit Address" shows shielded address + copy button
2. Phase 2 (new): Add a "Deposit to Vault" button that appears when the shielded address has a token balance. This calls the backend `deposit` action with `amount` to trigger the on-chain approve+deposit flow.
3. Show token balances on shielded addresses (already fetched via `onchain-erc20-balance`) with a "Deposit to Vault" button next to each balance

**Update deposit handler**: Change `handleDeposit` to support both flows:
- "Get Address" flow (no amount) — existing
- "Deposit to Vault" flow (with amount + token) — new, triggers on-chain deposit

### Technical Details

```text
User sends USDC to shielded address
      |
      v
Frontend shows balance on shielded address (already implemented)
      |
      v
User clicks "Deposit to Vault" 
      |
      v
Backend: ensureTokenRegistered(USDC)
Backend: 0x8E6B... signs approve(vault, amount) tx
Backend: 0x8E6B... signs deposit(USDC, amount) tx  
      |
      v
Vault credits private balance to account 0x8E6B...
      |
      v
Private balance updated, user can now transfer/withdraw
```

