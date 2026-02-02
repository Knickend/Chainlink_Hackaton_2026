# Plan: Profit & Loss Overview

## Status: ✅ IMPLEMENTED

## Overview

Comprehensive Profit & Loss (P&L) tracking feature showing users their realized and unrealized gains/losses across their portfolio.

## Implementation Summary

### Database Changes (Completed)
- Added `cost_basis`, `purchase_date`, `purchase_price_per_unit` columns to `assets` table
- Created `asset_transactions` table for recording buy/sell transactions with realized P&L
- RLS policies configured for user-scoped access

### New Files Created
| File | Purpose |
|------|---------|
| `src/hooks/useProfitLoss.ts` | P&L calculation hook for unrealized/realized gains |
| `src/hooks/useAssetTransactions.ts` | Transaction history CRUD operations |
| `src/components/ProfitLossCard.tsx` | Dashboard summary card (Pro feature) |
| `src/components/ProfitLossTeaser.tsx` | Teaser for non-Pro users |
| `src/components/ProfitLossDetailDialog.tsx` | Detailed P&L breakdown by asset/category |
| `src/components/SellAssetDialog.tsx` | Record asset sales with realized P&L |

### Modified Files
| File | Change |
|------|--------|
| `src/lib/types.ts` | Added cost basis fields to Asset interface, AssetTransaction type |
| `src/hooks/usePortfolioData.ts` | CRUD operations support cost basis fields |
| `src/components/AddAssetDialog.tsx` | Optional cost basis input for crypto/stocks |
| `src/components/EditAssetDialog.tsx` | Edit existing cost basis data |
| `src/pages/Index.tsx` | Integrated ProfitLossCard into dashboard |

## Feature Details

### P&L Calculation Logic
- **Unrealized P&L**: Current Value - Cost Basis
- **Realized P&L**: Sale Proceeds - Cost of Sold Units (recorded in transactions)
- **Total P&L**: Unrealized + Realized

### Feature Gating
- Pro users: Full access to P&L card with details dialog
- Free users: Teaser with blurred preview and upgrade CTA

### Backward Compatibility
- Existing assets without cost basis show "No cost basis data" indicator
- Users can retroactively add purchase info via Edit dialog
