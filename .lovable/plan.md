
# First-Time User Tutorial Implementation

## Overview

Create an interactive, step-by-step tutorial that guides new users through all the features of InControl. The tutorial will use a spotlight/tooltip approach that highlights different areas of the dashboard and explains their functionality in simple terms.

---

## Tutorial Features to Cover

Based on the app analysis, the tutorial will cover these key areas:

1. **Welcome & Dashboard Overview** - Introduction to InControl
2. **Key Metrics** - Net Worth, Total Debt, Monthly Income, Monthly Net, Yield
3. **Unit Selector** - Switch between USD, EUR, GBP, BTC, Gold
4. **Charts** - Net Worth trend and Asset Allocation pie chart
5. **Assets** - Adding and managing different asset types (Banking, Crypto, Stocks, Commodities)
6. **Income Tracking** - Adding income sources (work, passive, investment)
7. **Expense Tracking** - Managing recurring and one-time expenses
8. **Debt Management** - Adding and tracking debts
9. **AI Financial Advisor** - Using the chat feature for financial guidance
10. **Pro Features** - Investment Strategy, Debt Payoff Calculator, Portfolio History

---

## User Experience Flow

```text
User Signs Up / First Login
       |
       v
+------------------+
|  Welcome Modal   |  "Welcome to InControl! Would you like a quick tour?"
|  [Start Tour]    |  [Skip]
+------------------+
       |
       v
Step-by-step spotlight tour
highlighting each feature
       |
       v
+------------------+
|  Tour Complete!  |  "You're ready to start tracking your wealth!"
|  [Get Started]   |
+------------------+
```

---

## Technical Implementation

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/Tutorial/TutorialProvider.tsx` | Context provider for tutorial state |
| `src/components/Tutorial/TutorialOverlay.tsx` | Spotlight overlay with tooltip |
| `src/components/Tutorial/TutorialStep.tsx` | Individual step component |
| `src/components/Tutorial/WelcomeModal.tsx` | Initial welcome modal |
| `src/components/Tutorial/CompletionModal.tsx` | Tutorial completion celebration |
| `src/components/Tutorial/tutorialSteps.ts` | Step definitions and content |
| `src/hooks/useTutorial.ts` | Hook for managing tutorial state |

### Database Changes

Add a column to track tutorial completion:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_completed_tutorial BOOLEAN DEFAULT false;
```

---

## Tutorial Steps Content

### Step 1: Welcome
- **Target**: None (modal)
- **Title**: "Welcome to InControl!"
- **Content**: "Let's take a quick tour to help you get the most out of your financial dashboard."

### Step 2: Key Metrics Overview
- **Target**: Stats cards section
- **Title**: "Your Financial Snapshot"
- **Content**: "These cards show your most important numbers at a glance - your total net worth, debt, monthly income, and what's left after expenses."

### Step 3: Net Worth Card
- **Target**: Net Worth stat card
- **Title**: "Net Worth"
- **Content**: "This is your total assets minus debts. It's the most important number for tracking your financial progress."

### Step 4: Unit Selector
- **Target**: Unit selector buttons
- **Title**: "View in Different Currencies"
- **Content**: "Switch between USD, EUR, GBP, Bitcoin, or Gold to see all your values in your preferred unit."

### Step 5: Theme Toggle
- **Target**: Theme toggle button
- **Title**: "Light or Dark Mode"
- **Content**: "Prefer a different look? Toggle between light and dark themes here."

### Step 6: Charts Section
- **Target**: Charts row
- **Title**: "Visualize Your Wealth"
- **Content**: "Track your net worth over time and see how your assets are allocated across different categories."

### Step 7: Assets Section
- **Target**: Assets by Category section
- **Title**: "Manage Your Assets"
- **Content**: "Add and track all types of assets - bank accounts, crypto, stocks, and commodities. Each category shows its total value and percentage of your portfolio."

