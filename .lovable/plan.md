
# Plan: Source & Destination Fund Tracking with Dual Mode

## Overview

This plan implements fund flow tracking for buy/sell transactions with **two modes** the user can choose between:

1. **Linked Mode (Automated)**: Links transactions to existing portfolio assets, automatically updating balances when trades occur
2. **Manual Mode**: Records source/destination as text labels for reference only, requiring manual reconciliation

Users can toggle between modes per transaction, defaulting to their preference.

---

## User Flow Example

**Scenario: Buy 0.5 BTC with EUR from a crypto wallet**

**Linked Mode:**
```
┌─────────────────────────────────────────────────────┐
│ Source of Funds                                     │
│ ○ Manual (text only)  ● Linked (auto-update)       │
├─────────────────────────────────────────────────────┤
│ [Select asset: Kraken EUR Balance (€50,000)    ▼]  │
│                                                     │
│ Amount to deduct: €44,444.44                        │
│ Exchange rate: 1 EUR = 1.08 USD                     │
│                                                     │
│ Preview:                                            │
│   +0.5 BTC to Bitcoin holding                       │
│   −€44,444.44 from Kraken EUR Balance ← auto       │
└─────────────────────────────────────────────────────┘
```

**Manual Mode:**
```
┌─────────────────────────────────────────────────────┐
│ Source of Funds                                     │
│ ● Manual (text only)  ○ Linked (auto-update)       │
├─────────────────────────────────────────────────────┤
│ Source Label: [Kraken EUR wallet           ]       │
│ Source Amount: [€44,444.44                 ]       │
│                                                     │
│ Note: Balance updates not tracked automatically    │
└─────────────────────────────────────────────────────┘
```

---

## Implementation

### Phase 1: Database Schema Update

**Migration: Add fund flow columns to `asset_transactions`**

```sql
ALTER TABLE asset_transactions
ADD COLUMN fund_flow_mode text DEFAULT 'none',
ADD COLUMN source_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
ADD COLUMN source_label text,
ADD COLUMN source_currency text,
ADD COLUMN source_amount numeric,
ADD COLUMN destination_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
ADD COLUMN destination_label text,
ADD COLUMN destination_currency text,
ADD COLUMN destination_amount numeric,
ADD COLUMN exchange_rate numeric;
```

| Column | Type | Description |
|--------|------|-------------|
| `fund_flow_mode` | text | 'none', 'linked', or 'manual' |
| `source_asset_id` | uuid (nullable) | FK to assets table (linked mode) |
| `source_label` | text (nullable) | Text label (manual mode) |
| `source_currency` | text (nullable) | Currency of source funds |
| `source_amount` | numeric (nullable) | Amount from source |
| `destination_asset_id` | uuid (nullable) | FK to assets table (linked mode) |
| `destination_label` | text (nullable) | Text label (manual mode) |
| `destination_currency` | text (nullable) | Currency of destination |
| `destination_amount` | numeric (nullable) | Amount to destination |
| `exchange_rate` | numeric (nullable) | Exchange rate used |

### Phase 2: TypeScript Types Update

**File: `src/lib/types.ts`**

Add new fields to `AssetTransaction`:

```typescript
export type FundFlowMode = 'none' | 'linked' | 'manual';

export interface AssetTransaction {
  // ... existing fields
  fund_flow_mode?: FundFlowMode;
  source_asset_id?: string;
  source_label?: string;
  source_currency?: string;
  source_amount?: number;
  destination_asset_id?: string;
  destination_label?: string;
  destination_currency?: string;
  destination_amount?: number;
  exchange_rate?: number;
}
```

**File: `src/hooks/useAssetTransactions.ts`**

Extend `CreateTransactionData`:

```typescript
export interface CreateTransactionData {
  // ... existing fields
  fund_flow_mode?: FundFlowMode;
  source_asset_id?: string;
  source_label?: string;
  source_currency?: string;
  source_amount?: number;
  destination_asset_id?: string;
  destination_label?: string;
  destination_currency?: string;
  destination_amount?: number;
  exchange_rate?: number;
}
```

### Phase 3: New Component - Fund Flow Selector

**New File: `src/components/FundFlowSelector.tsx`**

A reusable component that handles both modes:

```
┌─────────────────────────────────────────────────────┐
│ Source of Funds (optional)                          │
│                                                     │
│ [Mode Toggle]                                       │
│ ○ Manual  ● Linked                                 │
├─────────────────────────────────────────────────────┤
│ IF LINKED:                                          │
│   [Asset Dropdown with balances]                    │
│   Amount calculated automatically                   │
│   Balance preview: "−48,000 USDC from Coinbase"    │
├─────────────────────────────────────────────────────┤
│ IF MANUAL:                                          │
│   [Text input: Source Label]                        │
│   [Number input: Amount]                            │
│   [Currency selector]                               │
└─────────────────────────────────────────────────────┘
```

Props:
```typescript
interface FundFlowSelectorProps {
  type: 'source' | 'destination';
  assets: Asset[];  // Available portfolio assets for linking
  mode: FundFlowMode;
  onModeChange: (mode: FundFlowMode) => void;
  // Linked mode
  selectedAssetId?: string;
  onAssetSelect: (assetId: string | undefined) => void;
  // Manual mode
  label?: string;
  onLabelChange: (label: string) => void;
  // Common
  currency?: string;
  onCurrencyChange: (currency: string) => void;
  amount?: number;
  onAmountChange: (amount: number) => void;
  exchangeRate?: number;
  transactionAmount: number;  // To auto-calculate amount
  liveForexRates?: Record<string, number>;
}
```

