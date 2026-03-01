

## Add Transaction Hash Links to Activity Log

### What Changes

**File: `src/components/settings/AgentSection.tsx`** (lines 322-346)

Update the Activity Log card to extract and display transaction hash links from each log entry's `result` field.

### Details

The `log.result` object may contain various tx hash fields depending on the action type:
- `tx_hash` -- for sends, trades, fund operations
- `wrap_tx`, `approve_tx`, `deposit_tx` -- for privacy vault deposits
- `transfer_tx` -- for private transfers

For each log entry, extract all tx hashes found in `result` and render them as clickable Etherscan links below the action description. Use the `ExternalLink` icon from lucide-react.

The links will point to:
- Base transactions: `https://basescan.org/tx/{hash}` for agent wallet actions (send, trade, fund)
- Sepolia transactions: `https://sepolia.etherscan.io/tx/{hash}` for privacy vault actions

To distinguish, check if `action_type` contains "privacy" -- if so, use Sepolia explorer; otherwise use Base explorer.

Each hash link will show a truncated hash (first 6 + last 4 chars) with an external link icon, rendered in a row below the existing params line.

