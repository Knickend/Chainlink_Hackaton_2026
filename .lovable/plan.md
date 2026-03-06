

# Update Landing Page — Highlight Agent Wallet, DCA & x402 API Features

## Current State
The landing page features section has 6 generic cards (Multi-Asset Tracking, Live Prices, Allocation, Debt, Strategy, Security). None mention the agent wallet, DCA automation, or x402 agent-to-agent API capabilities.

## Changes

### 1. `src/components/landing/FeaturesSection.tsx` — Update features grid
Replace the current 6 features with 9 features in a 3x3 grid, keeping the best originals and adding the 3 new ones:

**Keep (refreshed copy):**
- Multi-Asset Tracking (Wallet icon)
- Live Price Updates (TrendingUp)
- Debt Management (CreditCard)
- AI Financial Advisor (Brain icon — upgrade from Target/Strategy)
- Secure & Private (Shield)

**Add new:**
- **Agentic Wallet** (Bot icon) — "Connect an on-chain wallet to execute DeFi operations — send USDC, trade tokens, and manage funds directly from your dashboard on Base."
- **Automated DCA** (RefreshCcw icon) — "Set up dollar-cost averaging strategies powered by Chainlink CRE. Automated, consensus-verified trade execution on a schedule you define."
- **x402 Agent APIs** (Zap icon) — "Expose your financial data to autonomous AI agents via x402-monetized APIs. Pay-per-request access with confidential compute and on-chain verification."
- **Portfolio Allocation** (PieChart — keep)

### 2. `src/components/landing/HeroSection.tsx` — Update subheadline
Change the subheadline from the current generic text to something that hints at the agent/DCA capabilities:

> "Track assets, automate DCA strategies, and connect your portfolio to the AI agent economy — powered by Chainlink CRE and on-chain verification."

Update the badge text from "Track All Your Assets in One Place" to "AI-Powered Portfolio Intelligence"

### 3. `src/components/landing/FAQSection.tsx` — Add 2 new FAQ entries
- "What is the Agentic Wallet?" — Explains Base Sepolia wallet, DeFi skills, Pro feature
- "Can AI agents access InControl data?" — Explains x402 protocol, MCP server, pay-per-request model

### 4. No changes to `Landing.tsx` — structure stays the same

