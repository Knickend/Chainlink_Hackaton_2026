

# Plan: Make `conf-http-ts` Simulatable with `cre simulate`

## Problem

The `conf-http-ts` workflow currently cannot be simulated because:

1. **`vaultDonSecrets` with `{{.apiKey}}` template syntax** — This is a DON-deployed feature. In local simulation, secrets must use `runtime.getSecret()` instead.
2. **`encryptOutput: true`** — Only meaningful in deployed enclaves. In simulation, the response comes back as plaintext.
3. **Empty `owner` field** in all config files — required for `vaultDonSecrets` but irrelevant for simulation.
4. **Missing `secrets-path`** in the `test-settings` target of `workflow.yaml`.
5. **Target endpoint (`fetch-prices`)** requires `SUPABASE_SERVICE_ROLE_KEY` auth but the workflow sends `{{.apiKey}}` which won't resolve in simulation.

## Approach

Refactor `conf-http-ts/main.ts` to use the same pattern as the other working workflows: `runtime.getSecret()` + `HTTPClient` for simulation, while keeping the `ConfidentialHTTPClient` architecture documented for deployed DON execution.

Since the simulator treats `ConfidentialHTTPClient` identically to `HTTPClient`, we can use `ConfidentialHTTPClient` but switch from `vaultDonSecrets`/template injection to `runtime.getSecret()` for the API key.

## Changes

### 1. `incontrol-cre-ts/conf-http-ts/main.ts`
- Remove `vaultDonSecrets` and `{{.apiKey}}` template syntax from `sendRequest()`
- Fetch the API key via `runtime.getSecret({ id: "SUPABASE_ANON_KEY" })` in the handler
- Inject it directly into the request headers
- Remove `encryptOutput: true` (no-op in simulation, add a comment noting it's enabled in production)
- Keep `ConfidentialHTTPClient` as the client class (proves the capability works in simulation)
- Remove the `owner` field from the config schema (not needed for simulation)

### 2. `incontrol-cre-ts/conf-http-ts/config.test.json`
- Remove empty `owner` field
- Keep the `url` pointing to `fetch-prices` endpoint

### 3. `incontrol-cre-ts/conf-http-ts/config.staging.json` and `config.production.json`
- Same cleanup — remove empty `owner`

### 4. Create `incontrol-cre-ts/conf-http-ts/secrets.test.yaml`
- Map `SUPABASE_ANON_KEY` to env var

### 5. `incontrol-cre-ts/conf-http-ts/workflow.yaml`
- Add `secrets-path: "./secrets.test.yaml"` to the `test-settings` target

### Simulation command
```bash
cre workflow simulate ./incontrol-cre-ts/conf-http-ts --target=test-settings -e $(pwd)/incontrol-cre-ts/.env
```

