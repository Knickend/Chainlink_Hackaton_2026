
# Fix: CDP Swap Quote 401 and Trade 400 Errors

## Problems Identified

### 1. Trade Quote Returns 401 Unauthorized
**Root cause**: The `generateCdpJwt` function constructs the JWT `uri` field as:
```
GET api.cdp.coinbase.com/platform/v2/evm/swaps/quote?network=base&fromToken=0x833...&toToken=0x420...
```
CDP expects the `uri` to contain only the path, **without query parameters**. The query string causes the JWT signature to not match what CDP validates against.

**Fix**: In `generateCdpJwt`, strip query parameters from `requestPath` before building the `uri`. The query params should still be included in the actual HTTP URL, just not in the JWT signing payload.

### 2. Trade Execution Returns 400 "Unable to Estimate Gas"
**Root cause**: The CDP swap API (`POST /platform/v2/evm/swaps`) returns a response with both a `transaction` object and a `permit2` object. For ERC-20 swaps (like USDC to ETH), the Uniswap router requires a Permit2 approval to spend the user's USDC. Our current code:
1. Ignores the `permit2` signing requirement entirely
2. Takes the raw `transaction` from the swap response and tries to submit it via `send/transaction`
3. The transaction reverts during gas estimation because USDC allowance to Permit2 is not set

**Fix**: Restructure the trade flow to properly handle Permit2:
- After getting the swap response, check for `permit2` data
- If present, sign the `permit2.hash` using CDP's `signHash` endpoint
- Then submit the swap transaction along with the signed Permit2 signature (via a properly encoded calldata that includes both the swap and the permit)

As an alternative simpler approach: add `signerAddress` to the swap POST body (matching the wallet address). Per CDP docs, when `signerAddress` is provided, CDP may handle Permit2 internally for server wallets. If this doesn't work, we fall back to explicit Permit2 signing.

## File Changes

### `supabase/functions/agent-wallet/index.ts`

#### Fix 1: Strip query params from JWT URI (affects `generateCdpJwt`, ~line 161)

Change:
```typescript
const uri = `${requestMethod} api.cdp.coinbase.com${requestPath}`;
```
To:
```typescript
const pathOnly = requestPath.split('?')[0];
const uri = `${requestMethod} api.cdp.coinbase.com${pathOnly}`;
```

This fixes the 401 on the GET quote endpoint and any future GET requests with query params.

#### Fix 2: Add `signerAddress` to swap body (affects `trade` case, ~line 881)

Add `signerAddress: wallet.wallet_address` to the swap request body. This tells CDP which server wallet account owns the tokens, allowing it to handle Permit2 approval internally.

#### Fix 3: Handle Permit2 signing if needed (affects `trade` case, ~line 910)

After the swap POST response, check if `permit2` is present with a `hash` to sign:
1. Call `POST /platform/v2/evm/accounts/{address}/sign/hash` with the Permit2 hash
2. Include the signature in the transaction data
3. Then send the transaction via `send/transaction`

If the swap response doesn't include `permit2` (e.g., ETH-to-USDC swaps don't need it), proceed directly with sending the transaction.

#### Fix 4: Improve error context for debugging

Log the full swap response `issues` field (which tells us about allowance/balance problems) before attempting to send the transaction.

## Technical Details

### JWT URI Query Parameter Issue

CDP's JWT validation compares the `uri` claim against the request path. Their server strips query parameters before comparison. When we include query params in the signed URI, the JWT fails signature verification, returning 401.

The fix in `generateCdpJwt` ensures:
- `GET /platform/v2/evm/swaps/quote?network=base&...` is signed as `GET api.cdp.coinbase.com/platform/v2/evm/swaps/quote`
- The actual HTTP request still includes the full query string in the URL

### Permit2 Flow for ERC-20 Swaps

The Uniswap v4 router on Base uses Permit2 for token approvals. When swapping USDC (ERC-20) for ETH:
1. The user must have USDC approved for the Permit2 contract
2. A Permit2 signature is needed for the specific swap amount
3. The swap transaction includes the Permit2 signature in its calldata

CDP's server wallet can sign the Permit2 hash via:
```
POST /platform/v2/evm/accounts/{address}/sign/hash
Body: { hash: "0x..." }
```

This returns a signature that gets included in the swap execution.

### Wallet Auth JWT for sign/hash

The `sign/hash` endpoint is a POST, so it requires both the Authorization JWT and X-Wallet-Auth JWT (already handled by the existing `cdpRequest` function).

### Expected Outcome

After these fixes:
- `trade-quote` will successfully return price estimates (no more 401)
- `trade` will properly handle Permit2 approval and execute swaps (no more "unable to estimate gas")
- Both USDC-to-ETH and ETH-to-USDC swaps will work correctly
