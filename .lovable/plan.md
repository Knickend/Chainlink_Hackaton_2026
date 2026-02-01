
# Add Beta Disclaimer Banner

## Overview

Add a prominent but non-intrusive beta disclaimer banner to inform visitors that InControl is currently in beta testing. The banner will be positioned at the very top of the page, above the navigation bar.

## Design Approach

The beta banner will feature:
- Fixed position at the top of the viewport
- Eye-catching amber/warning color scheme to stand out
- A "BETA" badge followed by a clear message
- Compact height so it doesn't overwhelm the page
- Smooth fade-in animation consistent with existing page elements

## Visual Preview

```text
+------------------------------------------------------------------+
|  [BETA]  This app is in beta testing. Features may change.      |
+------------------------------------------------------------------+
|                     [Navigation Bar]                              |
+------------------------------------------------------------------+
|                                                                   |
|                     [Hero Section]                                |
|                                                                   |
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/landing/BetaBanner.tsx` | New component for the beta disclaimer |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Landing.tsx` | Import and render BetaBanner at top of page, adjust nav positioning |

## Implementation Details

### BetaBanner Component

- Uses amber/warning color scheme for visibility
- Includes a pulsing "BETA" badge similar to existing badge patterns
- Compact single-line design with centered text
- Animated entrance using Framer Motion
- Fixed position at viewport top

### Landing Page Adjustments

- Insert BetaBanner before the navigation
- Adjust `pt-16` padding on main content to account for the additional banner height
- Update nav's `top-0` positioning to `top-8` (or similar) to sit below the banner

## Color Scheme

The banner will use the existing warning color variables:
- Background: `warning/10` (amber with low opacity)
- Border: `warning/30`
- Badge: Solid `warning` background
- Text: `warning` colored for emphasis

## Mobile Responsiveness

- Text will be slightly smaller on mobile devices
- Banner remains visible and readable across all screen sizes
