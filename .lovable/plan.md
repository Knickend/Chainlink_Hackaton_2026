

# Plan: Consolidate to Single Activity Log

## Problem
There are two separate activity logs visible in the Agent tab:
1. **AgentActivityLog** in `AgentSection.tsx` (line 314) — shows agent wallet actions (send, trade, fund)
2. **Inline Activity Log** in `PrivacyVaultSection.tsx` (lines 836-901) — shows privacy vault transactions

Both show similar data with overlapping entries, creating confusion.

## Solution

Remove the inline activity log from `PrivacyVaultSection.tsx` and keep only the unified `AgentActivityLog` component in `AgentSection.tsx`. The `AgentActivityLog` already handles both wallet and privacy actions (it routes privacy actions to Sepolia Etherscan and others to Basescan).

### Changes

1. **`src/components/settings/PrivacyVaultSection.tsx`**
   - Delete the entire "Activity Log" card block (lines 836-901)
   - Remove the `activityLog` state, `fetchActivityLog` callback, and its `useEffect` (the fetch logic for the separate privacy log — around lines 145-175)
   - Remove unused imports (`Clock`, `ExternalLink`, `Badge`) if no longer referenced

2. **`src/components/settings/AgentSection.tsx`**
   - Move the `AgentActivityLog` render block (lines 311-316) **below** the Privacy Vault section (after line 325) so it appears at the bottom of the entire Agent tab as a unified log for all actions

No backend or data changes needed — both logs already pull from the same `agent_action_logs` table.

