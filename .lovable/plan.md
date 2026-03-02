

## Add Withdraw UI to Privacy Vault

### What
Add a "Withdraw from Privacy Vault" card to the Privacy Vault section, allowing users to withdraw tokens from their vault balance back to their account address on-chain.

### Where it fits
The withdraw card will be placed between the "Deposit to Privacy Vault" card and the "Private Transfer" card, following the natural flow: Deposit -> (Withdraw) -> Transfer.

### Design
A card matching the existing Deposit and Transfer cards pattern:
- Collapsed by default with a "Withdraw Tokens" button
- When expanded, shows a form with:
  - Token selector (same COMMON_TOKENS list used elsewhere)
  - Amount input
  - A note explaining that withdrawal moves tokens from the vault ledger back on-chain to the account address
  - Submit and Cancel buttons
- Success state showing any returned transaction details

### Also: Update "How It Works" diagram
Add a small note beneath the 3-step flow mentioning that withdrawals reverse step 1 (moving tokens from the vault ledger back on-chain).

### Technical Changes

**File: `src/components/settings/PrivacyVaultSection.tsx`**

1. Add new state variables:
   - `showWithdraw` (boolean)
   - `isWithdrawing` (boolean)
   - `withdrawAmount` (string)
   - `withdrawToken` (string, defaulting to USDC address)
   - `withdrawResult` (object or null for displaying result)

2. Add `handleWithdraw` function that calls `invokePrivacy('withdraw', { amount, token })` -- mirroring the existing `handleDeposit` pattern. On success, refresh balances and show a toast.

3. Insert a new card (motion.div) between the Deposit card (~line 598) and the Private Transfer card (~line 600). The card uses the same expand/collapse pattern as Deposit:
   - Header with `ArrowUpFromLine` icon (or similar), title "Withdraw from Privacy Vault"
   - Description: "Move tokens from your vault balance back on-chain to your account address"
   - Form: token selector + amount input + submit/cancel buttons
   - Result display area for any returned data

4. Add a note in the "How It Works" collapsible section mentioning withdrawals reverse the deposit step.

5. Update the `fetchActivityLog` query to also include `'privacy-withdraw'` in the `action_type` filter so withdraw actions appear in the activity log.

No backend or database changes needed -- the `withdraw` case is already implemented in the edge function.

