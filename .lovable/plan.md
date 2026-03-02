

## Fix: Proper Policy Engine Pre-Check and Better Error Handling for Deposits

### Problem
The deposit transaction reverts on-chain because the Chainlink ACE policy engine rejects the deposit. The existing `checkDepositAllowed` pre-check does not properly detect EVM reverts from `eth_call`, so it silently passes and the actual deposit transaction fails on-chain (wasting gas on the approve tx).

### Root Cause
When `eth_call` to `checkDepositAllowed(depositor, token, amount)` reverts (because the policy denies it), the JSON-RPC response may return revert data in the `result` field rather than as a top-level `error`. The current code only checks `checkResult.error`, missing the revert.

### Changes

**Backend: `supabase/functions/privacy-vault/index.ts`**

1. **Fix `checkDepositAllowed` revert detection** in the `deposit` case:
   - After the `eth_call`, check BOTH `checkResult.error` AND whether `checkResult.result` contains revert data (starts with `0x08c379a2` for `Error(string)` or is very short/empty)
   - If the call reverts, extract and decode the revert reason if possible
   - Return a clear 400 error explaining the policy engine denied the deposit and the account may need to be whitelisted

2. **Add a `check-deposit-allowed` action** (standalone diagnostic):
   - Lets the UI call `checkDepositAllowed` independently so users can test policy eligibility before attempting a deposit
   - Returns `{ allowed: true/false, reason: "..." }`

3. **Improve error message** when the deposit tx itself reverts:
   - Include guidance about the ACE policy engine and whitelisting
   - Mention which policy engine address is associated with the token (from `sPolicyEngines`)

**Frontend: `src/components/settings/PrivacyVaultSection.tsx`**

4. **Add a pre-flight check before deposit**:
   - Before starting the deposit flow, call the new `check-deposit-allowed` action
   - If denied, show a clear toast: "Deposit denied by policy engine. Your account may need to be whitelisted for this token."
   - Skip the approve+deposit transactions entirely (saves gas)

5. **Show policy engine info** in the Token Registration card:
   - For registered tokens, display the associated policy engine address
   - Add a "Check Eligibility" button that calls `checkDepositAllowed` and reports whether deposits are allowed for the current account

### Technical Details

Revert detection for `eth_call`:
```text
// A successful view call returns result data (or 0x for void)
// A reverted call may return:
//   - error field in JSON-RPC response
//   - result starting with 0x08c379a2 (Error(string) selector)
//   - result starting with 0x4e487b71 (Panic(uint256) selector)
//   - empty result with error in the response
```

The fix checks all these cases to reliably detect policy engine rejections before sending the actual deposit transaction.

### Expected Outcome
- Deposits that would be rejected by the policy engine are caught BEFORE any on-chain transactions (no wasted gas on approve)
- Clear error messages tell the user their account needs ACE policy engine whitelisting
- Users can proactively check eligibility per token via a "Check Eligibility" button

