

## Restore On-Chain Deposit: Signing Wallet as Pooled Liquidity

### Understanding

The user has clarified the correct protocol architecture:

- **Shielded addresses are receive-only** — they cannot sign transactions or call `deposit()`.
- The vault's `deposit(token, amount)` is a standard ERC-20 flow: the **caller** approves the vault, calls deposit, and the off-chain service credits that caller's private balance.
- The signing wallet `0x8E6B...` acts as **pooled liquidity** — it holds tokens that back all users' private balances.

### Correct Flow

1. User sends tokens to their shielded address (external wallet/exchange)
2. Backend detects the incoming balance on the shielded address (via `balanceOf` polling)
3. The signing wallet `0x8E6B...` performs `approve(vault, amount)` + `vault.deposit(token, amount)` **from its own balance** — it's providing the on-chain liquidity
4. The vault's off-chain service credits the private balance to the account associated with `0x8E6B...`
5. The user can now do private transfers and withdrawals

### Backend Changes (`supabase/functions/privacy-vault/index.ts`)

**`deposit` action (with amount)** — Restore the on-chain approve+deposit:
- Parse `amount` and `token` from params
- Convert amount to raw units using token decimals
- Call `ensureTokenRegistered` first
- Sign and broadcast `approve(VAULT_CONTRACT, rawAmount)` from the signing wallet
- Wait for confirmation, then sign and broadcast `deposit(token, rawAmount)` on the vault contract
- Return tx hashes for both transactions
- The signing wallet uses its own token balance as pooled liquidity

**`deposit-from-shielded` action** — Same restore:
- Read the on-chain ERC20 balance of the shielded address to determine the amount
- Then perform `approve + deposit` from the signing wallet for that amount (from the signing wallet's own balance)
- Return tx hashes

Both actions use the existing `signRawTransaction` and `sendRawTransaction` helper pattern already present in the codebase (used by withdraw).

### Frontend Changes (`src/components/settings/PrivacyVaultSection.tsx`)

- Keep the "Get Deposit Address" flow (Phase 1) — returns shielded address
- Restore the "Deposit to Vault" button on shielded addresses that have detected balances
- Update the "How It Works" Step 2 description to mention that after sending tokens to the shielded address, clicking "Deposit to Vault" triggers the on-chain deposit
- Remove the "auto-credited by indexer" messaging — replace with "Click Deposit to Vault to move tokens into the private ledger"

### Technical Detail

The signing wallet needs to hold sufficient token balance to cover deposits. The approve+deposit calls use the same RLP signing flow already implemented for withdrawals (`signRawTransaction` + `sendRawTransaction`).

