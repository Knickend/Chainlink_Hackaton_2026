

## Display On-Chain Balance for Shielded Addresses

### Problem
The Privacy Vault's `/balances` API only tracks its internal ledger (deposits made via the smart contract's `deposit()` function). Native ETH sent directly to a shielded address sits on-chain but isn't reflected in the vault. The vault is designed for ERC-20 tokens, not native ETH.

### Solution
Add an on-chain balance check for shielded addresses using a public Sepolia RPC, so users can see both vault balances AND on-chain balances for their shielded addresses.

### Changes

**1. Edge function: `supabase/functions/privacy-vault/index.ts`**
- Add a new action `onchain-balance` that queries a public Sepolia RPC (`eth_getBalance`) for a given address
- Returns the native ETH balance in a human-readable format
- No EIP-712 signing needed since this is a public blockchain query

**2. UI: `src/components/settings/PrivacyVaultSection.tsx`**
- For each shielded address in the list, fetch and display its on-chain SepoliaETH balance alongside the address
- Add an Etherscan link for each shielded address so users can verify on-chain
- Update the info note to explain the difference between vault balances (internal ledger) and on-chain balances (direct transfers)

### Technical Details

The new `onchain-balance` action will call:
```text
POST https://ethereum-sepolia-rpc.publicnode.com
Body: {"jsonrpc":"2.0","method":"eth_getBalance","params":["0x85c0...Bad7","latest"],"id":1}
```

This converts the hex wei result to ETH for display. The UI will show something like:
```text
Savings  - 0x85c0...Bad7 [Copy] [Etherscan]
On-chain: 0.001 ETH
```

The vault balances card will remain separate, showing only protocol-deposited token balances, with clear labeling distinguishing the two.

### Important Note for the User
The Privacy Vault smart contract's `deposit()` function is for ERC-20 tokens (LINK, USDC, etc.) with prior approval -- not native ETH. To get tokens into the vault's internal ledger, you would need to deposit a supported ERC-20 token through the contract. The 0.001 ETH you sent is safe at the shielded address on-chain but won't appear in vault balances.

