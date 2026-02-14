

## Fix: Onramp URL Not Appearing After Fund Approval

### Root Cause
There are two issues preventing the onramp URL from appearing:

1. **Unknown CDP response field name**: The backend casts the CDP response as `{ sessionUrl?: string }` but the actual CDP Onramp Sessions API likely returns the URL under a different field name (e.g., `session_url`, `url`, or `redirect_url`). Since `onrampResult?.sessionUrl` is `undefined`, `onramp_url` is sent as `null` to the frontend.

2. **No debug logging**: There are no logs showing the actual CDP onramp response, making it impossible to know the correct field name.

### Fix (Two Parts)

**Part 1: Add logging to the backend to capture the actual CDP response**

In `supabase/functions/agent-wallet/index.ts`, add a `console.log` of the raw CDP onramp response right after the API call (around line 693):

```typescript
const onrampResult = await cdpRequest('POST', '/platform/v2/onramp/sessions', { ... });
console.log('[AgentWallet] Onramp raw response:', JSON.stringify(onrampResult));
```

Then update the response to extract the URL from the correct field. Based on CDP documentation, the field is likely `redirect_url` or the response itself may be the URL string. We will dynamically extract it:

```typescript
// Try multiple possible field names from CDP response
const onrampUrl = onrampResult?.sessionUrl 
  || onrampResult?.redirect_url 
  || onrampResult?.url
  || (typeof onrampResult === 'string' ? onrampResult : null);
```

And use `onrampUrl` instead of `onrampResult?.sessionUrl`.

**Part 2: Ensure the frontend handles popup blockers gracefully**

The `window.open()` call in `useVoiceActions.ts` happens asynchronously (after an API call), so browsers will block it. Instead of relying on `window.open()`, we should always show the clickable link in the chat message and only attempt `window.open()` as a bonus. The current code already does this, so no change needed here -- the link will appear once `onramp_url` is no longer `null`.

### Files Modified
- `supabase/functions/agent-wallet/index.ts` -- add logging of raw CDP response and handle multiple possible URL field names

### Testing
After deploying, trigger "Fund my wallet with $5" again and check the backend function logs to see the actual CDP response shape. This will confirm the correct field name and the onramp URL should then propagate to the chat.
