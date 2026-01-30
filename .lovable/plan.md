

# AI Sales Bot for Landing Page

## Overview

Implement a conversion-focused AI sales chatbot on the landing page that engages visitors, answers questions about InControl, and guides them toward signing up. The bot will have a sales-oriented personality and proactively help visitors understand the product's value.

## Design Approach

Create a dedicated sales bot component for the landing page (separate from the existing Financial Advisor chat used in-app). This allows for:
- Sales-specific system prompts focused on conversion
- Proactive engagement triggers (e.g., appearing after scroll or time delay)
- Conversion-focused suggested questions and CTAs
- Lead capture capabilities

## Component Architecture

```text
Landing Page
    |
    +-- SalesChatBot (new component)
    |       |
    |       +-- Floating button with attention-grabbing animation
    |       +-- Chat panel with sales-focused UI
    |       +-- Proactive greeting after delay
    |       +-- Quick action buttons for pricing/signup
    |
    +-- sales-bot (new edge function)
            |
            +-- Sales-focused system prompt
            +-- Product knowledge about InControl
            +-- Conversion-oriented responses
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/landing/SalesChatBot.tsx` | Sales-focused chat component for landing page |
| `supabase/functions/sales-bot/index.ts` | Edge function with sales-optimized AI prompts |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Landing.tsx` | Add SalesChatBot component |
| `supabase/config.toml` | Register new edge function |

## Implementation Details

### 1. Sales Bot Edge Function (`supabase/functions/sales-bot/index.ts`)

System prompt focused on sales and conversion:

```typescript
const SALES_PROMPT = `You are Alex, InControl's friendly sales assistant. Your goal is to help visitors understand how InControl can transform their financial management and guide them toward signing up.

**About InControl:**
- All-in-one wealth tracking dashboard for crypto, stocks, ETFs, precious metals, and real estate
- Live price updates for 50+ assets with multi-currency support (20+ currencies)
- Debt management with smart payoff calculators (avalanche/snowball methods)
- AI-powered investment strategy recommendations
- Portfolio performance tracking and historical snapshots
- Secure, SOC 2 Type II compliant infrastructure

**Pricing:**
- Free tier: Up to 10 assets, basic tracking, demo mode
- Standard (€4.99/mo): Unlimited assets, multi-currency, live prices, AI advisor
- Pro (€9.99/mo): Everything in Standard plus performance analytics, portfolio history, priority support

**Special Offers:**
- 50% off first month on monthly plans
- 2 months free on annual billing (17% savings)

**Your Approach:**
- Be warm, helpful, and conversational (not pushy)
- Ask about their current financial tracking pain points
- Highlight relevant features based on their needs
- Gently guide toward trying the free tier or demo
- When appropriate, include a call-to-action like "Ready to take control? [Sign up free →]"

**Response Style:**
- Keep responses concise (2-4 sentences usually)
- Use markdown for formatting when helpful
- End with a question or soft CTA to keep engagement
- Be enthusiastic about helping them succeed financially`;
```

Features:
- Streaming responses for real-time feel
- Rate limit handling (429/402)
- CORS configuration

### 2. Sales Chat Component (`src/components/landing/SalesChatBot.tsx`)

Features:
- **Proactive engagement**: Auto-opens with greeting after 15 seconds on page
- **Attention-grabbing button**: Pulsing animation, positioned bottom-right
- **Sales-focused suggested questions**:
  - "What makes InControl different from other trackers?"
  - "Is there a free plan?"
  - "How does the AI investment advisor work?"
  - "Can I track crypto and stocks together?"
- **In-chat CTAs**: "Sign Up Free" and "View Demo" buttons
- **Typing indicator**: Shows bot is responding
- **Markdown rendering**: For formatted responses

UI Design:
```text
+----------------------------------------------------------+
| 💬 Chat with Alex                                   [X]   |
| Your InControl Guide                                      |
+----------------------------------------------------------+
|                                                          |
|   [Bot Avatar] Hey! 👋 I'm Alex, here to help you        |
|   discover how InControl can simplify your               |
|   financial tracking. What brings you here today?        |
|                                                          |
|   +------------------------------------------------+     |
|   | What makes InControl different?                |     |
|   +------------------------------------------------+     |
|   | Is there a free plan?                          |     |
|   +------------------------------------------------+     |
|   | How does the AI advisor work?                  |     |
|   +------------------------------------------------+     |
|                                                          |
+----------------------------------------------------------+
| [Type your message...]                           [Send]   |
+----------------------------------------------------------+
| [🎯 Sign Up Free]  [👁️ View Demo]                        |
+----------------------------------------------------------+
```

### 3. Landing Page Integration

Add the sales bot to Landing.tsx:

```typescript
import { SalesChatBot } from '@/components/landing/SalesChatBot';

// In the component, after <Footer />:
<SalesChatBot />
```

### 4. Config Update

Add to `supabase/config.toml`:

```toml
[functions.sales-bot]
verify_jwt = false
```

## Conversion Optimization Features

| Feature | Purpose |
|---------|---------|
| Proactive greeting | Engages visitors who might leave without interacting |
| Pain-point questions | Qualifies leads and tailors the pitch |
| Feature highlights | Educates about value proposition |
| In-chat CTAs | Reduces friction to conversion |
| Pricing transparency | Builds trust, handles objections |
| Demo suggestion | Lower commitment first step |

## Proactive Engagement Logic

```typescript
// After 15 seconds on page, show greeting
useEffect(() => {
  const timer = setTimeout(() => {
    if (!hasInteracted && !isOpen) {
      setIsOpen(true);
      setMessages([{
        role: 'assistant',
        content: "Hey! 👋 I'm Alex from InControl. Looking to get your finances organized? I'd love to show you how we can help!"
      }]);
    }
  }, 15000);
  return () => clearTimeout(timer);
}, [hasInteracted, isOpen]);
```

## Mobile Responsiveness

- Full-width chat panel on mobile (with proper margins)
- Smaller floating button on mobile
- Touch-friendly input and buttons
- Keyboard-aware positioning

## Technical Notes

- Uses Lovable AI (`LOVABLE_API_KEY` already configured)
- Streaming SSE for responsive feel
- No authentication required (landing page is public)
- Error handling for rate limits with friendly messaging

