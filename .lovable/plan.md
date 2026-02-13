

## Fix CDP API 404 by Using Correct Product-Specific Path Prefixes

The 404s occur because CDP v2 uses different path prefixes per product area, not a universal `/v2/wallets/...`. Each product has its own prefix.

### 1. Add `account_id` column to `agent_wallets` table

CDP Server Wallets uses the account ID (not EVM address) in URL paths like `/server/v2/evm/accounts/{account_id}/send-transaction`. We need to persist the account ID returned at creation time.

**Migration:**
```sql
ALTER TABLE agent_wallets ADD COLUMN cdp_account_id text;
```

### 2. Update all CDP API paths in `supabase/functions/agent-wallet/index.ts`

The `cdpRequest` function and `generateCdpJwt` stay as-is. Only the call-site paths change:

| Action | Current (wrong) | Correct |
|--------|-----------------|---------|
| Create account | `POST /v2/wallets/evm/accounts` | `POST /server/v2/evm/accounts` |
| Get account | `GET /v2/wallets/evm/accounts/{name}` | Remove -- CDP doesn't support get-by-name; always create and store the ID |
| Token balances | `GET /v2/wallets/evm/accounts/{addr}/balances?...` | `GET /data/v2/evm/token-balances/{addr}?network=base&tokenAddresses=...` |
| Send tx (send) | `POST /v2/wallets/evm/accounts/{addr}/send-transaction` | `POST /server/v2/evm/accounts/{cdp_account_id}/send-transaction` |
| Send tx (trade) | `POST /v2/wallets/evm/accounts/{addr}/send-transaction` | `POST /server/v2/evm/accounts/{cdp_account_id}/send-transaction` |
| Swap | `POST /v2/trade/evm/swaps` | `POST /trade/v2/evm/swaps` |
| Onramp | `POST /v2/onramp/sessions` | `POST /platform/v2/onramp/sessions` |

### 3. Update `auth-start` flow

- Remove the try/catch GET-by-name pattern (CDP doesn't support it)
- Always POST to create the account with `{ name, network: 'base' }`
- Store both `address` and `id` (as `cdp_account_id`) from the response
- The `name` field acts as an idempotency key -- CDP will return the existing account if one with that name already exists

### 4. Update `send` and `trade` actions

- Read `cdp_account_id` from the `agent_wallets` record
- Use it in the send-transaction path instead of `wallet_address`

### 5. Update balance query parameter

- Change `tokens=` to `tokenAddresses=` to match the data API docs

### Technical Details

- **Files changed**: `supabase/functions/agent-wallet/index.ts`
- **Database migration**: Add `cdp_account_id` text column to `agent_wallets`
- **No frontend changes needed** -- the response shape stays identical
