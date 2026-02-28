

## Fix Privacy Vault Balance Refresh and Add ERC-20 On-Chain Balances

### Problem
1. The Refresh button only calls `fetchBalances()` (vault internal ledger) but not `fetchAddresses()` (which fetches on-chain balances). So clicking Refresh never updates the on-chain balance display.
2. The `onchain-balance` edge function action only queries native ETH via `eth_getBalance`. ERC-20 tokens like USDC sent to a shielded address are invisible because they require an `eth_call` to the token contract's `balanceOf` function.

### Changes

**1. Edge Function: `supabase/functions/privacy-vault/index.ts`**
- Add a new action `onchain-erc20-balance` that calls the ERC-20 `balanceOf(address)` method via `eth_call` on Sepolia RPC.
- Accepts `address` (the shielded address) and `token` (ERC-20 contract address).
- Uses the standard `balanceOf` function selector `0x70a08231` + zero-padded address.
- Returns the token balance with appropriate decimal conversion (6 decimals for USDC, 18 for WETH/wBTC).
- Accept an optional `decimals` parameter (default 18) to convert raw balance.

**2. UI: `src/components/settings/PrivacyVaultSection.tsx`**
- Update `handleRefreshBalances` to also call `fetchAddresses()` so the Refresh button updates both vault and on-chain balances.
- After fetching on-chain ETH balance per address, also fetch ERC-20 balances for the common tokens (USDC, WETH, wBTC) using the new `onchain-erc20-balance` action.
- Store ERC-20 balances in a new state variable `onchainTokenBalances` as `Record<string, { symbol: string; amount: number }[]>`.
- Display each token's on-chain balance below the ETH balance in the shielded address list (only showing tokens with non-zero balances).
- The display will look like:
```text
Savings - 0x85c0...Bad7
On-chain: 0.001000 SepoliaETH
On-chain: 0.500000 USDC
```

### Technical Details

**ERC-20 balanceOf call:**
```text
POST https://ethereum-sepolia-rpc.publicnode.com
{
  "jsonrpc": "2.0",
  "method": "eth_call",
  "params": [{
    "to": "<token_contract>",
    "data": "0x70a08231000000000000000000000000<address_without_0x>"
  }, "latest"],
  "id": 1
}
```

The result is a hex-encoded uint256 which gets divided by 10^decimals.

**Token decimals mapping:**
- USDC: 6 decimals
- WETH: 18 decimals  
- wBTC: 8 decimals

**Refresh button fix** (simple one-liner):
Change `handleRefreshBalances` to call both `fetchBalances()` and `fetchAddresses()` in parallel.

