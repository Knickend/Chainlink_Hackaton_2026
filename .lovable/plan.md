

# Polish Pricing Section UI

## Overview

Improve the visual polish of the pricing cards with better badge alignment, hover effects, and prominent discount highlighting.

## Issues to Fix

### 1. Badge Alignment Issues
**Current Problem**: The "2 MONTHS FREE" badge is positioned at `right-4` which creates awkward spacing, especially on the Pro card where it conflicts with the "Most Popular" badge.

**Solution**: 
- Move discount badges to a consistent position inside the card header area
- For Pro card with two badges, stack them horizontally with proper spacing
- Use flexbox layout within the card header for clean alignment

### 2. Missing Hover Effects
**Current**: Cards have no visual feedback on hover.

**Solution**: Add hover state with:
- Subtle border color change (brighten border)
- Slight scale transform (`scale(1.02)`)
- Enhanced shadow on hover
- Smooth transition animation

### 3. 50% First Month Discount Not Prominent (Monthly)
**Current**: Shows as plain text "First month: €2.50".

**Solution**: When monthly billing is selected:
- Add a prominent strikethrough on the regular price
- Show the discounted price with a highlight/badge treatment
- Add visual emphasis with color (emerald/green for savings)

## Technical Changes

### `src/components/landing/PricingSection.tsx`

**Badge Positioning (lines 139-156)**:
- Move badges inside the card content area
- Create a flex row for badges at the top of each card
- Align badges consistently: "Most Popular" left, discount badge right

**Hover Effects (lines 85-90 and 126-137)**:
- Add `transition-all duration-300` for smooth animations
- Add `hover:border-primary/50` for border highlight
- Add `hover:scale-[1.02]` for subtle zoom
- Add `hover:shadow-lg` or custom gold shadow on hover

**First Month Discount Display (lines 174-180)**:
- When monthly: Show original price with strikethrough
- Display discounted price prominently with emerald styling
- Add "50% OFF" label next to the discounted price

### Code Changes Preview

```tsx
// Card container with hover effects
<motion.div
  className={cn(
    'glass-card rounded-2xl p-6 lg:p-8 border relative',
    'transition-all duration-300 hover:scale-[1.02] hover:shadow-xl',
    plan.isPopular
      ? 'border-primary gold-glow hover:border-primary'
      : 'border-border/50 hover:border-primary/50'
  )}
>
  {/* Badges row - inside card, not absolute positioned */}
  <div className="flex items-center justify-between mb-4">
    {plan.isPopular && (
      <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
        Most Popular
      </span>
    )}
    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-semibold ml-auto">
      {isAnnual ? '2 MONTHS FREE' : '50% OFF 1ST MONTH'}
    </Badge>
  </div>
  
  {/* Price display with prominent discount */}
  <div className="mb-6">
    <span className="text-4xl font-bold">€{displayPrice.toFixed(2)}</span>
    <span className="text-muted-foreground">{isAnnual ? '/year' : '/mo'}</span>
    
    {!isAnnual && (
      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm text-muted-foreground line-through">
          €{plan.monthlyPrice.toFixed(2)}
        </span>
        <span className="text-sm font-semibold text-emerald-400">
          €{firstMonthPrice.toFixed(2)} first month
        </span>
      </div>
    )}
  </div>
</motion.div>
```

## Visual Result

**Before (Annual)**:
```text
+------------------+
|     [2 MO FREE] <- floating awkwardly
| Standard         |
| €49.90/year      |
+------------------+
```

**After (Annual)**:
```text
+------------------+
| [2 MONTHS FREE]  | <- aligned inside card
|                  |
| Standard         |
| €49.90/year      |
| €4.16/mo         |
+------------------+
```

**Monthly with Discount Highlight**:
```text
+------------------+
| [50% OFF 1ST MO] |
|                  |
| Standard         |
| €4.99/mo         |
| ~~€4.99~~ €2.50  | <- strikethrough + highlight
| first month      |
+------------------+
```

**Hover State**:
- Card slightly scales up (1.02x)
- Border transitions to gold/primary color
- Enhanced shadow appears
- Smooth 300ms transition

## Files Modified

| File | Changes |
|------|---------|
| `src/components/landing/PricingSection.tsx` | Badge positioning, hover effects, discount display |

