

## Optimizing CRE Workflows for Live `cre simulate` Execution

### Current State

The project has 5 CRE workflows in `incontrol-cre-ts/`:

| Workflow | Live API calls? | On-chain write? | Config ready? |
|----------|----------------|-----------------|---------------|
| `dca-trigger-ts` | Yes (Supabase REST + edge fn) | Via edge function | Yes |
| `portfolio-summary-ts` | Partially (test config points to `api.exchangerate.host` with empty key) | No | No — test/sepolia configs have placeholder values |
| `conf-http-ts` | Yes (Confidential HTTP) | No | Yes (uses vault secrets) |
| `privacy-vault-ts` | Yes (Privacy Vault API) | No | Yes |
| `x402-cre-verified-ts` | Yes (Supabase REST) | No | Yes |

### Key Insight

Since `cre simulate` hits live web APIs and `--broadcast` enables real testnet transactions, the changes fall into two categories:

### 1. Fix broken/placeholder configs so `cre simulate` works out of the box

**`portfolio-summary-ts/config.test.json`** — Currently points to `api.exchangerate.host` with empty API key. Should point to the actual Supabase price feed endpoint:
```json
{
  "supabaseApiUrl": "https://edtudwkmswyjxamkdkbu.supabase.co/functions/v1/api-price-feed",
  "supabaseApiKey": "${SUPABASE_ANON_KEY}",
  "workflows": [...]
}
```

**`portfolio-summary-ts/config.sepolia.json`** — Same fix, currently has empty `supabaseApiKey`.

**`portfolio-summary-ts/test-eurusd.ts`** — Massively over-engineered with fallback logic (170+ lines for a simple price fetch). Simplify since live APIs will actually respond. Remove the deterministic hash fallback and excessive config parsing duplications.

### 2. Add on-chain write capability to workflows that lack it

For the hackathon, `--broadcast` needs at least one on-chain write producing a tx hash. Currently only `dca-trigger-ts` writes on-chain (indirectly via edge function).

**Add EVM write to `x402-cre-verified-ts`** — After fetching consensus-verified prices, write a price attestation on-chain using `EVMClient.write()`. This would:
- Store the verified price hash on a testnet contract
- Produce a real tx hash visible in simulation output
- Demonstrate CRE's consensus → on-chain pipeline

**Add EVM write to `portfolio-summary-ts`** — After aggregating portfolio prices, write a summary hash on-chain as a portfolio snapshot attestation.

### 3. Simplify the simulated edge function

The `simulate-dca-cre` Supabase edge function duplicates the DCA workflow logic for the web UI. This stays as-is (web apps can't run `cre simulate`), but the README should document the one-shot CLI command:

```bash
cre workflow simulate ./incontrol-cre-ts/dca-trigger-ts --target=test-settings --broadcast
```

### Files to change

- `incontrol-cre-ts/portfolio-summary-ts/config.test.json` — real API endpoint
- `incontrol-cre-ts/portfolio-summary-ts/config.sepolia.json` — real API endpoint  
- `incontrol-cre-ts/portfolio-summary-ts/test-eurusd.ts` — simplify, remove fallback hacks
- `incontrol-cre-ts/x402-cre-verified-ts/main.ts` — add EVM write for price attestation
- `incontrol-cre-ts/portfolio-summary-ts/main.ts` — add EVM write for portfolio snapshot

