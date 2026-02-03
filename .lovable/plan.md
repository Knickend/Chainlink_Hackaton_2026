

# Plan: Add Delete Snapshot Functionality

## The Issue

The Portfolio History card and Snapshot Detail View show old data from previously captured snapshots. These snapshots are stored in the `portfolio_snapshots` table and represent your portfolio state at past points in time. Currently, there's no way to delete unwanted snapshots.

## Solution

Add a delete button to the Snapshot Detail View modal, allowing you to remove any snapshot you no longer want.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/usePortfolioHistory.ts` | Add `deleteSnapshot` mutation function |
| `src/components/SnapshotDetailView.tsx` | Add delete button with confirmation |

---

## Technical Implementation

### 1. usePortfolioHistory.ts - Add Delete Mutation

```typescript
// Add delete mutation alongside createSnapshot
const { mutateAsync: deleteSnapshotMutation, isPending: isDeleting } = useMutation({
  mutationFn: async (snapshotId: string) => {
    const { error } = await supabase
      .from('portfolio_snapshots')
      .delete()
      .eq('id', snapshotId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['portfolio-snapshots'] });
    toast.success('Snapshot deleted');
  },
  onError: () => {
    toast.error('Failed to delete snapshot');
  },
});
```

### 2. SnapshotDetailView.tsx - Add Delete Button

Add a delete button with confirmation to the modal footer:

```tsx
<DeleteConfirmDialog
  itemName={`${format(parseISO(snapshot.snapshot_month), 'MMMM yyyy')} snapshot`}
  title="Delete this snapshot?"
  description="This will permanently remove this historical record. This action cannot be undone."
  onConfirm={() => {
    onDelete(snapshot.id);
    onOpenChange(false);
  }}
/>
```

---

## UI Changes

### Snapshot Detail Modal (After)

The modal will include a "Delete Snapshot" button in the footer, styled consistently with other delete actions in the app:

```
┌─────────────────────────────────────────────┐
│ 👁 February 2026 Snapshot               ✕  │
├─────────────────────────────────────────────┤
│                                             │
│  [Net Worth]        [Net Cash Flow]         │
│   €31,535            +€208                  │
│                                             │
│  [Total Assets]     [Total Debt]            │
│   €681,535           €650,000               │
│                                             │
│  ... allocation chart ...                   │
│                                             │
│  Snapshot taken on February 2, 2026         │
│                                             │
│        [🗑 Delete Snapshot]                 │  ← NEW
└─────────────────────────────────────────────┘
```

---

## Component Props Updates

### SnapshotDetailView Props
```typescript
interface SnapshotDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: PortfolioSnapshot | null;
  formatValue: (value: number, showDecimals?: boolean) => string;
  onDelete?: (snapshotId: string) => void;  // NEW
  isDeleting?: boolean;                      // NEW
}
```

---

## User Flow

1. Open Portfolio History card
2. Select a snapshot from the timeline/dropdown
3. Click "View Details"
4. In the detail modal, click "Delete Snapshot"
5. Confirm deletion in the dialog
6. Snapshot is removed, modal closes
7. Timeline updates to show remaining snapshots

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Delete last remaining snapshot | Timeline shows empty state with "Create First Snapshot" |
| Delete currently selected snapshot | Auto-select next most recent snapshot |
| Delete while comparing months | Comparison dialog closes if either month is deleted |

---

## Alternative: Take New Snapshot

If you want to keep the historical data but just update the current month, you can click "Take Snapshot" - this will overwrite the February 2026 snapshot with your current (empty) portfolio state. The system uses `upsert` so it updates existing snapshots for the same month.

---

## Summary

This adds a delete button to the Snapshot Detail modal, giving you control over your historical portfolio data. You'll be able to remove any snapshot you no longer want to keep.

