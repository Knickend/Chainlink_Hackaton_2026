

## Privacy Vault UI Improvements

### 1. Move USDC balance from Shielded Address to Privacy Vault Balances

The shielded address card currently shows on-chain ERC-20 balances (like "On-chain: 0.500000 USDC"). However, USDC deposited into the Convergence protocol is no longer an on-chain ERC-20 balance on the shielded address -- it's a vault-internal balance. The on-chain ERC-20 balance query returns stale data because the tokens have been transferred to the vault contract.

**Fix**: After a successful deposit, the on-chain balance of the shielded address should drop to 0 for that token. The issue is likely that the `onchain-erc20-balance` call is checking the shielded address, but the USDC was deposited from the vault's main account (derived from `PRIVACY_VAULT_PRIVATE_KEY`), not the shielded address. The shielded address may genuinely hold 0.5 USDC if tokens were sent there directly.

Since the screenshot shows the vault balance as 500000 (raw units) for the same token, this is the same 0.5 USDC appearing in both places. The shielded address on-chain balance is correct (tokens sitting on that address on-chain). The vault balance is the protocol's internal ledger. These are **different** balances -- but the user wants clarity.

**Action**: Add a note under shielded address on-chain balances clarifying these are tokens held directly on-chain (not in the vault). No data change needed -- these are genuinely different balances.

### 2. Format Privacy Vault Balances with token symbol and decimal conversion

Currently the vault balances display shows raw contract addresses and raw integer amounts (e.g., `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` with `500000`).

**Fix** in `PrivacyVaultSection.tsx`:
- Map the token contract address to its human-readable symbol using `COMMON_TOKENS` lookup
- Apply decimal conversion: USDC uses 6 decimals, so `500000` becomes `0.500000 USDC`; LINK/WETH use 18 decimals
- Display as: `0.500000 USDC` instead of raw address + raw integer

The balance rendering code at lines 377-382 will be updated to resolve the token address to a symbol and divide the raw amount by `10^decimals`.

### 3. Add transaction hash links to the Activity Log

Currently there is no activity/transaction log section in the Privacy Vault UI. The `agent_actions_log` table stores deposit and transfer actions with their results (which include tx hashes).

**Fix**: Add an "Activity Log" card that:
- Queries `agent_actions_log` for privacy-vault related actions (`deposit`, `private-transfer`) for the current user
- Displays each entry with timestamp, action type, status, and clickable Etherscan links for any tx hashes found in the `result` JSON column (`wrap_tx`, `approve_tx`, `deposit_tx`)
- Shows the most recent 10 entries

### Technical Details

**File: `src/components/settings/PrivacyVaultSection.tsx`**

1. **Token decimal mapping** -- Add a helper constant:
```text
const TOKEN_DECIMALS: Record<string, { symbol: string; decimals: number }> = {
  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238': { symbol: 'USDC', decimals: 6 },
  '0x779877A7B0D9E8603169DdbD7836e478b4624789': { symbol: 'LINK', decimals: 18 },
  '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9': { symbol: 'WETH', decimals: 18 },
  '0x0000000000000000000000000000000000000000': { symbol: 'SepoliaETH', decimals: 18 },
};
```

2. **Balance rendering** (lines 377-382) -- Replace raw display with:
   - Resolve `b.token` address to symbol via `TOKEN_DECIMALS` (fallback: truncated address)
   - Convert `b.amount` by dividing by `10^decimals` and format to 6 decimal places
   - Show symbol next to the formatted amount

3. **Activity Log card** -- Add a new section after the Private Transfer card:
   - State: `activityLog` array, fetched from `agent_actions_log` where `action_type` is `'privacy-vault-deposit'` or similar
   - Query on mount alongside other data fetches
   - Each row shows: date, action type badge, status badge, and Etherscan links extracted from `result` JSON (fields: `wrap_tx`, `approve_tx`, `deposit_tx`)
   - Use `ExternalLink` icon for clickable tx hash links

