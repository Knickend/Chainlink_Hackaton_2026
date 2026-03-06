# InControl — AI-Powered Portfolio Intelligence with Chainlink CRE

> A comprehensive personal finance dashboard that combines traditional portfolio management with decentralized oracle technology. InControl uses **Chainlink CRE (Compute Runtime Environment)** for consensus-verified price feeds, automated DCA execution, on-chain attestations, confidential HTTP requests, and AI agent monetization via the x402 payment protocol.

## 🌐 Live Demo

**[https://www.incontrol.finance **  
**(To get access to the pro features. Payment screen is a mockup — no real payment is processed. You can enter any random numbers.).**

---

## 📊 Dashboard Features

### Key Metrics
Real-time financial overview cards displaying **Net Worth**, **Total Debt**, **Monthly Income**, **Net Cash Flow**, and **Yield Breakdown** — each with trend indicators showing month-over-month changes.

### Portfolio Management
Multi-category asset tracking across **crypto**, **stocks**, **banking**, **real estate**, and **commodities**. Each asset tracks quantity, purchase price, current value (via live Chainlink price feeds), and cost basis. Features include:
- Buy and sell recording with automatic P&L calculation
- Live price updates with 24h change indicators
- Allocation pie chart showing portfolio distribution
- Category-level drill-down cards with individual asset details
- Asset search with ticker symbol lookup

### Debt Management
Track debts across six categories: **mortgage**, **credit card**, **student loan**, **personal loan**, **auto loan**, and **medical debt**. Each debt records principal amount, interest rate, and monthly payment. Tools include:
- **Debt Payoff Calculator** — project payoff timelines using avalanche (highest interest first) or snowball (smallest balance first) strategies
- **Debt Optimization** — AI-generated recommendations for consolidation, refinancing, and accelerated payoff
- Multi-currency support (USD, EUR, GBP, CHF)
- Interest cost projections and monthly payment summaries

### Profit & Loss Overview
Detailed P&L tracking per asset with:
- **Realized gains** from completed sell transactions
- **Unrealized gains** calculated from current market prices vs cost basis
- Period selectors (7d, 30d, 90d, 1y, all-time)
- Transaction history with buy/sell/transfer records
- Per-asset drill-down with individual trade details

### Financial Goals
Goal tracking with visual progress bars, including:
- Target amount and current progress
- Monthly contribution tracking
- Months-to-goal projections based on current contribution rate
- Priority levels (high, medium, low) and status indicators
- AI-powered recommendations for reaching goals faster
- Categories: emergency fund, retirement, education, travel, home, investment

### Net Worth & Allocation Charts
- **Net Worth Chart** — historical trend line showing total portfolio value over time using monthly snapshots
- **Allocation Chart** — interactive pie/donut chart showing percentage breakdown by asset category

### Portfolio History
Monthly portfolio snapshots capturing total assets, total debt, net worth, income, and expenses. Enables:
- Month-over-month comparison dialogs
- Long-term performance trend analysis
- Historical asset breakdown per snapshot

### Investment Strategy
AI-generated investment recommendations based on:
- Current free cash flow (income minus expenses)
- Existing portfolio allocation vs target allocation
- Outstanding debts and interest rates
- Financial goals and timelines
- Rebalancing alerts when drift exceeds configured thresholds

### Income & Expenses
- **Recurring income** tracking by source (salary, freelance, dividends, rental, etc.)
- **Recurring and one-time expense** tracking by category (housing, food, transport, etc.)
- Upcoming expenses calendar card
- Multi-currency support with exchange rate conversion

### AI Financial Advisor
Chat-based financial advisor powered by AI with:
- Natural language queries about your portfolio, debts, and goals
- Voice input and text-to-speech output
- Persistent memory across sessions (remembers context from prior conversations)
- Actionable recommendations based on your complete financial picture

### DCA Strategies (Dedicated Page)
Dollar-cost averaging management on a separate `/dca` page:
- Create strategies specifying token pair, amount, frequency, and optional dip-buy thresholds
- Execution history with status tracking
- CRE workflow integration for automated on-chain execution
- Progress cards showing tokens accumulated, total spent, and average entry price

### Customizable Dashboard
- Drag-to-reorder dashboard sections
- Show/hide individual cards via settings panel
- Layout preferences persisted per user in the database

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│  Dashboard · DCA · Settings · AI Advisor · Auth      │
└──────────────────────┬──────────────────────────────┘
                       │ Supabase JS SDK
┌──────────────────────▼──────────────────────────────┐
│               Supabase Backend                       │
│  PostgreSQL · Auth · Edge Functions · Storage        │
│                                                      │
│  Edge Functions:                                     │
│  ├─ api-price-feed        (Chainlink price data)     │
│  ├─ api-portfolio-summary (aggregated stats)         │
│  ├─ api-yield-analysis    (yield optimization)       │
│  ├─ api-debt-strategy     (debt recommendations)     │
│  ├─ api-dca-strategy      (DCA configs & history)    │
│  ├─ execute-dca-order     (DCA trade execution)      │
│  ├─ financial-advisor     (AI chat)                  │
│  ├─ mcp-server            (MCP for AI agents)        │
│  ├─ cre-verified-data     (consensus price proxy)    │
│  ├─ privacy-vault         (address shielding)        │
│  └─ simulate-dca-cre      (CRE simulation proxy)    │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / x402
┌──────────────────────▼──────────────────────────────┐
│            Chainlink CRE Workflows                   │
│  5 TypeScript workflows in incontrol-cre-ts/         │
│                                                      │
│  ├─ x402-cre-verified-ts   (consensus prices → EVM) │
│  ├─ portfolio-summary-ts   (aggregation → EVM)       │
│  ├─ dca-trigger-ts         (DCA execution trigger)   │
│  ├─ conf-http-ts           (confidential HTTP)       │
│  └─ privacy-vault-ts       (address shielding)       │
└──────────────────────┬──────────────────────────────┘
                       │ EVMClient.writeReport()
┌──────────────────────▼──────────────────────────────┐
│          Ethereum Sepolia / Base Sepolia              │
│  PriceAttestationReceiver.sol                        │
│  0xB60D27f47155446783Ee52C743Af78B3996817a5          │
└─────────────────────────────────────────────────────┘
```

---

## ⛓️ Chainlink CRE Workflows

All workflows live in `incontrol-cre-ts/` and use the `@chainlink/cre-sdk`.

| Workflow | Trigger | CRE Capabilities Used | On-Chain Write |
|----------|---------|----------------------|----------------|
| **x402-cre-verified-ts** | Cron (5 min) | `HTTPClient`, `consensusIdenticalAggregation`, `EVMClient.writeReport` | ✅ Price attestation on Sepolia |
| **portfolio-summary-ts** | Cron (5 min) | `HTTPClient`, `consensusMedianAggregation`, `EVMClient.writeReport` | ✅ Portfolio snapshot on Sepolia |
| **dca-trigger-ts** | Cron (5 min) | `HTTPClient`, `consensusIdenticalAggregation`, `consensusMedianAggregation` | ✅ Via edge function |
| **conf-http-ts** | Cron | `HTTPClient` (confidential mode), `consensusIdenticalAggregation` | ❌ Read-only |
| **privacy-vault-ts** | HTTP | `HTTPClient`, `consensusIdenticalAggregation` | ❌ Read-only |

### Workflow Details

**x402-cre-verified-ts** — Fetches live prices from the Supabase price feed API, runs them through consensus (all DON nodes must agree on the response), then writes a price attestation hash on-chain via `EVMClient.writeReport()`. The on-chain record includes the price hash, number of prices, and timestamp.

**portfolio-summary-ts** — Aggregates portfolio market data from the API, applies `consensusMedianAggregation` to derive a consensus median price, and writes a portfolio snapshot attestation on-chain. Includes a standalone `test-eurusd.ts` for quick EUR/USD simulation testing.

**dca-trigger-ts** — Monitors DCA strategy schedules and triggers execution when conditions are met (time-based or dip-buy threshold). Fetches current prices with consensus verification, then calls the `execute-dca-order` edge function to record the trade.

**conf-http-ts** — Demonstrates Chainlink's **Confidential HTTP** capability. In local simulation, behaves like standard `HTTPClient`. In deployed DON execution, request details (headers, URL, body) are kept private per node — other nodes and observers cannot see the raw request. Uses `runtime.getSecret()` to inject API keys from the CRE secrets vault.

**privacy-vault-ts** — Integrates with the **CRE Privacy Vault** to shield wallet addresses. Generates privacy-preserving shielded addresses that map to real addresses without exposing them publicly.

---

## 📜 On-Chain Contract

**PriceAttestationReceiver.sol** — Deployed on Ethereum Sepolia

- **Address**: [`0xB60D27f47155446783Ee52C743Af78B3996817a5`](https://sepolia.etherscan.io/address/0xB60D27f47155446783Ee52C743Af78B3996817a5)
- **Confirmed TX**: [`0x18773e2a89aeef8c28c8d5e504a8a54a3ace0759a6f47ff845e2a2ab2900da3b`](https://sepolia.etherscan.io/tx/0x18773e2a89aeef8c28c8d5e504a8a54a3ace0759a6f47ff845e2a2ab2900da3b)

The contract implements the `IReceiver` interface required by CRE's KeystoneForwarder. It receives ABI-encoded attestation reports containing:
- `priceHash` — keccak256 hash of the consensus-verified price data
- `priceCount` — number of prices included in the attestation
- `timestamp` — when the attestation was created

Each report is stored on-chain and emits an `AttestationReceived` event for off-chain indexing.

---

## 🤖 AI Agent Integration

### MCP Server
The `mcp-server` edge function exposes 5 tools via the **Model Context Protocol (MCP)** for autonomous AI agents (Claude, Cursor, custom agents):

| Tool | Description | x402 Cost |
|------|-------------|-----------|
| `get_price_feed` | Live crypto, forex, commodity prices | $0.005 |
| `get_portfolio_summary` | Aggregated market insights | $0.01 |
| `get_yield_analysis` | Yield optimization strategies | $0.02 |
| `get_debt_strategy` | Debt payoff recommendations | $0.02 |
| `get_dca_strategies` | DCA configs and execution history | $0.01 |

### x402 Payment Protocol
All API endpoints are gated with the **x402 HTTP payment standard**. AI agents pay per-request using USDC on Base Sepolia via a Coinbase Commerce facilitator. The flow:
1. Agent calls an API endpoint without payment → receives `402 Payment Required` with payment instructions
2. Agent includes `X-Payment` header with a signed USDC payment
3. Server verifies payment and returns CRE-verified data

### CRE-Verified Responses
Data returned through the MCP server is backed by Chainlink CRE consensus — multiple DON nodes independently fetch and verify the data before it's served, providing trustworthy data for autonomous agent decision-making.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, Framer Motion |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions, Row-Level Security) |
| **Blockchain** | Chainlink CRE SDK, Solidity, Ethereum Sepolia, Base Sepolia |
| **AI** | Financial advisor chat (LLM-powered), voice commands (Web Speech API), session memory |
| **Protocols** | x402 (HTTP payments), MCP (Model Context Protocol) |

---

## 🚀 CRE Simulation Commands

```bash
# Install CRE CLI: https://docs.chain.link/chainlink-functions/resources/cre-cli

# Simulate the x402 verified price attestation workflow
cd incontrol-cre-ts/x402-cre-verified-ts && bun install
cre workflow simulate . --target=test-settings

# Simulate with on-chain broadcast (writes to Sepolia)
cre workflow simulate . --target=test-settings --broadcast

# Simulate portfolio summary workflow
cd ../portfolio-summary-ts && bun install
cre workflow simulate . --target=test-settings

# Simulate DCA trigger workflow
cd ../dca-trigger-ts && bun install
cre workflow simulate . --target=test-settings

# Simulate confidential HTTP workflow
cd ../conf-http-ts && bun install
cre workflow simulate . --target=test-settings

# Quick EUR/USD price test
cd ../portfolio-summary-ts
cre workflow simulate . --target=test-settings
```

---

## 💻 Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🔐 Environment Variables

### Web Application (`.env`)
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
```

### CRE Workflows (`secrets.*.yaml`)
Each CRE workflow uses a `secrets.yaml` file resolved by the CRE CLI:
```yaml
supabaseAnonKeySecret: <supabase-anon-key>
```

### Edge Functions (Supabase Secrets)
```
SUPABASE_URL (auto-configured)
SUPABASE_ANON_KEY (auto-configured)
SUPABASE_SERVICE_ROLE_KEY (auto-configured)
ELEVENLABS_API_KEY (voice features)
COINBASE_COMMERCE_API_KEY (x402 payments)
```

---

## 📄 License

MIT
