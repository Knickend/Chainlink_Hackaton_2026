

# Fix: Show All Token Balances (EURC, cbBTC, etc.)

## Root Cause

There's a variable shadowing bug in `supabase/functions/agent-wallet/index.ts`:

- **Line 629**: `let tokenBalances: Array<...> = [];` (outer scope)
- **Line 685**: `const tokenBalances = tokenList.map(...)` (inner scope, shadows the outer variable)
- **Line 710**: `token_balances: tokenBalances ?? []` (references the outer, still-empty array)

The `const` on line 685 creates a new local variable that is discarded when the block ends. The response always sends back `[]`.

## Fix

**File:** `supabase/functions/agent-wallet/index.ts`

Change line 685 from:
```text
const tokenBalances = tokenList.map(...)
```
to:
```text
tokenBalances = tokenList.map(...)
```

This single-character fix (removing `const`) makes the assignment target the outer `let` variable, so all parsed tokens (EURC, cbBTC, WETH, etc.) are included in the response.

## Deployment

The edge function will be redeployed automatically after the fix.

| Action | File |
|--------|------|
| Modify | `supabase/functions/agent-wallet/index.ts` -- remove `const` on line 685 |

