

# Integrate Chainlink ACE Privacy Vault as Agent Wallet Skill + CRE Workflow

*Built using the latest CRE SDK documentation (TypeScript) from docs.chain.link*

## Overview

Add privacy-preserving token operations to the Agentic Wallet using the Convergence 2026 Privacy Vault API. This includes a CRE workflow that uses `HTTPClient.sendRequest()` with `consensusIdenticalAggregation` for multi-node consensus on privacy API calls, plus new agent skills for shielded addresses and private transfers.

---

## 1. CRE Workflow: `privacy-vault-ts`

**Directory**: `incontrol-cre-ts/privacy-vault-ts/`

Uses the **high-level `sendRequest` pattern** (recommended by CRE docs) with an **HTTP trigger** so the edge function can invoke it on demand.

### `main.ts` (CRE Workflow)

Following the exact patterns from the CRE docs:

```text
Import pattern:
  HTTPCapability, HTTPClient, handler, ok, text,
  consensusIdenticalAggregation, decodeJson,
  type Runtime, type HTTPSendRequester, type HTTPPayload,
  Runner
  from "@chainlink/cre-sdk"
```

**Trigger**: `HTTPCapability.trigger()` with `authorizedKeys` array containing the authorized EVM address from config (type: `KEY_TYPE_ECDSA_EVM`).

**Handler**: `onHttpTrigger` receives `HTTPPayload`, decodes JSON to get `{ action, params }`, then uses `HTTPClient.sendRequest()` to call the Privacy Vault API with `cacheSettings` for single-execution.

**Consensus**: `consensusIdenticalAggregation<string>()` -- all nodes must agree on the same API response.

**POST body encoding**: Per CRE docs, body must be base64-encoded: `Buffer.from(bodyBytes).toString("base64")`.

### Config files

- `config.test.json`: `{ "authorizedEVMAddress": "0x...", "privacyVaultApiUrl": "https://convergence2026-token-api.cldev.cloud", "supabaseCallbackUrl": "..." }`
- `config.production.json`: Same structure with production values
- `workflow.yaml`: Standard CRE settings (test/staging/production)
- `package.json`: Dependencies on `@chainlink/cre-sdk` ^1.1.2
- `tsconfig.json`: Standard CRE config

### Flow

```text
HTTP Trigger (from edge function)
  --> decode payload (action + params)
  --> HTTPClient.sendRequest() to Privacy Vault API
  --> consensusIdenticalAggregation ensures all nodes agree
  --> return verified result as HTTP response
```

---

## 2. Edge Function: `privacy-vault`

**File**: `supabase/functions/privacy-vault/index.ts`

Handles EIP-712 signing and proxies requests to the Privacy Vault API. Actions:

| Action | Description |
|--------|-------------|
| `generate-shielded-address` | Creates a privacy-preserving receiving address |
| `private-transfer` | Sends tokens privately through the vault |
| `balances` | Retrieves private vault balances |
| `transactions` | Lists private transaction history |
| `withdraw` | Initiates a withdrawal ticket |

**EIP-712 Domain** (from the Convergence API docs):
```text
name: "CompliantPrivateTokenDemo"
version: "0.0.1"
chainId: 11155111 (Ethereum Sepolia)
verifyingContract: "0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13"
```

**Signing**: Uses `@noble/secp256k1` via esm.sh for ECDSA signing from a dedicated private key (`PRIVACY_VAULT_PRIVATE_KEY` secret).

### Config addition to `supabase/config.toml`:
```text
[functions.privacy-vault]
verify_jwt = false
```

---

## 3. Database Migration

New table: `privacy_shielded_addresses`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Default gen_random_uuid() |
| user_id | uuid NOT NULL | References auth.users |
| shielded_address | text NOT NULL | The generated address |
| label | text | Optional friendly name |
| created_at | timestamptz | Default now() |

**RLS policies**: Enable RLS. Users can SELECT and INSERT only their own rows (`auth.uid() = user_id`).

---

## 4. New Secret Required

- **`PRIVACY_VAULT_PRIVATE_KEY`**: A hex-encoded secp256k1 private key (64 hex chars). The corresponding Ethereum address is used as `account` in Privacy Vault API calls.

---

## 5. Agent Wallet Integration

### Modify `supabase/functions/agent-wallet/index.ts`

Add two new actions to the main switch:

- **`privacy-shielded-address`**: Invokes `privacy-vault` edge function with action `generate-shielded-address`. Logs to `agent_actions_log`.
- **`privacy-transfer`**: Invokes `privacy-vault` edge function with action `private-transfer`. Validates spending limits. Logs action + sends email notification.

### Modify `src/hooks/useAgentWallet.ts`

Add methods:
- `generateShieldedAddress()` -- calls `privacy-shielded-address` action
- `privateTransfer(amount, recipient, token)` -- calls `privacy-transfer` action
- `getPrivacyBalances()` -- calls `privacy-balances` action

---

## 6. UI Updates

### Modify `src/components/settings/AgentSection.tsx`

Add two new skills to the `SKILLS` array:
- `{ id: 'privacy-address', label: 'Shielded Address', description: 'Generate privacy-preserving addresses via Chainlink ACE', icon: Shield }`
- `{ id: 'privacy-transfer', label: 'Private Transfer', description: 'Send tokens privately through the ACE Privacy Vault', icon: Shield }`

### New component: `src/components/settings/PrivacyVaultSection.tsx`

Displayed in the Agent tab when wallet is connected:
- Button to generate a new shielded address
- List of existing shielded addresses (from DB)
- Privacy Vault balance display
- Private transfer form (recipient shielded address, token, amount)
- Network badge: "Ethereum Sepolia" (clearly distinct from Base Sepolia)

---

## File Summary

| Action | File |
|--------|------|
| Create | `incontrol-cre-ts/privacy-vault-ts/main.ts` |
| Create | `incontrol-cre-ts/privacy-vault-ts/config.test.json` |
| Create | `incontrol-cre-ts/privacy-vault-ts/config.production.json` |
| Create | `incontrol-cre-ts/privacy-vault-ts/workflow.yaml` |
| Create | `incontrol-cre-ts/privacy-vault-ts/package.json` |
| Create | `incontrol-cre-ts/privacy-vault-ts/tsconfig.json` |
| Create | `supabase/functions/privacy-vault/index.ts` |
| Create | `src/components/settings/PrivacyVaultSection.tsx` |
| Create | DB migration for `privacy_shielded_addresses` table |
| Modify | `supabase/functions/agent-wallet/index.ts` |
| Modify | `src/hooks/useAgentWallet.ts` |
| Modify | `src/components/settings/AgentSection.tsx` |
| Modify | `supabase/config.toml` |
| Secret | `PRIVACY_VAULT_PRIVATE_KEY` |

