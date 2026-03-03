

## Simplify Privacy Vault UX

### Problem
The current Privacy Vault flow exposes blockchain infrastructure details to end users who shouldn't need to care about them:
- Deploying a Policy Engine contract
- Manually registering each token
- Understanding "re-registration" and policy engine addresses
- Pasting PE addresses into localStorage

Additionally, no MetaMask wallet is needed -- all signing already happens server-side via the `PRIVACY_VAULT_PRIVATE_KEY` secret. But the current UI structure implies the user needs external wallet interaction.

### Solution: Auto-Setup on First Deposit

Move all token registration and PE deployment logic into the backend, triggered automatically when a user deposits. The user never sees or thinks about it.

### Backend Changes (`supabase/functions/privacy-vault/index.ts`)

1. **New helper function: `ensureTokenRegistered(token, privateKeyHex)`**
   - Calls `sPolicyEngines(address)` to check registration
   - If already registered, returns immediately
   - If not registered:
     - Checks if a PE address is stored in the `agent_wallets` table for this user (new column or JSON field)
     - If no PE exists, auto-deploys one (reuses existing `deploy-policy-engine` logic) and stores the address
     - Registers the token with the PE (reuses existing `register` logic)
   - All transparent to the user

2. **Modify the `deposit` action**:
   - Before the existing approve+deposit flow, call `ensureTokenRegistered()`
   - If auto-registration happens, log it in `agent_actions_log`

3. **Remove the need for separate `register`, `re-register-token`, and `deploy-policy-engine` actions from being user-facing** (keep them internally but they won't be called from the frontend)

### Frontend Changes (`src/components/settings/PrivacyVaultSection.tsx`)

1. **Remove entirely**:
   - The "Token Registration" collapsible section (~150 lines)
   - The "Deploy My Policy Engine" collapsible and all PE-related state
   - The `manualPE`, `showChangePE`, `deployedPE` state variables and localStorage logic
   - The `checkTokenRegistration`, `handleRegisterToken`, `handleRegisterWithCustomPE`, `handleDeployPolicyEngine`, `handleCheckEligibility` functions

2. **Remove state variables**: `tokenRegStatus`, `registeringToken`, `showRegistration`, `deployedPE`, `isDeployingPE`, `showDeployPE`, `manualPE`, `showChangePE`, `checkingEligibility`

3. **Simplify the "How It Works" section**: Update to 3 simple steps:
   - Step 1: Generate a shielded address (for receiving)
   - Step 2: Deposit tokens (auto-setup happens behind the scenes)
   - Step 3: Transfer privately or withdraw

4. **Update deposit UX**: Add a note saying "Token setup is automatic" instead of requiring pre-registration. If auto-setup runs during deposit, show a brief status message like "Setting up token... Approving... Depositing..."

5. **Keep intact**: Generate Shielded Address, Privacy Balances, Deposit, Withdraw, Private Transfer, Activity Log sections

### Database Migration

Add a `deployed_pe_address` column to the `agent_wallets` table to persist the auto-deployed PE address server-side (replacing the fragile localStorage approach):

```sql
ALTER TABLE agent_wallets 
ADD COLUMN IF NOT EXISTS deployed_pe_address text;
```

### Summary of UX After Changes

The user sees 5 simple cards:
1. **Privacy Vault header** (status badge)
2. **How It Works** (3-step explainer)
3. **Generate Shielded Address** (label + generate button)
4. **Privacy Vault Balances** (with refresh)
5. **Deposit / Withdraw / Private Transfer** (just pick token, amount, go)

No mention of Policy Engines, token registration, re-registration, or contract addresses. Everything "just works" on first deposit.

### Technical Details

The `ensureTokenRegistered` function flow:

```text
ensureTokenRegistered(token, userId, privateKeyHex, serviceClient)
  |
  +-- eth_call sPolicyEngines(token) 
  |     |
  |     +-- registered? -> return (done)
  |     |
  |     +-- not registered:
  |           |
  |           +-- SELECT deployed_pe_address FROM agent_wallets WHERE user_id = ?
  |           |     |
  |           |     +-- has PE? -> use it
  |           |     +-- no PE? -> deploy new PE (existing logic)
  |           |                   UPDATE agent_wallets SET deployed_pe_address = ?
  |           |
  |           +-- register(token, pe_address) on-chain
  |           +-- INSERT agent_actions_log (auto-register)
  |
  +-- return
```

The deposit action becomes:
```text
deposit(token, amount)
  |
  +-- ensureTokenRegistered(token)  // NEW: auto-setup
  +-- checkDepositAllowed()          // existing
  +-- approve()                      // existing
  +-- deposit()                      // existing
```