### Phase 4: Update Buy/Sell Dialogs

**File: `src/components/EditAssetDialog.tsx`**

Add FundFlowSelector to the "Buy More" tab:

```
[Current Holdings: 2.5 BTC | $125,000]

[Quantity to Buy: 0.5 BTC]
[Price per Unit: $96,000]
[Transaction Date: 2026-02-03]

── Source of Funds ──────────────────────────
[FundFlowSelector component]

[Preview]
  +0.5 BTC to Bitcoin
  −48,000 USDC from Coinbase Wallet (if linked)
  
[Buy]
```

Add to the "Sell" tab:

```
[Quantity to Sell: 1.0 BTC]
[Sale Price: $98,000]
[Transaction Date: 2026-02-03]

── Destination for Proceeds ─────────────────
[FundFlowSelector component]

[Preview]
  −1.0 BTC from Bitcoin
  +$98,000 to Chase Checking (if linked)
  Realized P&L: +$12,500

[Sell]
```

**File: `src/components/SellAssetDialog.tsx`**

Same destination selector pattern.

**File: `src/components/AddAssetDialog.tsx`**

Add optional source selector for initial purchases (tradeable assets only).

### Phase 5: Auto-Update Logic for Linked Mode

**File: `src/pages/Index.tsx`**

Update the `onBuyMore` and `onSell` handlers:

```typescript
// In onBuyMore handler
if (data.fund_flow_mode === 'linked' && data.source_asset_id) {
  const sourceAsset = assets.find(a => a.id === data.source_asset_id);
  if (sourceAsset && sourceAsset.quantity) {
    // Validate sufficient balance
    if (sourceAsset.quantity < data.source_amount) {
      toast({ variant: 'destructive', title: 'Insufficient balance' });
      return;
    }
    
    // Reduce source asset balance
    const newSourceQty = sourceAsset.quantity - data.source_amount;
    if (newSourceQty <= 0) {
      await deleteAsset(data.source_asset_id);
    } else {
      await updateAsset(data.source_asset_id, {
        quantity: newSourceQty,
        value: /* recalculate based on category */,
      });
    }
  }
}

// In onSell handler
if (data.fund_flow_mode === 'linked' && data.destination_asset_id) {
  const destAsset = assets.find(a => a.id === data.destination_asset_id);
  if (destAsset) {
    // Add proceeds to destination asset
    const newDestQty = (destAsset.quantity || 0) + data.destination_amount;
    await updateAsset(data.destination_asset_id, {
      quantity: newDestQty,
      value: /* recalculate based on category */,
    });
  }
}
```

### Phase 6: Transaction History Display

**File: `src/components/AssetDetailModal.tsx`**

Update transaction rows to show fund flow:

```
2026-02-03  BUY  0.5 BTC @ $96k
            └─ Funded with 48,000 USDC from Coinbase (auto)

2026-02-02  SELL 1.0 BTC @ $98k  →  P&L +$12,500
            └─ Proceeds to Chase Checking (manual label)

2026-01-15  BUY  4.0 BTC @ $45k
            └─ External funds (no tracking)
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Migration SQL | Create | Add fund flow columns to asset_transactions |
| `src/lib/types.ts` | Modify | Add FundFlowMode type and extend AssetTransaction |
| `src/components/FundFlowSelector.tsx` | Create | Reusable component for source/destination selection |
| `src/hooks/useAssetTransactions.ts` | Modify | Extend CreateTransactionData interface |
| `src/components/EditAssetDialog.tsx` | Modify | Add FundFlowSelector to Buy/Sell tabs |
| `src/components/SellAssetDialog.tsx` | Modify | Add destination FundFlowSelector |
| `src/components/AddAssetDialog.tsx` | Modify | Add optional source selector |
| `src/pages/Index.tsx` | Modify | Add auto-update logic for linked mode |
| `src/components/AssetDetailModal.tsx` | Modify | Show fund flow in transaction history |

---

## Validation & Edge Cases

1. **Insufficient Balance**: Block linked transactions if source asset has insufficient funds
2. **Circular Reference**: Prevent selecting the same asset as both source and target
3. **Deleted Assets**: `ON DELETE SET NULL` keeps transaction records but clears the link
4. **Currency Mismatch**: Auto-calculate exchange rates when currencies differ
5. **Optional Fields**: All fund flow fields are optional - transactions work without them
6. **Banking Assets**: When destination is a bank account, increase the `quantity` field (original currency amount)

---

## UI/UX Considerations

1. **Default Mode**: "None" by default, user expands to add fund flow tracking
2. **Mode Memory**: Remember last-used mode in localStorage for convenience
3. **Collapsible Section**: Fund flow section starts collapsed, expands on click
4. **Validation Hints**: Show "Insufficient balance" immediately when amount exceeds source
5. **Preview**: Always show preview of what will happen before confirming

---

## Summary of Modes

| Aspect | Linked Mode | Manual Mode |
|--------|-------------|-------------|
| Balance Updates | Automatic | None (reference only) |
| Asset Selection | Dropdown with live balances | Free text field |
| Validation | Enforces sufficient balance | No validation |
| Audit Trail | Full asset linkage | Text labels only |
| Best For | Accurate portfolio tracking | Quick notes, external accounts |
