

## Fix: Tutorial Step 14 (Debt Payoff Calculator) Stuck When User Has No Debts

### Root Cause

When a logged-in user runs the tutorial, `isDemo` is `false`, so `demoDebts` uses their real debts (not mock data). If the user has zero debts, the condition `demoDebts.length > 0` is false, and the `data-tutorial="debt-payoff-calculator"` element is never rendered. The `TutorialOverlay` retries 5 times looking for the element, fails, shows a dark loading overlay, and the tour gets permanently stuck -- there are no skip/next buttons visible.

This is the same class of problem that was solved for Step 7 (Add Asset button) using a placeholder element in demo mode.

### Fix

In `src/pages/Index.tsx`, also use mock debts when the tutorial is active (same pattern as Pro tier override):

```
const demoDebts = (isDemo || isTutorialActive) ? mockDebts : debts;
const demoTotalDebt = (isDemo || isTutorialActive)
  ? mockDebts.reduce(...)
  : totalDebt;
const demoMonthlyPayments = (isDemo || isTutorialActive)
  ? mockDebts.reduce(...)
  : monthlyPayments;
const demoMonthlyInterest = (isDemo || isTutorialActive)
  ? mockDebts.reduce(...)
  : monthlyInterest;
```

This ensures the Debt Payoff Calculator (and the Debt Overview card at step 13) always renders with sample data during the tutorial, just like assets do in demo mode.

### Additionally: Prevent Future Stuck States

As a safety net, update `TutorialOverlay.tsx` so that if an element is not found after all retries, the overlay auto-advances to the next step instead of showing an indefinite dark screen:

```text
// In the retry logic (currently around line 104):
} else if (attempt < 5) {
  setTimeout(() => scrollToElement(attempt + 1), 200);
} else {
  console.warn(`Tutorial element not found: ${currentStepData.target}`);
  setTargetRect(null);
  nextStep();  // <-- auto-advance instead of getting stuck
}
```

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` (lines 178-181) | Use mock debts when `isTutorialActive` is true |
| `src/components/Tutorial/TutorialOverlay.tsx` (line ~108) | Auto-advance on missing target element instead of staying stuck |

### Why This Works

- The root fix ensures the calculator always has data to render during the tour
- The safety net prevents any future steps from causing the same stuck state if their target is conditionally rendered
- Matches the existing pattern used for Pro tier gating (`isPro` is already forced true during tutorial)

