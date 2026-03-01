
## Fix: Privacy Vault Transaction ID Display

### Problem
The `transaction_id` returned by Privacy Vault operations is an internal UUID (e.g., `019ca6f8-e1a7-771e-8521-790bc77429da`), not a blockchain transaction hash. The current code treats it the same as `tx_hash` fields and generates a broken Etherscan link.

### Solution
Separate `transaction_id` from the blockchain hash fields. Display it as a non-clickable reference label instead of linking to a block explorer.

### Technical Changes

**File: `src/components/settings/AgentActivityLog.tsx`**

1. Remove `transaction_id` from the `hashFields` array (revert to the 5 original fields only).
2. After rendering blockchain tx links, check if `result.transaction_id` exists separately.
3. Render it as a static, non-clickable label with the truncated ID (e.g., "Transaction Id: 019ca6...29da") styled consistently but without an anchor tag or external link icon.

This keeps real blockchain hashes clickable while correctly treating the Privacy Vault's async reference ID as informational-only.
