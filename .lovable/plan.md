

## Build x402 Monetized API Infrastructure

Now that we have your Base wallet address (`0x72F91fb57820A2c5078bECE60C945Fc2981F785b`), this plan implements the complete x402 payment infrastructure for AI agent monetization.

---

## What We're Building

A set of paywalled API endpoints that AI agents can access by paying USDC micropayments on Base blockchain. When an agent calls your API without payment, they receive a `402 Payment Required` response with payment instructions. Once they pay, they get access to financial insights.

---

## Implementation Steps

### Step 1: Add Wallet Secret

Add `X402_WALLET_ADDRESS` secret with value:
```
0x72F91fb57820A2c5078bECE60C945Fc2981F785b
```

### Step 2: Create Shared x402 Utility

**New file:** `supabase/functions/_shared/x402.ts`

Shared module for payment verification:
- `createPaymentChallenge()` - Generates 402 response with USDC payment details
- `verifyPayment()` - Validates X-Payment header via Coinbase facilitator
- Constants for Base USDC contract address and facilitator URL

### Step 3: Create Monetized API Endpoints

| Endpoint | Price | What It Returns |
|----------|-------|-----------------|
| `api-portfolio-summary` | $0.01 | Aggregated market insights and trends |
| `api-yield-analysis` | $0.02 | Yield optimization strategies |
| `api-debt-strategy` | $0.02 | Debt payoff recommendations |
| `api-price-feed` | $0.005 | Live crypto/stock/forex prices |

Each endpoint:
1. Checks for `X-Payment` header
2. If missing → returns 402 with payment challenge
3. If present → verifies via facilitator → serves data

### Step 4: Update Config

Add function configurations to `supabase/config.toml` with `verify_jwt = false` for public agent access.

### Step 5: Create API Documentation Page

**New file:** `src/pages/ApiDocs.tsx`

Public documentation showing:
- Available endpoints and pricing
- x402 protocol integration guide
- Code examples for AI agents
- Your wallet address for direct payments

### Step 6: Add Route

Update `src/App.tsx` to add `/api-docs` route.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/_shared/x402.ts` | Create |
| `supabase/functions/api-portfolio-summary/index.ts` | Create |
| `supabase/functions/api-yield-analysis/index.ts` | Create |
| `supabase/functions/api-debt-strategy/index.ts` | Create |
| `supabase/functions/api-price-feed/index.ts` | Create |
| `supabase/config.toml` | Modify |
| `src/pages/ApiDocs.tsx` | Create |
| `src/App.tsx` | Modify |

---

## How It Works (Agent Flow)

```
AI Agent                         Your API                    Base Chain
   │                                │                            │
   │── GET /api-portfolio-summary ──>│                            │
   │                                │                            │
   │<── 402 Payment Required ───────│                            │
   │    {                           │                            │
   │      payTo: "0x72F9...",       │                            │
   │      amount: "10000",          │                            │
   │      asset: "USDC"             │                            │
   │    }                           │                            │
   │                                │                            │
   │── GET + X-Payment header ──────>│                            │
   │                                │── Verify via facilitator ──>│
   │                                │<── Payment confirmed ───────│
   │<── 200 OK + Data ──────────────│                            │
   │                                │                            │
   └────────────────────────────────┴────────────────────────────┘
```

---

## Revenue Tracking

All payments go directly to your wallet. You can track incoming USDC on:
- Base Explorer: `basescan.org/address/0x72F91fb57820A2c5078bECE60C945Fc2981F785b`
- Your Base app wallet

---

## After Implementation

1. Test endpoints with curl (will return 402)
2. API docs available at `/api-docs`
3. Share endpoints with AI agent developers
4. USDC accumulates in your Base wallet

