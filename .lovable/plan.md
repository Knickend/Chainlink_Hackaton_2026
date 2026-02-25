

# Harden moltbook-register Edge Function

## Overview
Add rate limiting and input sanitization to prevent abuse and prompt injection attacks on the Moltbook proxy.

## Changes (single file: `supabase/functions/moltbook-register/index.ts`)

### 1. Rate Limiting
- In-memory rate limiter (same pattern used in `sales-bot`): 10 requests per minute per IP
- Return 429 with retry info when exceeded

### 2. Input Sanitization
- **Action whitelist**: Only allow known action strings (register, home, status, feed, post, comment, read-comments, dm-requests, verify, skill-version)
- **String field limits**: Truncate `title` (200 chars), `content` (2000 chars), `submolt_name` (50 chars), `verification_code` (100 chars), `answer` (100 chars)
- **Field validation**: `post_id` and `parent_id` must match a safe pattern (alphanumeric/hyphens only, max 50 chars)
- **Strip control characters**: Remove non-printable characters from all string inputs to prevent prompt injection if Moltbook processes them

### 3. Security Headers
- Add rate limit headers to all responses (X-RateLimit-Limit, Remaining, Reset)

### Technical Details

```text
Request Flow:
  Client --> CORS check --> Rate limit --> Validate action --> Sanitize inputs --> Proxy to Moltbook API
```

All sanitization happens before any data leaves the function. No changes to the action routing logic itself -- just wrapping inputs through validation before they're forwarded.

