
# Add FAQ Section to Landing Page

## Overview
Add a Frequently Asked Questions section to the landing page between the Pricing section and the Footer. The FAQ will use an accordion-style design that matches the premium dark theme with gold accents.

## What You'll Get
- An interactive accordion FAQ section with smooth animations
- Common questions about the product, pricing, security, and getting started
- A new navigation link in the header for quick access
- Design consistent with the existing glassmorphism aesthetic

---

## Implementation Details

### New Component: FAQSection.tsx
Create a new component at `src/components/landing/FAQSection.tsx` that includes:
- Section header matching other landing sections (title with gradient text)
- Accordion items using the existing shadcn/ui Accordion component
- Motion animations for scroll-into-view effects (matching FeaturesSection pattern)
- Glass card styling for each FAQ item

### Suggested FAQ Questions
1. **What assets can I track?** - Crypto, stocks, ETFs, real estate, precious metals, and more
2. **Is my data secure?** - SOC 2 Type II compliance, encryption, no third-party sharing
3. **Can I try before subscribing?** - Free tier and demo mode available
4. **How do live prices work?** - Real-time updates for 50+ cryptocurrencies, stocks, gold, silver
5. **Can I cancel anytime?** - Yes, no hidden fees or long-term commitments
6. **What payment methods do you accept?** - Major credit cards through secure payment processing

### Files to Modify

| File | Change |
|------|--------|
| `src/components/landing/FAQSection.tsx` | **Create** - New FAQ component with accordion |
| `src/pages/Landing.tsx` | Add FAQ import, navigation link, and render between Pricing and Footer |

---

## Visual Preview

```text
+----------------------------------------------------------+
|                    Frequently Asked                       |
|                      Questions                            |
|                                                           |
|  +------------------------------------------------------+ |
|  | What assets can I track with InControl?           [+]| |
|  +------------------------------------------------------+ |
|  | Is my financial data secure?                      [+]| |
|  +------------------------------------------------------+ |
|  | Can I try InControl before subscribing?           [+]| |
|  +------------------------------------------------------+ |
|  | How do the live price updates work?               [+]| |
|  +------------------------------------------------------+ |
|  | Can I cancel my subscription anytime?             [+]| |
|  +------------------------------------------------------+ |
+----------------------------------------------------------+
```

---

## Design Notes
- Uses the existing `glass-card` styling for accordion items
- Gold/primary color accent on hover and open states
- Smooth accordion animations using Radix UI primitives
- Framer Motion for scroll-triggered entrance animations
- Responsive layout that works on mobile and desktop
