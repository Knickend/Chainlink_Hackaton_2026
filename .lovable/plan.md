

## Input Validation Hardening for API Edge Functions

### Problem

Multiple backend functions accept user-provided `symbols`, `type`, `debtType`, and `category` parameters without proper validation. This creates risks:

- **No length limit on raw input strings** before splitting (a multi-megabyte `symbols` query param could cause memory/CPU issues)
- **No character format validation** on symbols (should be alphanumeric only)
- **No cap on resulting array length** after splitting
- **String filter fields** (`type`, `debtType`, `category`) are passed directly to database queries without format checks

### Affected Functions (5 total)

1. `supabase/functions/api-price-feed/index.ts` -- symbols, type
2. `supabase/functions/api-price-feed-test/index.ts` -- symbols, type (identical parsing logic)
3. `supabase/functions/api-debt-strategy/index.ts` -- debtType
4. `supabase/functions/api-yield-analysis/index.ts` -- category
5. `supabase/functions/fetch-crypto-prices/index.ts` -- symbols array from POST body

Note: `search-ticker` and `fetch-prices` already have adequate validation (search-ticker truncates to 50 chars; fetch-prices uses a hardcoded symbol list).

### Changes

#### Shared Validation Helper

Add a `sanitizeSymbol` regex check and constants to each function's `parseFilters`:

- **Max raw input string length**: 500 characters (before split)
- **Max symbols array length**: 20 items (after split)
- **Symbol format regex**: `/^[A-Z0-9\/-]{1,10}$/` -- alphanumeric, slash, hyphen, 1-10 chars
- **String filter fields** (type, debtType, category): max 30 chars, alphanumeric + underscore only (`/^[a-zA-Z0-9_-]{1,30}$/`)

#### Per-Function Changes

**1. `api-price-feed/index.ts`** (lines 23-57)
- Truncate raw `symbolsParam` to 500 chars before splitting
- Filter split results through regex, cap at 20
- Validate `type` field format

**2. `api-price-feed-test/index.ts`** (lines 18-47)
- Same changes as above (identical parsing logic)

**3. `api-debt-strategy/index.ts`** (lines 23-56)
- Validate `debtType` field format and length

**4. `api-yield-analysis/index.ts`** (lines 23-56)
- Validate `category` field format and length

**5. `fetch-crypto-prices/index.ts`** (lines ~70-80)
- Cap incoming `symbols` array at 20 items
- Validate each symbol matches `/^[A-Z0-9]{1,10}$/`
- Return 400 error if symbols array exceeds limit

### Technical Details

Validation constants and regex (added at top of each function):

```typescript
const MAX_SYMBOLS = 20;
const MAX_INPUT_LENGTH = 500;
const SYMBOL_REGEX = /^[A-Z0-9\/-]{1,10}$/;
const FIELD_REGEX = /^[a-zA-Z0-9_-]{1,30}$/;

function sanitizeSymbols(raw: string): string[] {
  return raw
    .slice(0, MAX_INPUT_LENGTH)
    .split(",")
    .map(s => s.trim().toUpperCase())
    .filter(s => SYMBOL_REGEX.test(s))
    .slice(0, MAX_SYMBOLS);
}

function sanitizeField(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return FIELD_REGEX.test(trimmed) ? trimmed : null;
}
```

For `fetch-crypto-prices`, the array-based validation:

```typescript
const normalizedSymbols = symbols
  .map((s: string) => String(s).trim().toUpperCase())
  .filter((s: string) => /^[A-Z0-9]{1,10}$/.test(s))
  .slice(0, 20);

if (normalizedSymbols.length === 0) {
  return errorResponse('No valid symbols provided');
}
```

