

# Add "Refresh Balance" Button and Display All Token Balances

## Problem
The agent wallet backend fetches **all** token balances from Coinbase CDP but only extracts USDC and ETH, discarding other tokens (e.g. WETH, LINK, etc.). The UI similarly only displays those two. There is also no way to manually refresh balances.

## Changes

### 1. Edge Function: Return all token balances
**File:** `supabase/functions/agent-wallet/index.ts`

In the `status` action handler (~line 620-700), after fetching `tokenList` from CDP, instead of only extracting USDC and ETH:
- Keep the existing `balance` (USDC) and `eth_balance` (ETH) fields for backward compatibility
- Add a new `token_balances` array to the response containing **all** tokens from the CDP response, each with `{ symbol, amount, decimals, contractAddress }`
- Reuse the existing `parseTokenAmount` helper for each entry

### 2. Hook: Expose token balances
**File:** `src/hooks/useAgentWallet.ts`

- Add `token_balances` to the `AgentWalletStatus` interface as `Array<{ symbol: string; amount: number; contractAddress: string }>` (default `[]`)
- Map the new field from the status response

### 3. UI: Display all tokens + Refresh button
**File:** `src/components/settings/AgentSection.tsx`

- Replace the hardcoded USDC/ETH display (lines ~115-130) with a dynamic list that iterates over `status.token_balances`
- Fall back to showing USDC and ETH from the existing fields if `token_balances` is empty (backward compat)
- Add a "Refresh" icon button next to the wallet info card header that calls `refetch()` from the hook

### 4. DCA page: No changes needed
The DCA page only uses `walletStatus.balance` (USDC) for budget checks, which remains unchanged.

## Technical Details

### Edge function status response (new shape)
```text
{
  connected, wallet_address, wallet_email,
  balance,        // USDC string (kept for backward compat)
  eth_balance,    // ETH string (kept for backward compat)
  token_balances: [
    { symbol: "USDC", amount: 12.50, contractAddress: "0x036..." },
    { symbol: "ETH",  amount: 0.045, contractAddress: "0xeee..." },
    { symbol: "LINK", amount: 100.0, contractAddress: "0xabc..." },
    ...
  ],
  ...existing fields
}
```

### Token balance parsing
Each CDP token entry is parsed using the existing `parseTokenAmount` helper. The symbol comes from `t.token.symbol`, decimals from `t.token.decimals` (fallback 18), and contract address from `t.token.contractAddress`.

### UI layout
- Each token gets a row: symbol on the left, formatted amount on the right
- Amounts formatted to 2 decimals for stablecoins (USDC, USDT, DAI), 6 for ETH/WETH, 4 for others
- A small `RefreshCw` icon button in the wallet card header triggers `refetch()`

