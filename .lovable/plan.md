

## Fix: WETH Registration Failing with Zero Policy Engine

### Root Cause

The registration failed because the vault contract received `address(0)` as the policy engine. This happened because the "Register" button (shown when no PE is deployed) calls `handleRegisterToken` which invokes the `register` backend action without a `policyEngine` parameter. The backend then defaults to `address(0)` (line 767), which the vault contract rejects with `TokenRegistrationFailedNoPolicyEngine`.

### Changes

**1. Backend: `supabase/functions/privacy-vault/index.ts`**

- In the `register` action (line 762-800): Instead of defaulting to `address(0)` when no policy engine is provided, throw an error requiring a valid policy engine address. This prevents silently sending doomed transactions.

```text
// OLD (line 767):
const policyAddr = (policyEngine as string) || "0x0000000000000000000000000000000000000000";

// NEW:
const policyAddr = policyEngine as string;
if (!policyAddr || policyAddr === "0x0000000000000000000000000000000000000000") {
  throw new Error("A valid policy engine address is required. Deploy your own Policy Engine first.");
}
```

**2. Frontend: `src/components/settings/PrivacyVaultSection.tsx`**

Two fixes:

a) **Persist deployed PE address** in localStorage so it survives page refreshes:
- On mount, load `deployedPE` from `localStorage.getItem('privacy-vault-deployed-pe')`
- After successful deployment, save to `localStorage.setItem('privacy-vault-deployed-pe', address)`

b) **Remove the fallback "Register" button** that calls `handleRegisterToken` with no PE:
- When no PE is deployed, show a message saying "Deploy a Policy Engine first" instead of a plain "Register" button
- Remove or guard `handleRegisterToken` so it cannot be called without a PE
- The button at line 765-773 (the else branch when `!deployedPE`) should be replaced with a prompt to deploy a PE

### Technical Details

**localStorage persistence:**
```text
// On mount (in useEffect or initial state):
const [deployedPE, setDeployedPE] = useState<string | null>(
  () => localStorage.getItem('privacy-vault-deployed-pe')
);

// After successful deploy:
setDeployedPE(data.policy_engine);
localStorage.setItem('privacy-vault-deployed-pe', data.policy_engine);
```

**Button replacement (lines 764-773):**
Replace the plain "Register" button with a disabled button + tooltip explaining they need to deploy a PE first, or auto-expand the Deploy PE section.

### Expected Outcome
- Users must deploy a PE before registering any token
- The deployed PE address persists across page refreshes
- No more `address(0)` sent to the vault contract
- Clear user guidance when PE is not yet deployed
