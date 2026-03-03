

## Fix: USDC Deposit Denied - Allow Re-registration with Custom Policy Engine

### Problem

USDC is already registered on the vault contract with a third-party Policy Engine that denies deposits from your account. Although you deployed your own permissive PE (`0x8813...`), the system currently:

1. **Backend** (`re-register-token` action): Pre-checks if a token is already registered and returns an error saying "registration is first-come-first-served and cannot be changed" -- never even attempting the on-chain call
2. **Frontend**: Only shows "Check Eligibility" for registered tokens -- no option to re-register with your own PE

### Solution

**1. Backend: Remove the registration blocker in `re-register-token`**

In `supabase/functions/privacy-vault/index.ts` (lines 894-948):
- Remove the pre-check that queries `sPolicyEngines(address)` and returns a 400 error for already-registered tokens
- Instead, just attempt the `register(address,address)` call directly on the vault contract
- If the contract allows re-registration, it succeeds; if not, the transaction reverts with a clear on-chain error
- This is safe because the vault contract itself enforces any real restrictions

**2. Frontend: Add "Re-register with My PE" button for registered tokens**

In `src/components/settings/PrivacyVaultSection.tsx` (lines 784-812):
- When a token is already registered AND the user has a deployed PE AND the current PE differs from the deployed PE, show a "Re-register with My PE" button
- This calls `handleRegisterWithCustomPE` (which already exists and uses `re-register-token`)
- Keep the existing "Check Eligibility" button alongside it

### Technical Details

**Backend change** (remove lines 899-918 in privacy-vault/index.ts):

```text
// REMOVE: The pre-check + early return that blocks re-registration
// Lines 899-918 that query sPolicyEngines and return 400 if already registered

// KEEP: Everything from line 920 onwards (the actual register call)
```

**Frontend change** (after line 810 in PrivacyVaultSection.tsx):

Add a conditional button when `deployedPE` exists and `status.policyEngine.toLowerCase() !== deployedPE.toLowerCase()`:

```text
{deployedPE && status?.policyEngine &&
 status.policyEngine.toLowerCase() !== deployedPE.toLowerCase() && (
  <Button size="sm" variant="outline" ...
    onClick={() => handleRegisterWithCustomPE(tok.address)}>
    Re-register with My PE
  </Button>
)}
```

### Expected Outcome

- You can re-register USDC with your permissive PE (`0x8813...`)
- After re-registration, the `checkDepositAllowed` pre-flight passes
- Deposits succeed without "Policy Engine denied" errors

