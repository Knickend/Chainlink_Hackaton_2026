

# Fix: USDC-to-ETH Swap "Unable to Estimate Gas" Error

## Root Cause

The swap is failing because of two issues in the trade flow:

1. **Wrong signing endpoint**: The code calls `/sign/hash` which returns **404 "no matching operation was found"**. The correct CDP endpoint for Permit2 is `/sign/typed-data` (EIP-712 typed data signing), not `/sign/hash`.

2. **Missing USDC approval for Permit2**: The swap response shows `issues.allowance.currentAllowance: "0"` -- the wallet has never approved USDC spending by the Permit2 contract (`0x000000000022d473030f116ddee9f6b43ac78ba3`). Without this approval, the swap transaction will always fail gas estimation because the Uniswap router can't pull USDC from the wallet.

3. **Permit2 signature not included in transaction**: Even after signing, the current code ignores the signature and sends the raw transaction without it.

## Fix (3 changes in `supabase/functions/agent-wallet/index.ts`)

### Change 1: Add a one-time USDC approval for Permit2

Before attempting the swap, check if the swap response reports an allowance issue. If `currentAllowance` is `"0"`, send an ERC-20 `approve` transaction to set USDC allowance for the Permit2 contract to max uint256. This is a one-time transaction (same as how MetaMask prompts "Approve USDC for trading").

The approve transaction is:
- **to**: USDC contract (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)  
- **data**: `approve(0x000000000022d473030f116ddee9f6b43ac78ba3, type(uint256).max)`
- Encoded as standard ERC-20 approve calldata

After the approval tx confirms, re-request the swap quote so it no longer reports the allowance issue.

### Change 2: Use `/sign/typed-data` instead of `/sign/hash`

Replace the Permit2 signing call from:
```
POST /platform/v2/evm/accounts/{address}/sign/hash
Body: { hash: "0x..." }
```

To:
```
POST /platform/v2/evm/accounts/{address}/sign/typed-data
Body: { domain: {...}, types: {...}, primaryType: "PermitTransferFrom", message: {...} }
```

The swap response already includes the full `permit2.eip712` object with `domain`, `types`, `primaryType`, and `message` -- we just need to pass those directly to the `/sign/typed-data` endpoint.

### Change 3: Embed Permit2 signature in the swap transaction

After obtaining the Permit2 signature, we need to re-request the swap with the signature included. The CDP swap API accepts a `permit2.signature` field in the POST body. So after signing:

1. Take the signature from `/sign/typed-data` response
2. Re-POST to `/platform/v2/evm/swaps` with the same parameters plus `permit2: { signature: "0x..." }`
3. The returned transaction will now include the embedded Permit2 signature in its calldata
4. Send this updated transaction via `/send/transaction`

## Flow Summary

For USDC-to-ETH swaps:

```text
1. POST /swaps (get quote + permit2 data)
2. Check allowance issue:
   a. If currentAllowance = "0":
      - Build ERC-20 approve tx (USDC -> Permit2 contract, max uint256)
      - Send via /send/transaction
      - Wait for confirmation
3. POST /sign/typed-data (sign permit2 EIP-712 data)
4. POST /swaps again (include permit2.signature in body)
5. Send returned transaction via /send/transaction
```

For ETH-to-USDC swaps (no permit2 needed):
```text
1. POST /swaps (get quote + transaction)
2. Send transaction via /send/transaction (no approval or permit2 needed)
```

## Technical Details

### ERC-20 Approve Calldata

The approve function signature is `approve(address,uint256)` with selector `0x095ea7b3`:
```
0x095ea7b3
  + 000000000000000000000000000000000022d473030f116ddee9f6b43ac78ba3  (Permit2 address, left-padded)
  + ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff  (max uint256)
```

### Why This Is a One-Time Cost

The USDC approval to Permit2 only needs to happen once per wallet. After the first swap, subsequent USDC swaps will skip the approval step because `currentAllowance` will be non-zero.

### No Change Needed for ETH-to-USDC

ETH is a native token, so no ERC-20 approval or Permit2 is needed. The existing code path (direct transaction send) should work for ETH-to-USDC swaps already.

