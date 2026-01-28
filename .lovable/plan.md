

# Create InControl Landing Page

## Overview
Build a professional marketing landing page for InControl.finance that showcases the product's features, pricing tiers, and drives users to sign up. The landing page will follow the existing premium dark theme with glassmorphism effects and gold accents.

## Page Structure

### Sections
1. **Hero Section** - Bold headline, value proposition, CTA buttons
2. **Features Grid** - Highlight key capabilities (asset tracking, debt management, live prices, investment strategy)
3. **How It Works** - 3-step visual flow
4. **Pricing Section** - Display Free, Standard, and Pro tiers
5. **Testimonials/Social Proof** - Trust indicators
6. **Footer** - Links, domain branding

### Hero Content
- **Headline**: "Take Control of Your Financial Future"
- **Subheadline**: "Track assets, manage debt, and build wealth across crypto, stocks, and precious metals"
- **CTAs**: "Get Started Free" and "View Demo"

### Features to Highlight
| Icon | Feature | Description |
|------|---------|-------------|
| Wallet | Multi-Asset Tracking | Track crypto, stocks, real estate, and precious metals in one place |
| TrendingUp | Live Price Updates | Real-time prices for 50+ cryptocurrencies, stocks, gold, and silver |
| PieChart | Portfolio Allocation | Visual breakdown of your wealth distribution |
| CreditCard | Debt Management | Track debts and calculate optimal payoff strategies |
| Target | Investment Strategy | AI-powered allocation recommendations based on your goals |
| Shield | Secure & Private | Your data is encrypted and never shared |

## Technical Implementation

### Route Structure
- `/` - Landing page (new)
- `/app` - Dashboard (current Index.tsx moved)
- `/auth` - Authentication (unchanged)

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Landing.tsx` | CREATE | New landing page component |
| `src/components/landing/HeroSection.tsx` | CREATE | Hero section with CTAs |
| `src/components/landing/FeaturesSection.tsx` | CREATE | Features grid |
| `src/components/landing/PricingSection.tsx` | CREATE | Pricing tiers |
| `src/components/landing/Footer.tsx` | CREATE | Footer component |
| `src/App.tsx` | MODIFY | Add `/app` route for dashboard, `/` for landing |
| `index.html` | MODIFY | Update branding to InControl |
| `src/pages/Auth.tsx` | MODIFY | Update branding to InControl |
| `src/components/DemoBanner.tsx` | MODIFY | Update to InControl |

### Design Specifications

**Hero Section**
- Full viewport height with ambient glow effects
- Animated entrance using framer-motion
- Gradient text for "InControl" branding
- Mock dashboard preview image/illustration

**Features Grid**
- 3x2 responsive grid (stacks on mobile)
- Glass-card styling for each feature
- Icon with gold/primary color accent
- Subtle hover animations

**Pricing Cards**
- Reuse existing SubscriptionDialog pricing data
- Highlight recommended tier
- Gold border/glow for Pro tier
- Monthly pricing with feature list

**Footer**
- Minimal dark design
- InControl.finance branding
- Links: Privacy, Terms, Contact
- Copyright notice

### Navigation Flow
```text
Landing (/)
    |
    +---> "Get Started" --> Auth (/auth?signup=true)
    |
    +---> "View Demo" --> Dashboard in demo mode (/app)
    |
    +---> "Sign In" --> Auth (/auth)
```

### Animation Strategy
- Staggered fade-in for feature cards
- Smooth scroll between sections
- Subtle parallax on hero background
- Hover effects on CTAs and cards

## Branding Updates (InControl)

All instances of "WealthManager" will be replaced:
- `index.html`: Title, meta tags, OG tags
- `Auth.tsx`: Logo in form header
- `DemoBanner.tsx`: Welcome message
- `Index.tsx` (becoming `/app`): Header logo

## Mobile Responsiveness
- Hero: Stack CTA buttons vertically
- Features: Single column grid
- Pricing: Horizontal scroll or stacked cards
- Navigation: Hamburger menu if needed
