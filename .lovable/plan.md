

## Add "Max" Button to Private Transfer Form

### What it does
Adds a "Max" button next to the Amount field in the Private Transfer form. When clicked, it auto-fills the amount with the total available balance of the selected token across all your shielded addresses.

### How it works
- For ERC-20 tokens (USDC, LINK, WETH): sums up on-chain balances from `onchainTokenBalances` across all shielded addresses
- For native ETH: sums up on-chain balances from `onchainBalances` across all shielded addresses
- The max amount updates automatically when you change the selected token
- Also adds a "From Address" selector so you can pick which shielded address to send from (and the Max button reflects only that address's balance)

### Changes (single file: `src/components/settings/PrivacyVaultSection.tsx`)

1. Add a `fromAddress` state for selecting the sending shielded address
2. Add a computed `maxAmount` that looks up the selected token's on-chain balance for the selected shielded address
3. Add a "From Address" dropdown (populated from your shielded addresses) above the recipient field
4. Add a "Max" button next to the Amount input that sets `transferAmount` to `maxAmount`
5. Display the available balance below the amount field for reference

### Technical Details
- The max calculation maps `transferToken` to the correct source:
  - If token is `0x0000...0000` (native ETH): reads from `onchainBalances[fromAddress]`
  - Otherwise: finds the matching entry in `onchainTokenBalances[fromAddress]` by comparing the token address against `ERC20_TOKENS_TO_CHECK`
- The "Max" button is a small inline button styled consistently with the existing UI

