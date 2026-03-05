

# Plan: Finalize ACE Privacy Vault — Pooled Liquidity Framing

Align the Privacy Vault UI copy and backend code comments with the correct protocol model: the infra wallet (0x8E6B…) is a **protocol liquidity executor + signer**, not a custody wallet for user funds.

## Changes

### 1. `src/components/settings/PrivacyVaultSection.tsx` — UI copy updates

- **Header description** (line 315): Change to "Privacy-preserving token operations via Chainlink ACE. Protocol liquidity is pooled in the vault — the signing wallet executes transactions on behalf of users, not as a custodian."
- **Deposit card description** (line 531): Change from "from the signing wallet's pooled liquidity" → "Protocol liquidity backs all deposits. The executor wallet signs approve + deposit transactions on your behalf."
- **Vault balances info text** (line 516-518): Update to clarify: "Vault balances reflect the Privacy Vault's internal ledger. Protocol liquidity in the executor wallet is pooled across all users — individual user balances are tracked off-chain in the database."
- **How It Works step 2** (line 346): Update desc to mention "Protocol executor deposits from pooled liquidity into the vault on your behalf"
- Add a small info note in the header card explaining the model: "The executor wallet (0x8E6B…) holds protocol liquidity and signs transactions. Your balance is tracked in the vault's private ledger, not as a direct on-chain balance in the executor wallet."

### 2. `supabase/functions/privacy-vault/index.ts` — Code comments

- Add a block comment near the top (after line 29) annotating the architecture:
  ```
  // --- Architecture Note ---
  // The PRIVACY_VAULT_PRIVATE_KEY derives the "infra wallet" (0x8E6B…).
  // This is a protocol liquidity + executor wallet, NOT a custody wallet.
  // It holds pooled inventory backing all user vault balances and signs
  // approve, deposit, withdrawWithTicket, and ERC-20 transfer transactions.
  // Individual user balances are tracked off-chain in the database and
  // on-chain in the Privacy Vault's internal ledger.
  ```
- Add inline comments on the deposit flow (line 591): `// Protocol liquidity: executor wallet signs approve + deposit on behalf of user`
- Add inline comment on withdraw flow (line 805): `// Forward from protocol liquidity pool to user-specified recipient`

### 3. `incontrol-cre-ts/privacy-vault-ts/main.ts` — CRE workflow comment

- Add a comment at the top noting: `// Infra wallet acts as protocol liquidity + executor (not custody)`

No database changes, no new features — purely wording/comments alignment for hackathon reviewers.

