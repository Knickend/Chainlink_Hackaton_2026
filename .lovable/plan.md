

# Update README.md — Comprehensive Project & CRE Documentation

Full rewrite of `README.md` with two user-requested modifications applied:
1. **No "Moltbook" references** — use "InControl" throughout
2. **Detailed dashboard features section** covering all financial modules

## Structure

### 1. Header
- **InControl — AI-Powered Portfolio Intelligence with Chainlink CRE**
- One-paragraph summary (no Moltbook mention)

### 2. Live Demo
- Link to `https://wealth-whisperer-206.lovable.app`

### 3. Dashboard Features (detailed)
Describe each dashboard section visible in `Index.tsx`:

| Feature | Description |
|---------|-------------|
| **Key Metrics** | Net Worth, Total Debt, Monthly Income, Net Cash Flow, Yield Breakdown — all with trend indicators |
| **Portfolio Management** | Assets by category (crypto, stocks, banking, real estate, commodities), buy/sell tracking, live prices via Chainlink feeds, allocation chart |
| **Debt Management** | Multi-currency debt tracking (mortgage, credit card, student loan, personal, auto, medical), interest rate monitoring, monthly payment tracking, debt payoff calculator, optimization strategies |
| **P&L Overview** | Profit & Loss per asset with realized/unrealized gains, transaction history, period selectors |
| **Financial Goals** | Goal tracking with progress bars, months-to-goal projections, status indicators, AI recommendations |
| **Net Worth & Allocation Charts** | Historical net worth chart, pie chart allocation breakdown |
| **Portfolio History** | Monthly snapshots, performance tracking over time |
| **Investment Strategy** | AI-generated investment recommendations based on free cash flow, debts, and goals |
| **Income & Expenses** | Recurring and one-time income/expense tracking, upcoming expenses card |
| **AI Financial Advisor** | Chat-based advisor with voice commands, memory across sessions |
| **DCA Strategies** | Dollar-cost averaging setup and execution tracking (separate `/dca` page) |
| **Customizable Layout** | Drag-to-reorder sections, show/hide cards, persistent layout preferences |

### 4. Architecture Overview
ASCII diagram: Frontend → Supabase Backend → Chainlink CRE Workflows

### 5. Chainlink CRE Workflows
Table of 5 workflows with triggers, capabilities, on-chain write status

### 6. On-Chain Contract
- `PriceAttestationReceiver.sol` on Sepolia at `0xB60D27f47155446783Ee52C743Af78B3996817a5`
- Confirmed TX hash

### 7. AI Agent Integration
- MCP Server, x402 payment protocol, CRE-verified data

### 8. Tech Stack
- Frontend, backend, blockchain, AI tools

### 9. Simulation Commands
- `cre workflow simulate` examples

### 10. Local Development
- npm install + dev instructions

### 11. Environment Variables
- List required vars without values

## File to change
- **`README.md`** — Full rewrite

