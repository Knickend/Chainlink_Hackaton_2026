

# Add Chainlink CRE Architecture Explainer to DCA Page

## Overview
Add a visual "How It Works" architecture explainer section to the DCA page, designed for hackathon judges to quickly understand the Chainlink CRE integration.

## What Will Be Built

### New Component: `src/components/dca/CREArchitectureExplainer.tsx`
An accordion-style card (always visible, no strategies required) explaining the tech stack:

**Section 1 -- "How Chainlink CRE Powers DCA"**
- Visual flow diagram using styled boxes and arrows (similar to the WorkflowDemo but static/educational)
- Steps: Cron Trigger (every 5 min) -> Strategy Evaluation -> Chainlink Price Feed -> Dip Detection -> On-chain Execution (Base Sepolia)
- Each step has a short description of the Chainlink/CRE component involved

**Section 2 -- "Architecture"**
- Accordion items explaining:
  - **Chainlink CRE SDK** -- workflow orchestration, `cre.Handler()` pattern, consensus aggregation
  - **Chainlink Price Feeds** -- on-chain oracle data for dip detection baseline
  - **Coinbase CDP Agent Wallet** -- non-custodial execution on Base Sepolia
  - **Dip-Buying Logic** -- compares current price vs last execution's `token_price_usd`, multiplier when threshold crossed

**Section 3 -- "Tech Stack"**
- Badge/chip list: Chainlink CRE, Chainlink Data Feeds, Base Sepolia, USDC, Coinbase CDP, TypeScript

### Modified File: `src/pages/DCA.tsx`
- Import and render `CREArchitectureExplainer` below the header, always visible (not gated behind strategies or wallet connection)

## Technical Details

### Component Structure
```text
CREArchitectureExplainer
  |-- Card with "How It Works" header
  |-- Static pipeline visualization (5 colored boxes with arrows)
  |-- Accordion with 4 expandable sections (Architecture details)
  |-- Tech stack badge row
```

### Styling
- Uses existing `glass-card`, `Badge`, `Accordion` components
- Gradient accents matching the app theme
- Icons from lucide-react (Clock, Link, TrendingDown, Wallet, Cpu)

### Files
| Action | File |
|--------|------|
| Create | `src/components/dca/CREArchitectureExplainer.tsx` |
| Modify | `src/pages/DCA.tsx` -- import and render the explainer |
