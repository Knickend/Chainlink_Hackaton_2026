

# Add DCA & Agent Tutorial Steps

## Problem
The tutorial only covers the main dashboard (/app). The DCA button and Settings button are in the header but have no `data-tutorial` attributes and no corresponding tutorial steps.

## Approach
Since the tutorial works by highlighting `data-tutorial` elements on the current page, and the DCA/Agent features live on separate pages, we'll highlight the **navigation buttons** on the dashboard header that lead to those pages. The tutorial text will explain what users will find when they click through.

## Changes

### 1. `src/pages/Index.tsx` — Add `data-tutorial` attributes
- Add `data-tutorial="dca-button"` to the DCA navigation button (line ~267)
- Add `data-tutorial="settings-button"` to the Settings button (line ~301)

### 2. `src/components/Tutorial/tutorialSteps.ts` — Add 2 new steps

Insert before the `ai-advisor` step (after `debt-calculator`):

**DCA step:**
- id: `dca-strategies`
- target: `dca-button`
- title: "DCA Strategies"
- content: "Set up automated dollar-cost averaging powered by Chainlink CRE. Define buy schedules for any token, and the system executes trades through consensus-verified workflows. Access the full DCA dashboard here."
- position: `bottom`

**Agent/Settings step:**
- id: `agent-settings`
- target: `settings-button`
- title: "Agent & Settings"
- content: "Manage your profile, subscription, and AI agent wallet. Connect an agentic wallet to enable DeFi skills like sending USDC, trading tokens, and privacy-preserving transfers via Chainlink ACE."
- position: `bottom`

Note: The DCA button only shows when the wallet is connected (`walletStatus.connected`). If it's not visible during the tour, the overlay will auto-advance past it (existing behavior in `TutorialOverlay.tsx` line 123). This is acceptable — users without a wallet don't need the DCA step.

