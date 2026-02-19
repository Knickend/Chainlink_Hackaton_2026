

# Fix Coinbase Onramp UX in Preview Environment

## Problem

Two remaining issues after the previous fix:

1. **The toast notification shows raw markdown** -- when the fund action succeeds, `toast({ title: result.message })` displays the raw markdown link text `**[Open Coinbase Pay here](https://...)** to complete payment` instead of a clean message. The toast component doesn't render markdown.

2. **`window.open` is blocked by the iframe sandbox** -- the Lovable preview runs inside a sandboxed iframe, so `window.open` silently fails. The markdown link in the chat bubble *should* be clickable (ReactMarkdown renders it), but users need to know to click it there, not rely on a new tab opening.

## Solution

### 1. Fix the toast to show a clean message (not markdown)

In `handleConfirmAction` in `FinancialAdvisorChat.tsx`, strip the markdown from the toast message. For FUND_WALLET specifically, show a simple toast like "Onramp session created -- use the link in chat to complete payment."

### 2. Ensure the markdown link opens in a new tab

Add a custom `components` prop to the ReactMarkdown renderer so that all links open with `target="_blank"` and `rel="noopener noreferrer"`, and are visually styled as clickable links (underline, color).

### 3. Keep `window.open` as best-effort (already done)

The `try { window.open(...) } catch {}` in `useVoiceActions.ts` stays. On the published site it will work; in preview it won't, but the clickable link in chat is the reliable fallback.

## Files Changed

| File | Change |
|------|--------|
| `src/components/FinancialAdvisorChat.tsx` | Strip markdown from toast title for fund wallet results; add `target="_blank"` to ReactMarkdown link rendering |

