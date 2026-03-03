

## Replace Fund Card with Direct Deposit + Remove Shielded Address Deposit Buttons

### Changes

**Frontend (`src/components/settings/PrivacyVaultSection.tsx`)**:

1. **Replace "Fund Privacy Vault" card** (lines ~564-649) — Instead of "Get Deposit Address" flow showing a shielded address, replace with a direct deposit form:
   - Token selector (USDC, LINK, WETH)
   - Amount input field
   - "Deposit to Vault" button that calls the backend `deposit` action with `amount` and `token`
   - The backend signing wallet (`0x8E6B...`) performs `approve + deposit` from its own pooled liquidity
   - Show tx hashes on success

2. **Remove "Deposit {token}" buttons from shielded addresses list** (lines ~474-489) — Strip the per-token deposit buttons. The shielded addresses section stays as-is for displaying addresses/balances, just without the deposit action buttons.

3. **Remove `handleDepositToVault` function** (lines ~276-296) and related state `isDepositingToVault` — no longer needed.

4. **Update `handleDeposit`** to accept amount: call `invokePrivacy('deposit', { token, amount })` instead of just `{ token }`.

**Backend** — No changes needed, the `deposit` action already supports the `amount` parameter for on-chain approve+deposit.

