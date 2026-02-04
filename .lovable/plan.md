

## Add AI Agent API Link to Landing Page

This plan adds visibility for the x402 monetized API documentation on the landing page, making it clear that InControl is also available for AI agents.

---

## Changes Overview

We'll add the API documentation link in two strategic locations:

### 1. Navigation Bar (Desktop)

Add an "API" link in the main navigation alongside Features, Pricing, and FAQ:

| Current | After |
|---------|-------|
| Features \| Pricing \| FAQ | Features \| Pricing \| FAQ \| **API** |

This gives developers and AI agent builders immediate visibility.

### 2. Footer Links

Add "API Docs" link in the footer alongside Terms, Privacy, and Contact:

| Current | After |
|---------|-------|
| Terms \| Privacy \| Contact | Terms \| Privacy \| Contact \| **API Docs** |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Landing.tsx` | Add "API" nav link to desktop navigation (line ~49) |
| `src/components/landing/Footer.tsx` | Add "API Docs" link in footer links section |

---

## Visual Preview

**Navigation (Desktop):**
```
[InControl]    Features  Pricing  FAQ  API    [Theme] [Sign in] [Get Started]
```

**Footer:**
```
InControl.finance    Terms | Privacy | Contact | API Docs    © 2026 InControl
```

---

## Technical Details

**Landing.tsx changes:**
- Add a new `<a>` element linking to `/api-docs`
- Follows existing styling: `text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200`

**Footer.tsx changes:**
- Add a new `<Link>` component from react-router-dom to `/api-docs`
- Consistent with existing link styling

---

## Implementation Note

Both links will use internal routing (`/api-docs`) rather than anchor tags, maintaining SPA navigation behavior.

