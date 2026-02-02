
# Plan: Add Cost Basis Fields to Commodities and Banking Categories

## Problem

The Add Asset dialog is missing cost basis input fields for the Commodities and Banking categories. Currently only Stocks and Crypto have these fields, which means users cannot track profit and loss for commodities (gold, silver, etc.) or banking assets.

## Current State

| Category | Cost Basis Fields | P&L Tracking |
|----------|------------------|--------------|
| Stocks | Purchase Price per Share, Purchase Date | Yes |
| Crypto | Purchase Price per Unit, Purchase Date | Yes |
| Commodities | None | No |
| Banking | None | No |

## Solution

Add the same cost basis input section to both Commodities and Banking categories in the Add Asset dialog.

## Changes Required

### 1. Add Cost Basis to Commodities Category

Insert after the price info block (around line 577, after the closing of the price display section):

```tsx
{/* Cost Basis Section for P&L Tracking */}
<div className="space-y-3 p-3 rounded-lg border border-border/50 bg-secondary/10">
  <p className="text-xs font-medium text-muted-foreground">Cost Basis (optional - for P&L tracking)</p>
  
  <FormField
    control={form.control}
    name="purchase_price_per_unit"
    render={({ field }) => (
      <FormItem>
        <FormLabel className="text-sm">Purchase Price per Unit (USD)</FormLabel>
        <FormControl>
          <Input
            type="number"
            step="0.01"
            placeholder="e.g., 2,000.00"
            {...field}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
            className="bg-secondary/50"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />

  <FormField
    control={form.control}
    name="purchase_date"
    render={({ field }) => (
      <FormItem>
        <FormLabel className="text-sm">Purchase Date</FormLabel>
        <FormControl>
          <Input
            type="date"
            {...field}
            className="bg-secondary/50"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
```

### 2. Add Cost Basis to Banking Category

Insert after the Interest Rate field (around line 807):

```tsx
{/* Cost Basis Section for P&L Tracking */}
<div className="space-y-3 p-3 rounded-lg border border-border/50 bg-secondary/10">
  <p className="text-xs font-medium text-muted-foreground">Cost Basis (optional - for P&L tracking)</p>
  
  <FormField
    control={form.control}
    name="purchase_price_per_unit"
    render={({ field }) => (
      <FormItem>
        <FormLabel className="text-sm">Initial Deposit Amount</FormLabel>
        <FormControl>
          <Input
            type="number"
            step="0.01"
            placeholder="e.g., 10,000.00"
            {...field}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
            className="bg-secondary/50"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />

  <FormField
    control={form.control}
    name="purchase_date"
    render={({ field }) => (
      <FormItem>
        <FormLabel className="text-sm">Account Opening Date</FormLabel>
        <FormControl>
          <Input
            type="date"
            {...field}
            className="bg-secondary/50"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
```

### 3. Update onSubmit Handler for Banking

The current banking submit logic (lines 148-159) does not include cost basis calculation. Update to:

```tsx
if (data.category === 'banking' && data.currency) {
  const forexRate = FOREX_RATES_TO_USD[data.currency as BankingCurrency] || 1;
  const usdValue = data.value * forexRate;
  
  // Calculate cost basis from initial deposit if provided
  const costBasis = data.purchase_price_per_unit 
    ? data.purchase_price_per_unit * forexRate 
    : undefined;

  onAdd({
    name: data.name,
    category: data.category,
    value: usdValue,
    symbol: data.currency,
    quantity: data.value,
    yield: data.yield,
    stakingRate: data.stakingRate,
    cost_basis: costBasis,
    purchase_date: data.purchase_date || undefined,
    purchase_price_per_unit: data.purchase_price_per_unit,
  });
}
```

## File to Modify

| File | Changes |
|------|---------|
| `src/components/AddAssetDialog.tsx` | Add cost basis sections to commodities and banking categories, update banking submit handler |

## User-Friendly Labels

To make the fields more intuitive for each category:

| Category | Price Field Label | Date Field Label |
|----------|------------------|------------------|
| Stocks | Purchase Price per Share | Purchase Date |
| Crypto | Purchase Price per Unit | Purchase Date |
| Commodities | Purchase Price per Unit | Purchase Date |
| Banking | Initial Deposit Amount | Account Opening Date |

## Technical Notes

- The cost basis for commodities will be calculated as `purchase_price_per_unit * quantity` (already handled in existing submit logic)
- For banking, cost basis represents the initial deposit which can be compared to current balance to track gains from interest
- The fields remain optional (no validation requirements) to avoid forcing users who don't need P&L tracking
