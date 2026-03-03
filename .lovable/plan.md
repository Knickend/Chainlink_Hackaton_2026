

## Fix: Remove On-Chain Approve+Deposit — Shielded Address IS the Deposit

### Problem
The `deposit` and `deposit-from-shielded` actions call `approve(vault, amount)` + `vault.deposit(token, amount)` from the signing wallet `0x8E6B...`. This fails because the signing wallet doesn't hold the user's tokens — the tokens sit on the **shielded address**. Since shielded addresses are receive-only (no private key to sign from), neither can the signing wallet do `transferFrom` on the shielded address.

### Root Cause Understanding
In the Chainlink ACE Privacy Vault protocol, **sending tokens to a shielded address IS the deposit**. The protocol's off-chain indexer detects incoming tokens on shielded addresses and automatically credits them to the associated account's private balance. No separate on-chain `vault.deposit()` call is needed or possible via this path.

The `vault.deposit()` contract method exists for **direct deposits** (when the caller itself holds tokens), which is not the shielded-address flow.

### Solution

**Backend (`supabase/functions/privacy-vault/index.ts`)**:

1. **`deposit` action** — Remove the entire on-chain approve+deposit branch (lines ~591-639). When `amount` is provided, instead of on-chain tx, just verify the shielded address balance via `eth_call` (ERC20 `balanceOf`) and inform the user that the protocol will auto-credit their private balance. Return a success with instructions to check `/balances` after ~30 seconds.

2. **`deposit-from-shielded` action** — Remove the on-chain approve+deposit logic (lines ~684-710). Replace with: read the on-chain balance of the shielded address, and if tokens are present, return a message confirming the protocol indexer will credit them. Optionally call the `/balances` API to show current private balance.

3. **Keep `ensureTokenRegistered`** — still needed so the token is set up in the policy engine before the indexer processes the deposit.

**Frontend (`src/components/settings/PrivacyVaultSection.tsx`)**:

1. Remove the "Deposit to Vault" button from the shielded addresses list — it's no longer needed since deposits are automatic.
2. Update the deposit section to show: "Tokens sent to your shielded address will be automatically credited to your Privacy Vault balance within ~30 seconds."
3. Add a "Check Balance" / "Refresh" prompt after showing the shielded address.

### Flow After Fix

```text
User sends USDC to shielded address (from external wallet/exchange)
      |
      v
Protocol indexer detects tokens on shielded address
      |
      v
Private balance auto-credited (no on-chain tx from 0x8E6B...)
      |
      v
User clicks "Refresh Balances" to see updated private balance
```

The signing wallet `0x8E6B...` is only used for: PE deployment, token registration, signing EIP-712 messages for API calls, and withdrawal ticket redemption.

