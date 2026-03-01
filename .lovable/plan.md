

## Add SepoliaETH to the Privacy Vault Deposit Dropdown

### What Changes

**1. UI - Token Dropdown (`src/components/settings/PrivacyVaultSection.tsx`)**
- Remove the filter that excludes native ETH (`0x000...000`) from the deposit token dropdown
- Rename the label from "ETH (native)" to "SepoliaETH" for clarity

**2. Edge Function - Native ETH Deposit (`supabase/functions/privacy-vault/index.ts`)**
- Replace the error thrown for native ETH deposits with a working deposit flow
- For SepoliaETH, skip the `approve` step (not needed for native ETH) and call `deposit` on the Vault contract with `msg.value` set to the deposit amount instead of using the ERC-20 `deposit(token, amount)` pattern
- The Vault contract likely accepts native ETH via a payable `deposit()` or `depositETH()` function, or wraps it internally. We'll send native ETH value directly with the deposit call using `value = amountBigInt` and `token = 0x000...000`

### Technical Details

For native ETH deposits on the Vault contract:
- No `approve` step needed (ETH is not an ERC-20)
- The transaction sends ETH `value` directly: `signRawTransaction(nonce, gasPrice, 200000n, VAULT_CONTRACT, amountBigInt, depositData, privateKey)`
- The deposit call data still uses selector `0x47e7ef24` with the null address as the token parameter
- The response will return a single `deposit_tx` hash (no `approve_tx`)

### Files Modified
- `src/components/settings/PrivacyVaultSection.tsx` -- remove ETH filter from deposit dropdown, rename label to "SepoliaETH"
- `supabase/functions/privacy-vault/index.ts` -- handle native ETH deposit flow (skip approve, send value)

