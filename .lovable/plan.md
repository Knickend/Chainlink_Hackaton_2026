
Goal
- Fix the onboarding tour so:
  - Step 6 (“Manage Your Assets” / target: `assets-section`) spotlights the correct UI consistently.
  - Step 7 (“Adding Assets is Easy” / target: `add-asset-button`) always finds a valid element and spotlights it correctly.
- Make the solution robust across scrolling, different viewport sizes, and zoom levels.

What’s happening (root cause analysis)
1) Spotlight coordinate system mismatch (main cause of “highlights partly the incorrect part”)
- `TutorialOverlay` uses `element.getBoundingClientRect()` (viewport coordinates) but then adds `window.scrollY` to the `top` and tooltip positions.
- The spotlight/tooltip are rendered with `position: fixed`, which expects viewport coordinates, not document coordinates.
- Result: when the page scrolls (which begins around steps 6–7), the spotlight/tooltip can drift or appear offset, partially highlighting the wrong area.

2) The tour triggers scrolling at the wrong time and too often
- `updateTargetPosition()` currently does:
  - measure rect
  - set spotlight
  - then call `element.scrollIntoView({ behavior: 'smooth' ... })`
- Additionally, `updateTargetPosition` is attached to `scroll` events, so the `scrollIntoView` can fire repeatedly during scrolling, producing unstable measurements and jumpy/incorrect spotlight placement.

3) Step 7 can legitimately fail if the “Add Asset” control isn’t rendered (likely in demo mode)
- In `src/pages/Index.tsx`, the element containing `data-tutorial="add-asset-button"` is only rendered when `!isDemo`.
- If the user runs the tour while not signed in (demo mode), step 7’s element doesn’t exist, so the tour appears “broken” on that step.

Key changes (high level)
A) Fix spotlight measurement + positioning to use one coordinate system (viewport/fixed)
- Remove all `window.scrollY` usage from spotlight and tooltip calculations.
- Clamp tooltip position using `window.innerWidth` / `window.innerHeight` (viewport), not `document.documentElement.scrollHeight`.

B) Decouple “scroll the element into view” from “measure the element”
- Only call `scrollIntoView` when the step changes (not on every scroll event).
- Measure after scrolling begins/settles (simple approach: measure immediately, then measure again after a short delay; or use a small requestAnimationFrame loop).

C) Make step 6 target a smaller, unambiguous element
- Currently `data-tutorial="assets-section"` is on the whole section container, which can be very tall. That makes the spotlight huge and can look “partly wrong” (especially on smaller screens).
- Move `data-tutorial="assets-section"` to the assets header row (title + action buttons) so the spotlight always highlights a clear, correct “anchor” element.

D) Ensure step 7 always has a target
- Ensure there is always an element with `data-tutorial="add-asset-button"`:
  - If logged in: wrap the real `AddAssetDialog` trigger area.
  - If demo mode: render a compact “Add Asset” CTA button in the same location that routes to `/auth` (or shows a “Sign in to add assets” message), but still provides a stable tutorial target.

Files to modify
1) `src/components/Tutorial/TutorialOverlay.tsx`
2) `src/pages/Index.tsx`

Detailed implementation steps

1) Update `TutorialOverlay` spotlight/tooltip math (viewport coordinates only)
- In `setTargetRect`:
  - Change:
    - `top: rect.top - padding + window.scrollY`
  - To:
    - `top: rect.top - padding`
  - Keep:
    - `left: rect.left - padding`
- In tooltip calculation:
  - Remove all `+ window.scrollY`.
  - Compute `top/left` entirely from rect values.
- Clamp tooltip within viewport:
  - Replace:
    - `top = Math.min(top, document.documentElement.scrollHeight - tooltipHeight - margin)`
  - With:
    - `top = Math.min(top, window.innerHeight - tooltipHeight - margin)`
  - Keep left clamp similarly using `window.innerWidth`.

2) Stop calling `scrollIntoView` inside `updateTargetPosition`
- Remove `element.scrollIntoView(...)` from inside the measure/update function.
- Reason: This function is also invoked by scroll events; it should never trigger scrolling, only measure and update.

3) Add a “scroll on step change” effect (runs once per step)
- Add a `useEffect` keyed to `isActive` and `currentStepData?.target`:
  - Find the element with the same retry logic.
  - If found, only scroll it into view if needed (e.g., if it’s partially off screen).
  - After initiating scroll:
    - call `updateTargetPosition()` immediately
    - call it again after ~250–400ms (to allow smooth scroll to progress and layout to settle)
- This makes the overlay stable and fixes “step 6/7 are offset” cases.

4) Improve element selection reliability (optional but recommended)
- If `querySelector` returns an element that has `rect.width === 0 || rect.height === 0` (hidden), retry and/or select the first visible match from `querySelectorAll`.
- This prevents accidentally measuring a hidden wrapper.

5) Make step 6 spotlight smaller/clearer in `Index.tsx`
- Move `data-tutorial="assets-section"` from:
  - the outer `<div className="mb-8" ...>`
- To:
  - the header row `<div className="flex items-center justify-between mb-4">`
- This ensures the spotlight matches “Assets by Category” area precisely and doesn’t include a huge grid region.

6) Ensure step 7 always has a target in `Index.tsx`
- Replace the current:
  - `{!isDemo && <div data-tutorial="add-asset-button"><AddAssetDialog ... /></div>}`
- With logic that always renders a `data-tutorial="add-asset-button"` wrapper:
  - Logged in: show the real `AddAssetDialog`.
  - Demo: show a button in the same place that navigates to `/auth` (or opens the auth page) with label like “Add Asset” or “Sign in to add”.
- This prevents step 7 from ever being “missing”, even when the user runs the tour in demo mode.

Acceptance criteria (how we’ll know it’s fixed)
- Step 6:
  - Spotlights the “Assets by Category” header row cleanly (not partially offset, not covering unrelated areas).
- Step 7:
  - Always shows a spotlight:
    - Logged in: highlights the actual “Add Asset” button.
    - Demo: highlights the “Sign in to add” (or similar) CTA in the same position.
- During steps 6–7, the spotlight stays attached to the target while scrolling occurs (no drifting due to scroll offset issues).
- Tooltip stays inside the viewport and doesn’t jump to odd places on long pages.

Test plan (end-to-end)
- Desktop:
  - Run the tour from start through step 7 at 100% zoom.
  - Repeat at 125% zoom (this often reproduces offset/layout edge cases).
  - Resize the window so steps 6–7 require scrolling; verify spotlight stays accurate.
- Mobile-sized viewport (or narrow desktop window):
  - Run through step 7 and confirm tooltip placement remains readable.
- Demo mode vs logged-in mode:
  - Verify step 7 still works in demo mode (CTA exists and is highlighted).
  - Verify step 7 works in logged-in mode (real AddAssetDialog is highlighted).

Risks / tradeoffs
- If we keep smooth scrolling, measurement timing can vary slightly per device. The “measure immediately + re-measure after delay” approach mitigates this without adding heavy complexity.
- Changing `assets-section` target to the header row is a UX change (smaller spotlight), but it directly addresses the “partly incorrect” perception and makes the tour clearer.

After this fix
- If you still see any step highlighting the wrong element, we can add a small debug log in the overlay (step id + rect values) to quickly pinpoint whether the wrong DOM node is being selected or if a layout transform is affecting coordinates.
