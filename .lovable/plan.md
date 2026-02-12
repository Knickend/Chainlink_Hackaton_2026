

## Agent Skills: DeFi Actions via Coinbase Agentic Wallet (Pro Feature)

This plan adds a Coinbase Agentic Wallet integration that lets Pro users authorise and execute DeFi actions (send USDC, trade tokens, fund wallet) through both a dedicated Settings tab and the existing Financial Advisor chat.

---

### Architecture Overview

The Coinbase Agentic Wallet uses the `awal` CLI and agent-wallet-skills system. Since InControl is a browser-based app (not a CLI agent), the integration works through a backend edge function that wraps `awal` operations and a frontend authorization/approval layer.

```text
+------------------+       +---------------------+       +------------------+
|   Settings UI    |       |  Edge Function      |       |  Coinbase CDP    |
|  (wallet setup,  | ----> |  agent-wallet/      | ----> |  Agentic Wallet  |
|   skill toggles, |       |  index.ts           |       |  API             |
|   spending limits)|      |                     |       |                  |
+------------------+       +---------------------+       +------------------+
        |                          ^
        v                          |
+------------------+               |
| Financial Advisor| ---- tool calls (send, trade, fund)
| Chat (Pro users) |
+------------------+
```

---

### Phase 1: Database and Backend

**1.1 New table: `agent_wallets`**

Stores each user's agentic wallet configuration and authorization state.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| user_id | uuid (unique, not null) | Owner |
| wallet_email | text | Email used for wallet auth |
| is_authenticated | boolean | Whether wallet OTP is verified |
| enabled_skills | text[] | e.g. ['send-usdc', 'trade', 'fund'] |
| spending_limit_per_tx | numeric | Max USDC per single transaction |
| spending_limit_daily | numeric | Max USDC per 24h window |
| daily_spent | numeric | Running total for current day |
| daily_reset_at | timestamptz | When daily counter resets |
| created_at / updated_at | timestamptz | Timestamps |

RLS: users can only read/write their own row.

**1.2 New table: `agent_actions_log`**

Audit trail for every DeFi action the agent executes.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| user_id | uuid | |
| action_type | text | 'send', 'trade', 'fund' |
| params | jsonb | Action parameters (amount, recipient, tokens) |
| status | text | 'pending', 'approved', 'executed', 'rejected', 'failed' |
| result | jsonb | Response from Coinbase API |
| created_at | timestamptz | |

RLS: users can only read their own logs.

**1.3 New edge function: `agent-wallet`**

Handles all wallet operations server-side using the CDP API (not the CLI). Requires a `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` secret.

Operations:
- `POST /agent-wallet` with `{ action: 'auth-start', email }` -- initiates OTP
- `POST /agent-wallet` with `{ action: 'auth-verify', email, otp }` -- completes auth
- `POST /agent-wallet` with `{ action: 'status' }` -- returns wallet balance and auth state
- `POST /agent-wallet` with `{ action: 'send', amount, recipient }` -- send USDC
- `POST /agent-wallet` with `{ action: 'trade', amount, from, to }` -- trade tokens
- `POST /agent-wallet` with `{ action: 'fund', amount }` -- fund via onramp

Each mutating action checks:
1. User is authenticated (Supabase JWT)
2. User is Pro subscriber (query subscriptions table)
3. Wallet is authenticated (agent_wallets.is_authenticated)
4. Skill is enabled (agent_wallets.enabled_skills)
5. Spending limit not exceeded (per-tx and daily)

---

### Phase 2: Settings UI -- Agent Tab

**2.1 New Settings tab: "Agent"**

Add a 4th tab to `Settings.tsx` (Profile | Subscription | Security | **Agent**).

Non-Pro users see a teaser card (blurred preview with "Upgrade to Pro" CTA), consistent with the existing gating pattern.

**2.2 `AgentSection` component** (new file: `src/components/settings/AgentSection.tsx`)

For Pro users, the tab contains:

- **Wallet Connection Card**
  - Email input + "Connect Wallet" button
  - OTP verification flow (6-digit code)
  - Connected state shows wallet address and balance
  - "Disconnect" option

- **Skills Configuration Card**
  - Toggle switches for each skill: Send USDC, Trade Tokens, Fund Wallet
  - Each toggle has a brief description of what it authorises

- **Spending Limits Card**
  - Per-transaction limit (numeric input, default $50)
  - Daily limit (numeric input, default $200)
  - Current daily usage progress bar

- **Activity Log Card**
  - Recent agent actions table from `agent_actions_log`
  - Shows action type, amount, status, timestamp
  - Expandable rows for full details

**2.3 `useAgentWallet` hook** (new file: `src/hooks/useAgentWallet.ts`)

Manages wallet state: connect, verify OTP, update skills/limits, fetch logs. Calls the `agent-wallet` edge function.

---

### Phase 3: Financial Advisor Chat Integration

**3.1 Extend `useVoiceActions.ts`** with new DeFi action cases:

- `SEND_USDC` -- "Send 10 USDC to vitalik.eth"
- `TRADE_TOKENS` -- "Swap 5 USDC for ETH"
- `FUND_WALLET` -- "Add $50 to my agent wallet"

All three require confirmation (`needsConfirmation: true`) before execution.

**3.2 Update `parse-voice-command` edge function**

Add new action types to the AI intent parser so natural language commands are routed to DeFi skills.

**3.3 Approval flow in chat**

When the advisor detects a DeFi intent:
1. Shows a structured confirmation card in-chat: "Send 10 USDC to vitalik.eth on Base -- Approve / Reject"
2. On approve, calls the `agent-wallet` edge function
3. Shows result (tx hash, success/failure) inline
4. Logs to `agent_actions_log`

**3.4 Advisor context injection**

Add wallet status (connected, balance, enabled skills) to the portfolio summary sent to the financial advisor, so it can proactively suggest DeFi actions.

---

### Phase 4: Security and Guardrails

- All DeFi actions require explicit user approval in the chat UI (no fully autonomous execution initially)
- Spending limits enforced server-side in the edge function
- Every action is logged with full parameters and results
- Wallet authentication uses Coinbase's email OTP (no private keys stored in InControl)
- Skills can be individually disabled at any time from Settings
- Pro subscription status is verified server-side before any action

---

### Required Secrets

Two new secrets need to be configured:
- `CDP_API_KEY_ID` -- Coinbase Developer Platform API key name
- `CDP_API_KEY_SECRET` -- Coinbase Developer Platform API key secret

---

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/settings/AgentSection.tsx` | Create -- wallet setup, skill toggles, limits, activity log |
| `src/components/settings/AgentTeaser.tsx` | Create -- blurred teaser for non-Pro users |
| `src/hooks/useAgentWallet.ts` | Create -- wallet state management hook |
| `supabase/functions/agent-wallet/index.ts` | Create -- backend for all wallet operations |
| `src/pages/Settings.tsx` | Modify -- add Agent tab |
| `src/hooks/useVoiceActions.ts` | Modify -- add SEND_USDC, TRADE_TOKENS, FUND_WALLET actions |
| `src/components/FinancialAdvisorChat.tsx` | Modify -- add DeFi approval cards and wallet context |
| `supabase/functions/parse-voice-command/index.ts` | Modify -- add DeFi intent types |
| DB migration | Create agent_wallets and agent_actions_log tables with RLS |

