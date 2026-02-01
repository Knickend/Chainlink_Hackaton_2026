
# Add Rate Limiting to AI Edge Functions

## Overview
Implement application-level rate limiting for the `financial-advisor` and `sales-bot` edge functions to prevent API abuse. This will protect against excessive usage, reduce costs, and ensure fair access for all users.

## Current State
- Both functions currently have no rate limiting
- They rely only on the downstream Lovable AI gateway's rate limits (429 responses)
- Anyone can spam requests, consuming API credits and degrading service

## Implementation Strategy

### Rate Limiting Approach: In-Memory Token Bucket
Since Edge Functions are stateless and short-lived, we'll use an **in-memory rate limiter per function instance** with the following characteristics:

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Window** | 1 minute | Short enough to prevent bursts, long enough to be user-friendly |
| **Max requests** | 10 per IP (sales-bot) | Landing page visitors need limited interactions |
| **Max requests** | 20 per IP (financial-advisor) | Authenticated users may have longer conversations |

### Rate Limit Key
- **Sales bot**: Client IP address (unauthenticated visitors)
- **Financial advisor**: User ID from JWT (authenticated) or IP as fallback

## Technical Implementation

### Rate Limiter Logic
```typescript
// Simple in-memory rate limiter using Map
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true; // Allowed
  }
  
  if (record.count >= maxRequests) {
    return false; // Rate limited
  }
  
  record.count++;
  return true; // Allowed
}
```

### IP Extraction
```typescript
function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
    || req.headers.get("x-real-ip") 
    || "unknown";
}
```

### Response Headers
Add standard rate limit headers for transparency:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when window resets

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/financial-advisor/index.ts` | Add rate limiter (20 req/min per user) |
| `supabase/functions/sales-bot/index.ts` | Add rate limiter (10 req/min per IP) |

## Rate Limited Response
When rate limited, return a friendly 429 response:

```json
{
  "error": "You're sending messages too quickly. Please wait a moment before trying again."
}
```

## Edge Cases Handled
- **Cleanup**: Old entries are automatically overwritten when the window expires
- **Memory**: Map size is bounded by unique IPs/users within the window
- **Graceful degradation**: If IP detection fails, uses "unknown" as key (shared limit)

## Limitations Note
Since Edge Functions can run on multiple instances, this provides per-instance rate limiting rather than global. For stricter enforcement, a database-backed solution would be needed, but this approach provides good protection against most abuse scenarios with zero additional infrastructure.
