

## Deploy Own PolicyEngine Behind ERC1967 Proxy

### Problem
USDC and LINK are registered on the Privacy Vault with policy engines (`0xa4e2ced7...` and `0xcf3e8b18...`) controlled by someone else, which reject our depositor address. WETH is not registered at all. We need our own PolicyEngine instance that permits our vault account.

### Approach
Rather than compiling Solidity in the edge function, we reuse the already-deployed PolicyEngine implementation contract on Sepolia. We read its address from an existing proxy's ERC1967 storage slot, then deploy a fresh ERC1967Proxy pointing to it with `initialize(PolicyResult.Allowed)`. This gives us a permissive PolicyEngine where we are the admin.

### Changes

**1. Backend: `supabase/functions/privacy-vault/index.ts`**

Add two new actions:

**`deploy-policy-engine`**:
- Read the PolicyEngine implementation address from existing proxy `0xa4e2ced7...` using `eth_getStorageAt` at slot `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` (ERC1967 implementation slot)
- Construct the ERC1967Proxy creation bytecode: the well-known OpenZeppelin minimal proxy constructor that takes `(address implementation, bytes data)`
- Encode init data as `PolicyEngine.initialize(uint8 defaultResult)` where defaultResult = 0 (Allowed enum)
- Sign and send a contract creation transaction (to = empty, data = creation bytecode + constructor args)
- Wait for receipt, extract deployed contract address from receipt
- Log the new PE address
- Return `{ policy_engine: deployedAddress, tx_hash }`

**`re-register-token`**:
- For tokens NOT yet registered (like WETH): call `register(token, ourPolicyEngine)` on the vault contract
- For tokens already registered with another PE: inform the user that re-registration is not possible (first-come-first-served) unless the vault supports `updatePolicyEngine`

**2. Frontend: `src/components/settings/PrivacyVaultSection.tsx`**

Add a "Deploy Policy Engine" card (collapsible) in the Token Registration section:
- "Deploy My Policy Engine" button that calls the new backend action
- Shows the deployed PE address once complete
- Stores the deployed PE address in component state
- Updates the "Register" button for unregistered tokens to use the newly deployed PE address instead of `address(0)`
- For already-registered tokens, shows a note: "Already registered with another policy engine"

### Technical Details

**Reading implementation from proxy:**
```text
eth_getStorageAt(
  proxy_address,
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
  "latest"
) => returns implementation address
```

**ERC1967Proxy creation bytecode:**
The OpenZeppelin ERC1967Proxy constructor bytecode is standardized. We use the same proxy bytecode found on the existing deployed proxy contract, prepended with the constructor that encodes `(address _implementation, bytes memory _data)`.

Since the proxy at `0xa4e2ced7...` was created 3 days ago, we can fetch its creation transaction bytecode to get the exact creation code, then append our own constructor arguments.

**PolicyEngine.initialize selector:**
```text
keccak256("initialize(uint8)") => first 4 bytes
Argument: 0 (PolicyResult.Allowed)
```

**Extracting deployed address from receipt:**
The deployed contract address is in `receipt.contractAddress`.

### Important Limitations
- USDC (`0x1c7D...`) and LINK (`0x7798...`) are already registered with other policy engines. These registrations cannot be changed from our side -- they are first-come-first-served.
- Our deployed PE will only be useful for tokens NOT yet registered (WETH) or future tokens.
- The deployed PE defaults to "Allowed" with no policies, meaning all deposit/transfer/withdraw operations are permitted for any address.

### Expected Outcome
1. User clicks "Deploy My Policy Engine" -- deploys a new permissive PE on Sepolia
2. User registers WETH with the new PE (WETH is currently unregistered)
3. WETH deposits should work immediately since the PE allows everything
4. For USDC/LINK, the user would need to coordinate with whoever controls those policy engines to get whitelisted

