

# Fix: USDC-to-ETH Swap "Unable to Estimate Gas" - Permit2 Nonce Mismatch

## Root Cause (Confirmed via Logs)

The current code's 3-step flow has a fatal flaw:

1. POST /swaps -- get quote with permit2 nonce `...1664`
2. Sign permit2 EIP-712 data -- signature is for nonce `...1664`
3. POST /swaps AGAIN with signature -- API returns a **NEW** quote with nonce `...2045`

The signature from step 2 was for nonce `...1664`, but the transaction calldata from step 3 references nonce `...2045`. On-chain, the Permit2 contract verifies the signature against the nonce in the calldata -- they don't match -- the transaction reverts -- "unable to estimate gas".

The CDP swap API does NOT accept a `permit2.signature` parameter in its request body (confirmed via the official API reference -- only `network`, `toToken`, `fromToken`, `fromAmount`, `taker`, `signerAddress`, `gasPrice`, `slippageBps` are valid parameters). Each call generates a fresh quote with a new nonce, so re-requesting will always create a mismatch.

## Solution

**Stop re-requesting the swap.** Instead, after signing the permit2 data, send the **original** swap transaction directly. The original transaction's calldata already references the correct permit2 nonce that matches our signature.

The swap router's calldata from step 1 includes the Permit2 transfer parameters (nonce, deadline, token, amount) but with an empty/zero signature placeholder. The signature needs to be spliced into the calldata at the correct ABI offset.

However, based on the CDP SDK examples and documentation, the recommended approach is simpler -- the SDK's internal `sendTransaction` method accepts a **transaction object** (with `to`, `data`, `value` fields), NOT an RLP-encoded string. The SDK then handles everything including gas estimation.

## Changes to `supabase/functions/agent-wallet/index.ts`

### Change 1: Remove the re-swap step entirely

Delete the code that re-requests the swap with `permit2: { signature }`. This was the root cause -- the API ignores this parameter and generates a new nonce.

### Change 2: Embed the permit2 signature into the original transaction calldata

After signing the permit2 EIP-712 data, splice the 65-byte signature (r, s, v) into the original transaction's calldata at the correct offset. The approach:

1. The swap router function `0x1fff991f` uses ABI-encoded parameters where the permit2 signature is a `bytes` type
2. Locate the signature slot by finding the ABI offset for the signature parameter (the swap response includes `permit2.hash` which helps identify the location)
3. Replace the zero-byte placeholder with the actual signature bytes
4. The modified calldata now has the matching nonce + valid signature

The signature embedding logic:
- Parse the original `transaction.data` hex string
- The Settler/0x contract encodes the permit2 signature as the last dynamic bytes parameter in the actions array
- Search for the 65 consecutive zero bytes (the signature placeholder) and replace with the actual signature
- If no zero-byte pattern is found, append the signature using proper ABI encoding

### Change 3: Send the modified original transaction

After embedding the signature, RLP-encode the modified transaction (with the original `to`, `value`, and updated `data`) and send via `/send/transaction`.

### Change 4: Add detailed logging

Log the `swapTx.to`, `swapTx.value`, and `swapTx.data` length before encoding to aid debugging if gas estimation still fails.

## Updated Flow

```text
For USDC-to-ETH swaps:
1. POST /swaps (get quote + permit2 data + transaction)
2. Check allowance, approve Permit2 if needed (one-time)
3. POST /sign/typed-data (sign permit2 EIP-712 data)
4. Splice signature into ORIGINAL transaction calldata
5. RLP-encode and send via /send/transaction

For ETH-to-USDC swaps (no permit2 needed):
1. POST /swaps (get transaction)
2. RLP-encode and send via /send/transaction
```

## Technical Details

### Signature Splicing

The 0x Settler contract's `execute` function includes the permit2 signature as part of its encoded actions. The ABI encoding follows this pattern:

```text
0x1fff991f                          // function selector
[ABI-encoded parameters]           // includes permit2 data
  ...
  [offset to signature bytes]      // pointer to dynamic bytes
  ...
  [0x0000000000000041]             // length = 65 bytes
  [65 zero bytes]                  // signature placeholder (r, s, v)
```

We replace the 65 zero bytes with our actual signature (32 bytes r + 32 bytes s + 1 byte v).

### Fallback Strategy

If the signature splicing approach proves too fragile (different calldata layouts for different swap routes), we implement a fallback: check if the calldata already works without permit2 by sending it directly. Some swap routes may use the ERC-20 approval directly without requiring a per-swap permit2 signature (since we already approved the Permit2 contract with max allowance).

## Risk Mitigation

- Log the full `transaction.to`, `transaction.value`, and `transaction.data.length` before sending
- If the signature splice fails or the gas estimation still fails, return a clear error message explaining the issue rather than a generic "trade failed"
- Add a 2-second retry with the direct (un-modified) calldata as a fallback, in case the Permit2 contract accepts the max approval without a per-swap signature for certain routes

