

## Fix: Add X-Wallet-Auth Header for CDP v2 API

### Root Cause
The CDP v2 EVM endpoints (create account, sign transaction, etc.) require **two** authentication JWTs:
1. `Authorization: Bearer <JWT>` -- signed with your Secret API Key (Ed25519). Already working.
2. `X-Wallet-Auth: <JWT>` -- signed with a **Wallet Secret** (ECDSA P-256/ES256). **Currently missing.**

This is why every call returns: `"parameter \"X-Wallet-Auth\" in header has an error: value is required but missing"`

### What You Need To Do First
1. Go to the [CDP Portal - Server Wallets](https://portal.cdp.coinbase.com/products/server-wallets)
2. In the **Wallet Secret** section, click **Generate**
3. Save the secret -- it's a base64-encoded ECDSA P-256 private key (you won't see it again)
4. I'll ask you to paste it as a new secret called `CDP_WALLET_SECRET`

### Code Changes (supabase/functions/agent-wallet/index.ts)

**1. Add a new `generateWalletAuthJwt` function**
- Uses ECDSA P-256 (ES256 algorithm) instead of Ed25519
- JWT payload includes: `iat`, `nbf`, `jti` (random), `uris` (array with method + host + path)
- For requests with a body, includes `reqHash` -- a SHA-256 hash of the sorted JSON body
- Reads `CDP_WALLET_SECRET` from environment variables

**2. Update `cdpRequest` to include the `X-Wallet-Auth` header**
- Generate the wallet auth JWT alongside the existing bearer JWT
- Add it as `X-Wallet-Auth` header on every CDP API call

### Technical Details

The Wallet Token JWT structure (per CDP docs):

```text
Header: { alg: "ES256", typ: "JWT" }
Payload: {
  iat: <now>,
  nbf: <now>,
  jti: <random hex>,
  uris: ["POST api.cdp.coinbase.com/platform/v2/evm/accounts"],
  reqHash: <sha256 of sorted JSON body>  // only if body present
}
Signed with: ECDSA P-256 (the Wallet Secret)
```

The key import will use `crypto.subtle.importKey` with algorithm `{ name: "ECDSA", namedCurve: "P-256" }` and sign with `{ name: "ECDSA", hash: "SHA-256" }`.

### Sequence

1. Store the new `CDP_WALLET_SECRET` as a backend secret
2. Implement `generateWalletAuthJwt` function
3. Update `cdpRequest` to send both headers
4. Deploy and test wallet connection

