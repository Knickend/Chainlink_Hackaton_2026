

## Fix: Chat Input Becomes Unresponsive After Editing Cards

### Problem
When you edit an expense, income, or other card (which opens a Radix Dialog), then try to use the AI CFO chat, the chat input stops accepting text. You have to refresh the page to fix it.

### Root Cause
The chat panel is rendered as a fixed-position element **inside** the main app DOM tree. When an edit dialog opens, Radix UI's Dialog component marks the rest of the page as `inert` (a browser attribute that disables all interaction). When the dialog closes, a React 19 cleanup timing issue can leave the `inert` attribute stuck, making the chat input permanently unresponsive.

### Solution
Render the chat panel using a **React Portal** so it lives outside the main DOM tree -- alongside Radix's own dialog portals, not underneath them. This means edit dialogs will never mark the chat panel as `inert`, completely avoiding the conflict.

### Changes

**1. `src/components/FinancialAdvisorChat.tsx`**
- Import `createPortal` from `react-dom`
- Wrap the entire chat output (floating button + chat panel) in a portal that renders to `document.body`
- This ensures the chat is a sibling of Radix Dialog portals, never a child that gets `inert`

**2. (Optional safeguard) Add a `MutationObserver`-based cleanup**
- As a belt-and-suspenders fix, add a small effect that watches for stale `inert` attributes on the chat container and removes them if detected after dialog close

### What Won't Change
- No visual or layout changes -- the chat will look and behave exactly the same
- No changes to any edit dialogs or cards
- No changes to the chat's internal state management

### Technical Details

```text
Current DOM structure:
  #root
    Index page content
      Cards + Edit Dialogs (portaled)
      FinancialAdvisorChat (fixed position, z-50)  <-- gets inert

Fixed DOM structure:
  #root
    Index page content
      Cards + Edit Dialogs (portaled)
  [portal] FinancialAdvisorChat (fixed position, z-50)  <-- never inert
```

The fix is minimal: wrapping the return JSX in `createPortal(jsx, document.body)` and adding a focus-recovery effect as a safety net.

