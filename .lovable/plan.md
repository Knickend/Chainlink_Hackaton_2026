

## Fix CDP API 404 by Updating Endpoint Paths

The 404 occurs because the current code prefixes all paths with `/v2/platform`, but the real CDP v2 API uses different prefixes per product area. The fix updates `cdpRequest` and all call sites to use the correct documented paths.

### Changes (single file: `supabase/functions/agent-wallet/index.ts`)

**1. Update `cdpRequest` to pass paths through directly**

Remove the hard-coded `/v2/platform` prefix. Each call site will now provide the full v2 path:

```typescript
async function cdpRequest(method: string, path: string, body?: unknown) {
  // path is already a full v2 path like "/v2/wallets/evm/accounts"
  const fullPath = path;
  const jwt = await generateCdpJwt(apiKeyId, apiKeySecret, method, fullPath);
  const url = `${CDP_API_BASE}${fullPath}`;
  ...
}
```

**2. Update all call sites to use correct v2 paths**

| Action | Old Path | New Path |
|--------|----------|----------|
| Create account | `/evm/accounts` | `/v2/wallets/evm/accounts` |
| Get account | `/evm/accounts/${name}` | `/v2/wallets/evm/accounts/${name}` |
| Token balances | `/evm/token-balances/${addr}?...` | `/v2/wallets/evm/accounts/${addr}/balances?...` |
| Send transaction | `/evm/accounts/${addr}/send/transaction` | `/v2/wallets/evm/accounts/${addr}/send-transaction` |
| Swap | `/evm/swaps` | `/v2/trade/evm/swaps` |
| Onramp | `/onramp/sessions` | `/v2/onramp/sessions` |

**3. JWT `uri` stays aligned** -- since `fullPath = path` and we already set `uri = requestPath`, the JWT will automatically match the HTTP URL path.

No database or frontend changes needed.

