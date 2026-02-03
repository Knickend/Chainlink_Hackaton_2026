
# Plan: Make Real Estate Edit Screen Match Other Categories

## Problem

When editing a real estate asset ("House"), the edit dialog only shows:
- Asset Name
- Category

It's missing the Currency and Value fields that are essential for editing the asset. This is inconsistent with the Add Asset dialog and with the Banking category's edit screen.

## Root Cause

In `EditAssetDialog.tsx`, the form fields for currency and value are only rendered when `selectedCategory === 'banking'` (line 1100). The `realestate` category has no specific rendering block, so it falls through without showing any additional fields.

In contrast, `AddAssetDialog.tsx` correctly handles both categories together:
```typescript
{(selectedCategory === 'banking' || selectedCategory === 'realestate') && (
  // Currency, Amount, Yield fields
)}
```

## Solution

Update the `EditAssetDialog.tsx` to render the same form fields for `realestate` as for `banking`, matching the pattern used in `AddAssetDialog.tsx`.

---

## Changes Required

### File: `src/components/EditAssetDialog.tsx`

**Change 1**: Update the form default values to also handle realestate (line 167)

Currently:
```typescript
currency: asset.category === 'banking' ? (asset.symbol || 'USD') : undefined,
```

Updated:
```typescript
currency: (asset.category === 'banking' || asset.category === 'realestate') 
  ? (asset.symbol || 'USD') : undefined,
```

**Change 2**: Update the dialog reset to also handle realestate (line 225)

Currently:
```typescript
currency: asset.category === 'banking' ? (asset.symbol || 'USD') : undefined,
```

Updated:
```typescript
currency: (asset.category === 'banking' || asset.category === 'realestate') 
  ? (asset.symbol || 'USD') : undefined,
```

**Change 3**: Update the submit handler to also handle realestate (line 300)

Currently:
```typescript
if (data.category === 'banking' && data.currency) {
```

Updated:
```typescript
if ((data.category === 'banking' || data.category === 'realestate') && data.currency) {
```

**Change 4**: Update the form rendering condition (line 1100)

Currently:
```typescript
{selectedCategory === 'banking' && (
```

Updated:
```typescript
{(selectedCategory === 'banking' || selectedCategory === 'realestate') && (
```

**Change 5**: Update the yield label to be category-specific (around line 1169)

Currently:
```typescript
<FormLabel>Interest Rate (%)</FormLabel>
```

Updated:
```typescript
<FormLabel>
  {selectedCategory === 'realestate' ? 'Expected Yield/Return (%)' : 'Interest Rate (%)'}
</FormLabel>
```

---

## Expected Result After Fix

When editing the "House" real estate asset, the dialog will show:
- Asset Name: "House"
- Category: "Real Estate, Equity & Misc."
- Currency: EUR (dropdown selector)
- Amount: €450,000.00
- Exchange Rate info (if non-USD)
- Expected Yield/Return (%): optional field

This matches the experience when adding a new real estate asset and editing banking assets.
