

# Add CRE Confidential Compute Option to API Endpoints

## Overview

Integrate Chainlink CRE's Confidential HTTP capability into InControl, allowing users (and AI agents) to opt into having API calls executed confidentially. The response body is AES-GCM encrypted inside the CRE enclave -- only the caller with the decryption key can read the data.

This adds:
1. A new CRE workflow (`conf-http-ts`) using `ConfidentialHTTPClient` with `encryptOutput: true`
2. A new edge function (`api-conf-price-feed`) that proxies requests through the confidential pipeline
3. A "Confidential Mode" toggle on the API Docs page with decryption instructions
4. A new tab in the API Docs integration guide explaining the confidential compute flow

## Architecture

```text
  Agent/User
      |
      | (x402 payment + X-Confidential: true)
      v
  Edge Function (api-conf-price-feed)
      |
      | Triggers CRE Confidential Workflow
      v
  CRE Enclave (ConfidentialHTTPClient)
      |
      | encryptOutput: true
      | vaultDonSecrets: [AES key]
      v
  Encrypted response (nonce || ciphertext || tag)
      |
      | returned as base64 in JSON
      v
  Agent decrypts locally with shared AES key
```

## Changes

### 1. New CRE Workflow: `incontrol-cre-ts/conf-http-ts/`

Create a new CRE workflow directory with:

**`main.ts`** -- Uses `ConfidentialHTTPClient` and `consensusIdenticalAggregation` (following the conf-http-demo pattern):
- Accepts config with `url`, `schedule`, `owner`
- Uses `vaultDonSecrets` for API key and AES encryption key
- Sets `encryptOutput: true` so the response body is AES-GCM encrypted inside the enclave
- Returns `{ bodyBase64: string }` containing the encrypted payload

**`package.json`** -- Dependencies: `@chainlink/cre-sdk ^1.1.2`

**`workflow.yaml`** -- Staging and production targets with secrets path

**`config.staging.json`** / **`config.production.json`** -- URL pointing to InControl's price feed endpoint, schedule for periodic refresh

**`tsconfig.json`** -- Standard CRE TypeScript config

### 2. New Edge Function: `supabase/functions/api-conf-price-feed/index.ts`

An x402-gated endpoint ($0.08/request, premium for confidentiality) that:
- Checks for `X-Payment` header (standard x402 flow)
- Fetches price data from the existing `price_cache` table
- Returns the data wrapped with a `confidential` flag and instructions
- In production, this would invoke the CRE confidential workflow; for now it returns data with confidentiality metadata and a simulated encrypted payload structure
- Includes `decryption_instructions` in the response so agents know how to handle the encrypted output

### 3. UI Changes: `src/pages/ApiDocs.tsx`

**Add a "Confidential" tab** to the integration guide tabs alongside the existing GET, POST, TypeScript, Python, CRE tabs:
- Explains what confidential compute means (data encrypted inside CRE enclave)
- Shows the endpoint and pricing ($0.08)
- Provides curl examples with the confidential endpoint
- Documents the decryption flow (AES-GCM with shared key)
- Links to CipherTools for manual decryption testing

**Add a new endpoint card** to the endpoints array:
- Name: "Confidential Price Feed"
- Path: `/api-conf-price-feed`
- Price: $0.08
- Description: "CRE confidential compute -- encrypted response, enclave-protected"

**Add a "Confidential Compute" overview card** to the top section (alongside Micropayments, Trustless, Agent-Ready):
- Icon: Lock/ShieldCheck
- Explains that responses can be encrypted via CRE enclaves

### 4. Update API Docs Overview Section

Add a 4th card to the overview grid highlighting the confidential compute option with a lock icon, explaining that agents can opt for encrypted responses where data never leaves the CRE enclave unencrypted.

## Technical Details

### CRE Confidential HTTP Pattern (from conf-http-demo)

Key imports and usage:
- `ConfidentialHTTPClient` -- replaces `HTTPClient` for confidential requests
- `ConfidentialHTTPSendRequester` -- type for the send function
- `encryptOutput: true` -- encrypts the HTTP response body with AES-GCM using a vault secret
- `vaultDonSecrets` -- resolves secrets from the DON vault (never in config or code)
- `consensusIdenticalAggregation<T>()` -- used for string/encrypted payloads (not median)

### File Summary

| Action | File |
|--------|------|
| Create | `incontrol-cre-ts/conf-http-ts/main.ts` |
| Create | `incontrol-cre-ts/conf-http-ts/package.json` |
| Create | `incontrol-cre-ts/conf-http-ts/tsconfig.json` |
| Create | `incontrol-cre-ts/conf-http-ts/workflow.yaml` |
| Create | `incontrol-cre-ts/conf-http-ts/config.staging.json` |
| Create | `incontrol-cre-ts/conf-http-ts/config.production.json` |
| Create | `supabase/functions/api-conf-price-feed/index.ts` |
| Modify | `src/pages/ApiDocs.tsx` -- add confidential endpoint card, tab, and overview card |

