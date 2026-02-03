
# Plan: Rename Asset Category Display Labels

## Overview

Update the display labels for asset categories across the entire application while keeping the underlying database values (`banking`, `crypto`, `stocks`, `commodities`) unchanged.

**New Category Names:**
| Internal Key | Current Label | New Label |
|--------------|---------------|-----------|
| `banking` | Banking | Cash, Stablecoins & Real Estate |
| `crypto` | Crypto / Cryptocurrency | Cryptocurrency |
| `stocks` | Stocks / Stocks & ETFs | Stocks, Bonds & ETFs |
| `commodities` | Commodities | Commodities |

---

## Files to Modify

### UI Components (Core Dashboard)

| File | Change |
|------|--------|
| `src/components/AssetCategoryCard.tsx` | Update `categoryConfig` labels at line 24-28 |
| `src/components/AllocationChart.tsx` | Update `LABELS` object at line 16-21 |
| `src/components/AddAssetDialog.tsx` | Update `categoryOptions` at line 45-50 |
| `src/components/EditAssetDialog.tsx` | Update `categories` at line 87-92 |
| `src/components/ViewAllAssetsDialog.tsx` | Update `categoryLabels` at line 51-56 |
| `src/components/FundFlowSelector.tsx` | Update `categoryLabels` at line 77-82 |
| `src/components/SnapshotDetailView.tsx` | Update `CATEGORY_CONFIG` at line 20-25 |

### P&L and Yield Components

| File | Change |
|------|--------|
| `src/components/ProfitLossDetailDialog.tsx` | No label changes needed (uses category keys for colors) |
| `src/components/YieldBreakdownCard.tsx` | No changes (uses yield type labels: Staking, Interest, Dividend) |

### Tutorial and Help

| File | Change |
|------|--------|
| `src/components/Tutorial/tutorialSteps.ts` | Update content text at line 69 to reflect new category names |

### Price and Status Indicators

| File | Change |
|------|--------|
| `src/components/PriceIndicator.tsx` | Update tooltip text at line 84 |

### Landing Page and Marketing

| File | Change |
|------|--------|
| `index.html` | Update meta description at line 7 |
| `src/components/landing/HeroSection.tsx` | Update marketing copy at line 38-39 |
| `src/components/landing/FAQSection.tsx` | Update FAQ answers at lines 13 and 28 |

### Edge Functions (AI Prompts)

| File | Change |
|------|--------|
| `supabase/functions/financial-advisor/index.ts` | Update system prompt at line 67 |
| `supabase/functions/sales-bot/index.ts` | Update sales prompt at line 60 |

---

## Detailed Changes

### 1. AssetCategoryCard.tsx (line 24-28)
```typescript
const categoryConfig: Record<AssetCategory, { icon: LucideIcon; label: string; color: string }> = {
  banking: { icon: Landmark, label: 'Cash, Stablecoins & Real Estate', color: 'text-blue-400' },
  crypto: { icon: Bitcoin, label: 'Cryptocurrency', color: 'text-bitcoin' },
  stocks: { icon: TrendingUp, label: 'Stocks, Bonds & ETFs', color: 'text-success' },
  commodities: { icon: Package, label: 'Commodities', color: 'text-gold' },
};
```

### 2. AllocationChart.tsx (line 16-21)
```typescript
const LABELS = {
  banking: 'Cash, Stablecoins & Real Estate',
  crypto: 'Cryptocurrency',
  stocks: 'Stocks, Bonds & ETFs',
  commodities: 'Commodities',
};
```

### 3. AddAssetDialog.tsx (line 45-50)
```typescript
const categoryOptions: { value: AssetCategory; label: string }[] = [
  { value: 'banking', label: 'Cash, Stablecoins & Real Estate' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'stocks', label: 'Stocks, Bonds & ETFs' },
  { value: 'commodities', label: 'Commodities' },
];
```

### 4. EditAssetDialog.tsx (line 87-92)
```typescript
const categories: { value: AssetCategory; label: string }[] = [
  { value: 'banking', label: 'Cash, Stablecoins & Real Estate' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'stocks', label: 'Stocks, Bonds & ETFs' },
  { value: 'commodities', label: 'Commodities' },
];
```

### 5. ViewAllAssetsDialog.tsx (line 51-56)
```typescript
const categoryLabels: Record<AssetCategory, string> = {
  banking: 'Cash, Stablecoins & Real Estate',
  crypto: 'Cryptocurrency',
  stocks: 'Stocks, Bonds & ETFs',
  commodities: 'Commodities',
};
```

### 6. FundFlowSelector.tsx (line 77-82)
```typescript
const categoryLabels: Record<string, string> = {
  banking: 'Cash, Stablecoins & Real Estate',
  crypto: 'Cryptocurrency',
  stocks: 'Stocks, Bonds & ETFs',
  commodities: 'Commodities',
};
```

### 7. SnapshotDetailView.tsx (line 20-25)
```typescript
const CATEGORY_CONFIG = [
  { key: 'banking', label: 'Cash, Stablecoins & Real Estate', color: '#3b82f6', icon: Landmark },
  { key: 'crypto', label: 'Cryptocurrency', color: '#f59e0b', icon: Bitcoin },
  { key: 'stocks', label: 'Stocks, Bonds & ETFs', color: '#10b981', icon: BarChart3 },
  { key: 'commodities', label: 'Commodities', color: '#8b5cf6', icon: Gem },
] as const;
```

### 8. Tutorial/tutorialSteps.ts (line 69)
```typescript
content: 'Add and track all types of assets - cash, stablecoins, real estate, cryptocurrency, stocks, bonds, ETFs, and commodities. Each category shows its total value and percentage of your portfolio.',
```

### 9. PriceIndicator.tsx (line 84)
```typescript
Cryptocurrency/Commodities: {formatLastUpdated(lastUpdated)}
```

### 10. index.html (line 7)
```html
<meta name="description" content="Track all your assets - cash, stablecoins, real estate, cryptocurrency, stocks, bonds, ETFs, and commodities. View your wealth in USD, Bitcoin, Gold, or any currency." />
```

### 11. HeroSection.tsx (line 38-39)
```typescript
Track assets, manage debt, and build wealth across cryptocurrency, stocks, bonds, ETFs, 
commodities, and real estate — all in one beautiful dashboard.
```

### 12. FAQSection.tsx (line 13 and 28)
Update FAQ answers to use new terminology.

### 13. Edge Functions
Update AI prompts in `financial-advisor/index.ts` and `sales-bot/index.ts` to use new category names.

---

## What Stays the Same

- **Database values**: The underlying `category` column values (`banking`, `crypto`, `stocks`, `commodities`) remain unchanged
- **TypeScript types**: `AssetCategory` type definition stays as is
- **API contracts**: No changes to Supabase queries or data structures
- **Colors and icons**: All visual styling remains the same
- **Voice command parsing**: Internal category matching uses same keys

---

## Summary

This is a display-only change affecting ~13 files. All changes are string replacements for labels shown to users. The underlying data model and business logic remain completely unchanged.
