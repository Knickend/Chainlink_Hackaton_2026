

# Fix: USDC-to-ETH Swap "Unable to Estimate Gas" — RESOLVED

## Root Cause

The Permit2 signature was being **spliced into** the calldata at a zero-byte placeholder offset. This approach was fragile and incorrect.

## Solution (from CDP SDK source code)

Reading the official CDP SDK source (`sendSwapTransaction.ts`), the correct approach is to **append** the signature to the end of the transaction data:

```typescript
// From CDP SDK: concat([txData, signatureLengthInHex, signature])
const sigLenHex = sigByteLength.toString(16).padStart(64, '0');
finalTxData = '0x' + txDataHex + sigLenHex + sig;
```

The signature length (as a 32-byte big-endian word) + raw signature bytes are appended after the original calldata. The swap router contract reads the signature from the end of the calldata.

## Updated Flow

```text
For ERC-20 → ETH swaps (USDC → ETH):
1. POST /swaps (get quote + permit2 data + transaction)
2. Check allowance, approve Permit2 if needed (one-time)
3. POST /sign/typed-data (sign permit2 EIP-712 data)
4. APPEND signature length + signature to ORIGINAL transaction calldata
5. RLP-encode and send via /send/transaction

For ETH → ERC-20 swaps (no permit2 needed):
1. POST /swaps (get transaction)
2. RLP-encode and send via /send/transaction
```
