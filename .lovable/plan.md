

## Add POST and PUT Support to x402 APIs

This plan adds full HTTP method flexibility to the x402 monetized APIs, allowing AI agents to use POST/PUT with request bodies as an alternative to GET with query parameters.

---

## Current State

| Component | Current | Issue |
|-----------|---------|-------|
| CORS Methods | `GET, POST, OPTIONS` | Missing `PUT`, `PATCH`, `DELETE` |
| Request Parsing | Query params only | No `req.json()` body parsing |
| API Docs | Shows only GET examples | No POST/PUT documentation |

---

## Changes Overview

### 1. Update Shared CORS Headers

**File:** `supabase/functions/_shared/x402.ts`

Update the allowed methods to include all standard HTTP methods:

```typescript
"Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS"
```

### 2. Add Request Body Parsing to Endpoints

Each endpoint will accept filters from either:
- **Query parameters** (GET): `?type=crypto&symbols=BTC,ETH`
- **Request body** (POST/PUT):`{ "type": "crypto", "symbols": ["BTC", "ETH"] }`

**Files to update:**
- `supabase/functions/api-price-feed/index.ts`
- `supabase/functions/api-portfolio-summary/index.ts`
- `supabase/functions/api-yield-analysis/index.ts`
- `supabase/functions/api-debt-strategy/index.ts`

**Logic pattern for each endpoint:**

```typescript
// Parse filters from query params OR request body
let filters = { type: null, symbols: null };

if (req.method === "GET") {
  // From query params
  filters.type = url.searchParams.get("type");
  filters.symbols = url.searchParams.get("symbols")?.split(",");
} else if (["POST", "PUT", "PATCH"].includes(req.method)) {
  // From request body
  try {
    const body = await req.json();
    filters.type = body.type || null;
    filters.symbols = body.symbols || null;
  } catch {
    // Empty body is OK, use defaults
  }
}
```

### 3. Update API Documentation

**File:** `src/pages/ApiDocs.tsx`

Add POST examples alongside existing GET examples:

- Show both `GET` and `POST` badges on endpoint cards
- Add new tab for POST/PUT examples in the Integration Guide
- Update code samples to show request body format

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/_shared/x402.ts` | Add PUT, PATCH, DELETE to CORS |
| `supabase/functions/api-price-feed/index.ts` | Parse body for POST/PUT |
| `supabase/functions/api-portfolio-summary/index.ts` | Parse body for POST/PUT |
| `supabase/functions/api-yield-analysis/index.ts` | Parse body for POST/PUT |
| `supabase/functions/api-debt-strategy/index.ts` | Parse body for POST/PUT |
| `src/pages/ApiDocs.tsx` | Add POST/PUT documentation |

---

## API Usage Examples (After)

**GET (unchanged):**
```bash
curl -X GET "https://api/functions/v1/api-price-feed?type=crypto&symbols=BTC,ETH" \
  -H "X-Payment: <payment_proof>"
```

**POST (new):**
```bash
curl -X POST "https://api/functions/v1/api-price-feed" \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment_proof>" \
  -d '{"type": "crypto", "symbols": ["BTC", "ETH"]}'
```

**PUT (new):**
```bash
curl -X PUT "https://api/functions/v1/api-price-feed" \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment_proof>" \
  -d '{"symbols": ["GOLD", "SILVER"]}'
```

---

## Request Body Schema

All endpoints will accept an optional JSON body:

```json
{
  "type": "crypto | forex | commodities",  // Filter by asset type
  "symbols": ["BTC", "ETH", "GOLD"],        // Filter by symbols
  "limit": 50                                // Optional limit (max 100)
}
```

---

## Technical Notes

- **Backwards compatible**: GET with query params continues to work exactly as before
- **Method-agnostic filters**: Same filters work regardless of HTTP method
- **Empty body handling**: POST/PUT with empty body uses default filters (returns all data)
- **Error handling**: Invalid JSON body returns 400 Bad Request

