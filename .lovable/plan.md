

## Redesign Deposit/Withdraw to Use Shielded Addresses

### Problem

The current deposit flow calls `approve()` + `deposit()` on-chain from the signing wallet (`0x8E6B...`), which has no token balance. The signing wallet is only meant for infrastructure operations (PE deployment, token registration). Users fund the vault by sending tokens to their **shielded addresses** — the vault protocol picks them up automatically via its indexer.

The Etherscan screenshot confirms: the deposit tx failed with "ERC20: transfer amount exceeds balance" because the signing wallet tried to transferFrom itself to the vault contract.

### Solution

**Replace the on-chain deposit action with a "Fund via Shielded Address" flow:**

1. **Remove** the entire on-chain deposit logic (approve + deposit + wrap transactions)
2. **Replace with instructions**: show the user their shielded address and tell them to send tokens there from any wallet/exchange
3. The Privacy Vault protocol's indexer will automatically credit the balance

**For withdrawals**: withdrawals already go through the API ticket system, but the redeemed tokens currently go to the signing wallet. Change the withdraw to send tokens to a user-specified destination address (or their shielded address).

### Backend Changes (`supabase/functions/privacy-vault/index.ts`)

**`deposit` action** — Replace the entire on-chain approve+deposit flow with:
- Ensure the user has at least one shielded address (auto-generate one if not)
- Return the shielded address + instructions for sending tokens there
- Keep `ensureTokenRegistered` so the token is ready when funds arrive

**`withdraw` action** — After redeeming the ticket on-chain (which sends tokens to the signing wallet), add a follow-up ERC20 transfer from the signing wallet to a user-specified `recipient` address. If no recipient specified, return the signing wallet balance info.

### Frontend Changes (`src/components/settings/PrivacyVaultSection.tsx`)

**Deposit section** — Replace the amount+token form with:
- Display the user's shielded address (or generate one)
- A "Copy Address" button
- Instructions: "Send tokens to this address from any wallet or exchange. Your vault balance will update automatically within ~30 seconds."
- A "Refresh Balance" button

**Withdraw section** — Add a `recipient` address field so withdrawn tokens are sent to the user's chosen address, not left in the signing wallet.

**"How It Works" update** — Step 2 changes from "Deposit tokens" to "Send tokens to your shielded address"

### Technical Details

Current deposit flow (broken):
```text
signing wallet --approve--> vault contract --transferFrom--> vault  ← FAILS (no balance)
```

New flow:
```text
user's external wallet --send tokens--> shielded address --> vault indexer credits balance
```

For withdrawals:
```text
vault --ticket redemption--> signing wallet --transfer--> user's specified recipient
```

