

# Fix Confusing Shielded Address Balance Display

## Problem

Shielded addresses show on-chain balances labeled "Pending inbound: 2.5 USDC" even after those tokens have already been deposited into the vault. The executor uses pooled liquidity to credit the vault, so the on-chain balance on the shielded address never decreases. This makes users think 2.5 USDC is still waiting to arrive when the vault only holds 0.5 USDC (after a 2 USDC private transfer).

## Solution

Replace the misleading "Pending inbound" display with an accurate "On-chain balance" label and add a clear status indicator showing whether those tokens have already been credited to the vault.

### `src/components/settings/PrivacyVaultSection.tsx`

1. **Change label from "Pending inbound" to "On-chain balance"** (lines 414-423) -- this is factually accurate regardless of vault state

2. **Add a "(credited to vault)" badge** next to balances that have already been deposited. Logic: if `balances` (vault ledger) contains a non-zero entry for that token, it means deposits have occurred, so on-chain balance is no longer "pending"

3. **Update the info paragraph** (line 452) to explain: "On-chain balances remain on shielded addresses after deposit. The executor credits your vault using pooled liquidity. Your spendable balance is shown in Privacy Vault Balances below."

4. **Update `maxAmount`** (lines 81-90) to use vault balances instead of on-chain balances (the previously approved fix that hasn't been implemented yet)

### Display change

Before:
```
Pending inbound: 2.500000 USDC
```

After:
```
On-chain: 2.500000 USDC (credited to vault ✓)
```

Single file change, no backend modifications.