### Step 8: Add Asset Button
- **Target**: Add Asset button
- **Title**: "Adding Assets is Easy"
- **Content**: "Click here to add any asset. For stocks and crypto, just search by name and we'll fetch live prices automatically!"

### Step 9: Income Card
- **Target**: Income card
- **Title**: "Track Your Income"
- **Content**: "Add all your income sources - salary, side hustles, rental income, dividends. See your total monthly income at a glance."

### Step 10: Expense Card
- **Target**: Expense card
- **Title**: "Monitor Expenses"
- **Content**: "Keep track of where your money goes. Add recurring monthly expenses to see how much you're really saving."

### Step 11: Debt Card
- **Target**: Debt overview card
- **Title**: "Manage Your Debt"
- **Content**: "Track mortgages, loans, and credit cards. See your total debt, monthly payments, and interest costs."

### Step 12: AI Advisor Button
- **Target**: Floating chat button
- **Title**: "Your AI Financial Advisor"
- **Content**: "Have questions about investing, budgeting, or debt? Click here to chat with our AI financial advisor anytime."

### Step 13: Pro Features (if applicable)
- **Target**: Investment Strategy or Debt Calculator section
- **Title**: "Unlock Pro Features"
- **Content**: "Upgrade to Pro for investment strategy recommendations, detailed debt payoff calculators, and portfolio performance tracking."

### Step 14: Completion
- **Target**: None (modal)
- **Title**: "You're All Set!"
- **Content**: "Start by adding your first asset. The more data you add, the better insights you'll get. Happy tracking!"

---

## Component Structure

### TutorialProvider
```typescript
interface TutorialState {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  hasCompletedTutorial: boolean;
}

// Provides context for:
// - Starting/stopping the tutorial
// - Navigating between steps
// - Marking tutorial as complete
```

### TutorialOverlay
- Creates a dark overlay with a spotlight "hole" around the target element
- Positions a tooltip near the highlighted element
- Includes Next/Previous/Skip buttons
- Uses Framer Motion for smooth transitions

### Tutorial Tooltip Content
- Step indicator (e.g., "3 of 14")
- Title
- Description text
- Navigation buttons (Previous, Next, Skip)
- Progress bar

---

## Integration Points

### Index.tsx Changes
- Import and wrap with TutorialProvider
- Add `data-tutorial` attributes to key elements for targeting
- Show welcome modal on first visit

### Database Integration
- Check `has_completed_tutorial` on load
- Update to `true` when tutorial completes or is skipped
- Allow restart from settings if needed

---

## Accessibility Considerations

- Keyboard navigation (arrow keys, Escape to exit)
- Screen reader announcements for each step
- High contrast spotlight border
- Focus management between steps

---

## Mobile Responsiveness

- Smaller tooltip on mobile
- Vertical layout for tooltip content
- Touch-friendly navigation buttons
- Adjust spotlight positioning for scrollable content

---

## Summary of Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/Tutorial/TutorialProvider.tsx` | Create | Context and state management |
| `src/components/Tutorial/TutorialOverlay.tsx` | Create | Spotlight overlay component |
| `src/components/Tutorial/TutorialStep.tsx` | Create | Step content renderer |
| `src/components/Tutorial/WelcomeModal.tsx` | Create | Initial tour prompt |
| `src/components/Tutorial/CompletionModal.tsx` | Create | Celebration on completion |
| `src/components/Tutorial/tutorialSteps.ts` | Create | Step definitions |
| `src/hooks/useTutorial.ts` | Create | Tutorial state hook |
| `src/pages/Index.tsx` | Modify | Add tutorial integration and data attributes |
| `supabase/migrations/xxx.sql` | Create | Add `has_completed_tutorial` column |

---

## Optional Enhancements

- **Restart Tutorial**: Add button in settings to restart the tour
- **Feature-Specific Tours**: Mini-tutorials when users first access Pro features
- **Progress Persistence**: Remember which step user was on if they close mid-tutorial
- **Animated Mascot**: Add a friendly character to guide the tour
