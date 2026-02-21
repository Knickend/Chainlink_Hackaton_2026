

# Add USDC Balance Warning to DCA Strategy Page

## Problem

When creating or viewing DCA strategies, there is no indication if the wallet holds insufficient USDC to cover upcoming executions. Users could create strategies that will fail at execution time due to lack of funds.

## Solution

Add a warning banner on the DCA page that compares the wallet's USDC balance against the total committed amount across active strategies. Also show a contextual warning in the strategy creation form when the entered amount exceeds the current balance.

## Changes

### 1. DCA Page: `src/pages/DCA.tsx`

- Import and use the `useAgentWallet` hook to fetch wallet status
- Calculate total committed USDC across all active strategies (sum of `amount_per_execution` for active strategies, or remaining budget if set)
- If `wallet.balance < totalCommitted`, show a yellow/amber warning banner at the top with the shortfall amount and a suggestion to fund the wallet
- If wallet is not connected, show an info banner suggesting wallet setup

### 2. Strategy Form: `src/components/DCAStrategyForm.tsx`

- Accept an optional `walletBalance` prop (number or null)
- Below the "Amount per execution" input, show an inline warning if the entered amount exceeds the wallet balance
- Example: "Your wallet holds $X.XX USDC. This strategy requires $Y per execution."

### Technical Details

**DCA Page warning logic:**
```text
const totalActiveCommitment = strategies
  .filter(s => s.is_active)
  .reduce((sum, s) => sum + s.amount_per_execution, 0);

const walletBalance = walletStatus.balance ?? 0;
const shortfall = totalActiveCommitment - walletBalance;
```

**Warning banner conditions:**
- Wallet not connected: Info-level banner ("Connect your wallet to enable automated DCA execution")
- Balance insufficient: Warning banner ("Your wallet holds $X USDC but your active strategies require $Y per cycle. Fund your wallet to avoid failed executions.")
- Balance sufficient: No banner shown

**Form inline warning:**
- Shows beneath the amount input when `walletBalance !== null && parseFloat(amount) > walletBalance`
- Text: "Insufficient balance: $X.XX USDC available"
- Yellow/amber text styling consistent with existing skip indicators

| File | Change |
|------|--------|
| `src/pages/DCA.tsx` | Add `useAgentWallet` hook, compute shortfall, render warning banner |
| `src/components/DCAStrategyForm.tsx` | Accept `walletBalance` prop, show inline warning on amount field |

