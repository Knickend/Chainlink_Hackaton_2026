

## Fix Privacy Vault Balance Display

### Problem
1. **Response parsing bug**: The `/balances` API returns a nested structure `{ balances: { balances: [...] } }`, but the UI code reads `data.balances` and treats it as an array. Since it's actually an object, balances never display.
2. **User expectation mismatch**: The Privacy Vault uses its own internal accounting. Regular on-chain ETH transfers to a shielded address may not appear in vault balances -- deposits typically need to go through the Privacy Vault API.

### Changes

**File: `src/components/settings/PrivacyVaultSection.tsx`**
- Fix `fetchBalances` to handle the nested response: extract `data.balances.balances` (the inner array) or flatten the response object into displayable key-value pairs if the format differs.
- Add a "Refresh" button next to the balances card so users can manually re-check.
- Display a helpful note explaining that balances reflect the Privacy Vault's internal ledger, not on-chain balances.

**File: `supabase/functions/privacy-vault/index.ts`**
- Unwrap the nested response in the `balances` action so the edge function returns `{ success: true, balances: [...] }` instead of `{ success: true, balances: { balances: [] } }`, making the API contract cleaner for the frontend.
- Add console logging of the raw API response for easier debugging.

### Technical Details
The balances endpoint currently does:
```typescript
return { success: true, balances: result }
// where result = { balances: [] }
// so final shape = { success: true, balances: { balances: [] } }
```

Fix to:
```typescript
const balancesArray = Array.isArray(result.balances) ? result.balances : [];
return { success: true, balances: balancesArray }
```

