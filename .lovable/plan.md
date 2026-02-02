
# Plan: Add Buy and Sell Actions to Edit Asset Dialog

## Overview

Transform the Edit Asset dialog into a comprehensive asset management hub by adding Buy More and Sell options. This allows users to manage their position directly from the asset card without navigating to the View All Assets table.

## Current State

| Component | Current Capability |
|-----------|-------------------|
| EditAssetDialog | Edit asset details (name, quantity, cost basis) |
| SellAssetDialog | Sell assets (only accessible from View All Assets table) |
| AddAssetDialog | Add new assets |

The sell functionality exists but is only accessible through the ViewAllAssetsDialog table. There is no "Buy More" functionality at all - users must manually update quantities.

## Proposed Solution

Add a tabbed interface or action buttons within the Edit Asset dialog to provide three distinct modes:

1. **Edit** - Current behavior (default)
2. **Buy More** - Add to existing position and adjust cost basis
3. **Sell** - Reduce or close position with P&L tracking

## UI Design Options

### Option A: Tab-Based Interface (Recommended)

```text
+------------------------------------------+
|  Edit Asset                         [X]  |
+------------------------------------------+
|  [ Edit ]  [ Buy More ]  [ Sell ]        |
+------------------------------------------+
|  <Content based on selected tab>         |
+------------------------------------------+
```

### Option B: Action Buttons in Header

Keep existing edit form and add action buttons that open nested dialogs.

**Recommendation**: Option A provides a cleaner, more integrated experience.

## Detailed Changes

### 1. Modify EditAssetDialog.tsx

**Add Tab State and UI**:
- Import `Tabs, TabsList, TabsTrigger, TabsContent` from shadcn/ui
- Add state: `const [activeTab, setActiveTab] = useState<'edit' | 'buy' | 'sell'>('edit')`
- Wrap form content in TabsContent components

**Add New Props**:
```tsx
interface EditAssetDialogProps {
  asset: Asset;
  onUpdate: (id: string, data: Partial<Omit<Asset, 'id'>>) => void;
  onBuyMore?: (assetId: string, data: BuyMoreData) => Promise<void>;
  onSell?: (assetId: string, data: SellData) => Promise<void>;
  livePrices?: LivePrices;
  onCryptoPriceUpdate?: (symbol: string, price: number, change: number, changePercent: number) => void;
}
```

**Buy More Tab Content**:
- Quantity to add input
- Purchase price per unit input
- Purchase date input
- Preview showing: new total quantity, updated cost basis
- Submit button: "Confirm Purchase"

**Sell Tab Content**:
- Quantity to sell input (with max = current quantity)
- Sale price per unit input (pre-filled with live price)
- Sale date input
- P&L preview (cost basis of sold units vs sale proceeds)
- Notes field
- Submit button: "Confirm Sale"

### 2. Create Buy More Logic

When buying more of an existing asset:

```text
New Quantity = Old Quantity + Buy Quantity
New Cost Basis = Old Cost Basis + (Buy Quantity × Buy Price)
New Avg Price/Unit = New Cost Basis / New Quantity
```

### 3. Update AssetCategoryCard.tsx

Pass the new handlers to EditAssetDialog:
- `onBuyMore` prop
- `onSell` prop

### 4. Update Index.tsx

Implement the handlers in the main page:

**handleBuyMore**:
```tsx
async (assetId, data) => {
  const asset = assets.find(a => a.id === assetId);
  if (!asset) return;
  
  // Record buy transaction
  await addTransaction({
    asset_id: assetId,
    transaction_type: 'buy',
    symbol: asset.symbol || asset.name,
    asset_name: asset.name,
    category: asset.category,
    quantity: data.quantity,
    price_per_unit: data.price_per_unit,
    total_value: data.quantity * data.price_per_unit,
    transaction_date: data.transaction_date,
  });
  
  // Update asset
  const newQuantity = (asset.quantity || 0) + data.quantity;
  const newCostBasis = (asset.cost_basis || 0) + (data.quantity * data.price_per_unit);
  
  await updateAsset(assetId, {
    quantity: newQuantity,
    cost_basis: newCostBasis,
    purchase_price_per_unit: newCostBasis / newQuantity,
  });
}
```

**handleSell**:
Reuse existing sell logic from ViewAllAssetsDialog.

### 5. Restrict Tabs by Asset Category

Only show Buy/Sell tabs for tradeable categories:
- Stocks
- Crypto
- Commodities

Hide for Banking (use Edit only).

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/EditAssetDialog.tsx` | Add tabs, buy/sell forms, new props |
| `src/components/AssetCategoryCard.tsx` | Pass onBuyMore and onSell to EditAssetDialog |
| `src/pages/Index.tsx` | Implement handleBuyMore and handleSell handlers |

## Visual Flow

```text
User clicks pencil icon on asset card
         |
         v
    Edit Asset Dialog opens
         |
         v
+---------------------+
|     Tab Bar         |
| [Edit][Buy][Sell]   |
+---------------------+
         |
    +----+----+----+
    |    |    |    |
    v    v    v    v
  Edit  Buy  Sell
  Form  Form Form
```

## Technical Notes

- The existing SellAssetDialog component could be reused, but integrating directly into EditAssetDialog provides a cleaner UX
- Buy transactions record a 'buy' type in asset_transactions table (already supported by the schema)
- Cost basis recalculation follows standard weighted average cost method
- Tabs only show for market-priced categories (stocks, crypto, commodities)
- Banking assets remain edit-only since they don't have tradeable quantities
