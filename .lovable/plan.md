

## Fix Wrong Token Contract Addresses (Base Sepolia -> Ethereum Sepolia)

### Root Cause
The ERC-20 token contract addresses in `PrivacyVaultSection.tsx` are for **Base Sepolia**, not **Ethereum Sepolia**. The Privacy Vault operates on Ethereum Sepolia (chainId 11155111), so all ERC-20 balance queries return 0 because they're checking the wrong contracts.

Wrong addresses currently in code:
- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia)
- WETH: `0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9` (Sepolia -- this one is actually correct for Sepolia WETH)
- wBTC: `0x29f2D40B0605204364af54EC677bD022dA425d03` (Base Sepolia)

### Fix (single file: `src/components/settings/PrivacyVaultSection.tsx`)

Update the token addresses to the correct Ethereum Sepolia contracts:

| Token | Current (Wrong) | Correct (Eth Sepolia) |
|-------|------------------|-----------------------|
| USDC  | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| LINK  | (not listed) | `0x779877A7B0D9E8603169DdbD7836e478b4624789` (from API docs) |
| WETH  | `0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9` | Keep as-is (correct) |
| wBTC  | `0x29f2D40B0605204364af54EC677bD022dA425d03` | Remove (no standard wBTC on Eth Sepolia) |

Update both `COMMON_TOKENS` and `ERC20_TOKENS_TO_CHECK` arrays with the corrected addresses. Add LINK token (18 decimals) since the API docs reference it as a supported vault token. Remove wBTC since there's no standard deployment on Ethereum Sepolia.

### Technical Details
- The `COMMON_TOKENS` array (used in the transfer token dropdown) and `ERC20_TOKENS_TO_CHECK` array (used for on-chain balance queries) both need updating
- The default `transferToken` state also needs to be updated to the correct USDC address
- No edge function changes needed -- the on-chain RPC queries work correctly, they were just given wrong contract addresses

