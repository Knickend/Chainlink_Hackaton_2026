

## Fix: Add Token Registration to Privacy Vault

### Problem
The Privacy Vault's private transfers and withdrawals fail because tokens (USDC, LINK, WETH) have not been **registered** on the vault smart contract (`0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13`). The contract's `register(address token, address policyEngine)` function must be called for each token before deposits, transfers, or withdrawals can work. Without registration, the on-chain policy engine check reverts.

### Solution
Add a `register` action to the backend function that calls the vault contract's `register(token, policyEngine)` on-chain, and expose a simple UI to trigger registration for each supported token.

### Changes

**1. Backend: `supabase/functions/privacy-vault/index.ts`**

Add a new `register` case that:
- Accepts `token` and `policyEngine` parameters (policyEngine defaults to `address(0)` for no-policy / permissive mode, unless a specific ACE policy engine address is provided)
- Encodes the `register(address,address)` function call (selector: first 4 bytes of `keccak256("register(address,address)")`)
- Signs and sends a raw transaction to the vault contract
- Waits for the receipt and logs the result
- Note: registration is first-come, first-served -- if someone else already registered the token, the tx will revert. In that case, deposits should already work.

Also add a `check-registration` action that calls the view function `sPolicyEngines(token)` to check if a token is already registered.

**2. Frontend: `src/components/settings/PrivacyVaultSection.tsx`**

Add a "Token Registration" card (collapsible, similar to other cards) that:
- Shows each supported token (USDC, LINK, WETH) with its registration status (registered / not registered)
- On mount, calls `check-registration` for each token
- Provides a "Register" button for unregistered tokens
- Lets the user optionally provide a policy engine address (defaults to `address(0)` for permissive/no policy)
- Shows success/failure result after registration
- Place this card at the top of the Privacy Vault section (before deposit), since registration is a prerequisite

### Technical Details

Register function selector:
```text
keccak256("register(address,address)") => first 4 bytes
```

Calldata encoding:
```text
selector + padTo32(tokenAddress) + padTo32(policyEngineAddress)
```

Check registration (view call to `sPolicyEngines(address)`):
```text
keccak256("sPolicyEngines(address)") => first 4 bytes
eth_call with data = selector + padTo32(tokenAddress)
Returns address (0x0 means not registered)
```

### Flow After Fix
1. User registers each token (one-time on-chain tx per token)
2. User deposits tokens (approve + deposit on-chain)
3. Vault balance is credited off-chain by the indexer
4. User can now do private transfers and withdrawals

