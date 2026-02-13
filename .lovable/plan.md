

## Fix CDP API 401 by Correcting JWT URI Format

The 401 persists because the JWT `uri` field includes the HTTP method and hostname (`GET api.cdp.coinbase.com/platform/v2/...`), but CDP expects just the path (`/v2/platform/...`). The base URL and path construction are also inconsistent.

### Changes (single file: `supabase/functions/agent-wallet/index.ts`)

**1. Update `CDP_API_BASE`**
```typescript
// Before
const CDP_API_BASE = 'https://api.cdp.coinbase.com/platform/v2';

// After
const CDP_API_BASE = 'https://api.cdp.coinbase.com';
```

**2. Rewrite `cdpRequest` to build a single consistent path**
- Construct `fullPath = /v2/platform${path}` once
- Pass `fullPath` to both `generateCdpJwt` and `fetch`
- URL becomes `CDP_API_BASE + fullPath`

**3. Simplify `generateCdpJwt` URI construction**
- Remove the `"METHOD host/path"` format
- Set `uri` to just the `requestPath` string (e.g. `/v2/platform/evm/accounts`)
- Keep both `uri` (string) and `uris` (array) in the payload

**4. Add a temporary full-payload log** for sanity-checking `aud`, `nbf`, `exp`, and `uri` alignment.

No changes to call sites, database, or frontend.

