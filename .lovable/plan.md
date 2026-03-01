

## Add "How It Works" Info Card to Privacy Vault

### What
Add a collapsible visual explainer card directly below the Privacy Vault header card, showing the three-step flow: **Deposit -> Vault Balance -> Private Transfer**.

### Design
A compact card with a horizontal flow diagram using icons and connecting arrows:

```text
+------------------+       +------------------+       +------------------+
|  1. Deposit      |  -->  |  2. Vault Balance |  -->  |  3. Private      |
|  ERC-20 tokens   |       |  Protocol ledger  |       |     Transfer     |
|  from account    |       |  (not on-chain)   |       |  to recipient    |
+------------------+       +------------------+       +------------------+
```

Below the flow, include 2-3 short clarifying notes:
- "Shielded addresses are receive-only -- you cannot send from them"
- "Deposits move tokens from your account address into the protocol's internal ledger"
- "Private transfers happen off-chain via EIP-712 signatures -- no visible on-chain transaction"

The card will use a `Collapsible` (like `CREArchitectureCard`) so it can be collapsed after reading.

### Technical Changes

**File: `src/components/settings/PrivacyVaultSection.tsx`**

1. Import `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` from radix, plus `ChevronDown`, `ArrowRight`, `Info` from lucide-react.
2. Add a new state `const [howOpen, setHowOpen] = useState(false)`.
3. Insert a new `Collapsible` card between the header card (line ~298) and the "Generate Shielded Address" card (line ~300).
4. The card contains:
   - A trigger header with an Info icon, "How It Works" title, and a chevron toggle
   - Three step boxes in a horizontal row (stacking vertically on mobile) connected by arrow icons
   - A list of key notes with muted styling
   - Badge labels for each step (Deposit, Vault, Transfer)

No other files need changes.
