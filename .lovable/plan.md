

## Fix: Format paymentAmount as decimal string

### Change
In `supabase/functions/agent-wallet/index.ts`, change `String(amount)` to `amount.toFixed(2)` so the CDP API receives `"5.00"` instead of `"5"`.

### Technical Detail
- **File**: `supabase/functions/agent-wallet/index.ts`, line ~691
- **Before**: `paymentAmount: String(amount),`
- **After**: `paymentAmount: amount.toFixed(2),`

Note: `amount` is already cast to `Number()` earlier in the fund case, so `.toFixed(2)` will work correctly.

### Testing
Trigger "Fund my wallet with $5" and verify the Coinbase Onramp page shows $5.00 pre-filled.

