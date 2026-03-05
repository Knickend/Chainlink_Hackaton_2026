

# Fix: Clarify Shielded Address vs Vault Balance Display

## Problem

The shielded address shows "On-chain: 3.000000 USDC" even after the user privately transfers 2.5 USDC inside the vault. The on-chain balance never changes because the executor wallet deposited from pooled liquidity — the shielded address tokens were never moved. This is confusing.

## Solution

Reframe the shielded address section to make it clear that on-chain balances there are **pending/unswept inbound tokens**, not the user's vault balance. The vault ledger balance (already shown separately) is the source of truth.

### Changes in `src/components/settings/PrivacyVaultSection.tsx`

1. **Rename on-chain balance labels** (lines 439-449): Change from `On-chain: X USDC` to `Pending inbound: X USDC` with a muted style, and add a small note: "Tokens here will be swept into the vault by the executor."

2. **Add a disclaimer under the "Your Shielded Addresses" card** (after line 475): A short info line: "On-chain balances on shielded addresses represent pending inbound tokens. Your actual spendable balance is shown in Privacy Vault Balances below."

3. **Update the info paragraph** (line 520): Clarify that on-chain balances on shielded addresses are inbound/pending, not spendable, and the vault ledger is the canonical balance.

No backend or logic changes — purely labeling to eliminate the UX inconsistency.

