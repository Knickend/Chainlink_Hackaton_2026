

## Unify All CDP Paths to `/platform/v2`

Six call sites in `supabase/functions/agent-wallet/index.ts` still use wrong prefixes (`/server/v2`, `/data/v2`, `/trade/v2`). All must move to `/platform/v2`. Additionally, the balance response shape and the send-transaction path segment need fixing.

### Changes (single file only)

**1. Account creation (line 218)**
- From: `POST /server/v2/evm/accounts`
- To: `POST /platform/v2/evm/accounts`

**2. Token balances (lines 275-284)**
- From: `GET /data/v2/evm/token-balances/${addr}?network=base&tokenAddresses=...`
- To: `GET /platform/v2/evm/token-balances/base/${addr}`
- Update response parsing: use `balances[].amount.value` and `balances[].token.decimals` instead of `balances[].amount` and `balances[].decimals`

**3. Send transaction in `send` action (lines 391-402)**
- From: `POST /server/v2/evm/accounts/${cdpAccountId}/send-transaction`
- To: `POST /platform/v2/evm/accounts/${wallet.wallet_address}/send/transaction`
- Uses wallet address (not account ID) and slash-separated `send/transaction`

**4. Swap in `trade` action (line 477)**
- From: `POST /trade/v2/evm/swaps`
- To: `POST /platform/v2/evm/swaps`

**5. Send transaction in `trade` action (lines 489-494)**
- From: `POST /server/v2/evm/accounts/${cdpAccountId}/send-transaction`
- To: `POST /platform/v2/evm/accounts/${wallet.wallet_address}/send/transaction`

**6. Onramp (already correct at `/platform/v2/onramp/sessions`)**
- No change needed.

### Summary of prefix mapping

All endpoints use `/platform/v2`:

| Operation | Correct Path |
|-----------|-------------|
| Create account | `POST /platform/v2/evm/accounts` |
| Token balances | `GET /platform/v2/evm/token-balances/base/{address}` |
| Send transaction | `POST /platform/v2/evm/accounts/{address}/send/transaction` |
| Swap | `POST /platform/v2/evm/swaps` |
| Onramp | `POST /platform/v2/onramp/sessions` |

### No other changes

- `cdpRequest` and `generateCdpJwt` stay as-is
- No database changes
- No frontend changes
- Function will be redeployed automatically after editing

