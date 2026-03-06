export interface TutorialStep {
  id: string;
  target: string | null; // data-tutorial attribute selector, null for modals
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to InControl!',
    content: "Let's take a quick tour to help you get the most out of your financial dashboard.",
  },
  {
    id: 'key-metrics',
    target: 'key-metrics',
    title: 'Your Financial Snapshot',
    content: 'These cards show your most important numbers at a glance - your total net worth, debt, monthly income, and what\'s left after expenses.',
    position: 'bottom',
  },
  {
    id: 'net-worth',
    target: 'net-worth-card',
    title: 'Net Worth',
    content: 'This is your total assets minus debts. It\'s the most important number for tracking your financial progress.',
    position: 'bottom',
  },
  {
    id: 'unit-selector',
    target: 'unit-selector',
    title: 'View in Different Currencies',
    content: 'Switch between USD, EUR, GBP, Bitcoin, or Gold to see all your values in your preferred unit.',
    position: 'bottom',
  },
  {
    id: 'theme-toggle',
    target: 'theme-toggle',
    title: 'Light or Dark Mode',
    content: 'Prefer a different look? Toggle between light and dark themes here.',
    position: 'bottom',
  },
  {
    id: 'charts',
    target: 'charts-section',
    title: 'Visualize Your Wealth',
    content: 'Track your net worth over time and see how your assets are allocated across different categories.',
    position: 'top',
  },
  {
    id: 'portfolio-history',
    target: 'portfolio-history-card',
    title: 'Track Your Progress',
    content: 'See how your net worth changes month-over-month. Compare any two months side-by-side to understand your financial trajectory. (Pro feature)',
    position: 'left',
  },
  {
    id: 'investment-strategy',
    target: 'investment-strategy-card',
    title: 'Smart Investment Advice',
    content: 'Get personalized recommendations on how to allocate your monthly surplus based on your debts and financial goals. (Pro feature)',
    position: 'top',
  },
  {
    id: 'assets',
    target: 'assets-section',
    title: 'Manage Your Assets',
    content: 'Add and track all types of assets - cash, stablecoins, real estate, cryptocurrency, stocks, bonds, ETFs, and commodities. Each category shows its total value and percentage of your portfolio.',
    position: 'top',
  },
  {
    id: 'add-asset',
    target: 'add-asset-button',
    title: 'Adding Assets is Easy',
    content: 'Click here to add any asset. For stocks and crypto, just search by name and we\'ll fetch live prices automatically!',
    position: 'bottom',
  },
  {
    id: 'income',
    target: 'income-card',
    title: 'Track Your Income',
    content: 'Add all your income sources - salary, side hustles, rental income, dividends. See your total monthly income at a glance.',
    position: 'top',
  },
  {
    id: 'expenses',
    target: 'expense-card',
    title: 'Monitor Expenses',
    content: 'Keep track of where your money goes. Add recurring monthly expenses to see how much you\'re really saving.',
    position: 'top',
  },
  {
    id: 'debts',
    target: 'debt-card',
    title: 'Manage Your Debt',
    content: 'Track mortgages, loans, and credit cards. See your total debt, monthly payments, and interest costs.',
    position: 'top',
  },
  {
    id: 'debt-calculator',
    target: 'debt-payoff-calculator',
    title: 'Debt Freedom Calculator',
    content: 'See exactly when you\'ll be debt-free with different payoff strategies. Compare avalanche vs. snowball methods to save the most interest. (Pro feature)',
    position: 'top',
  },
  {
    id: 'dca-strategies',
    target: 'dca-button',
    title: 'DCA Strategies',
    content: "Set up automated dollar-cost averaging powered by Chainlink CRE. Define buy schedules for any token, and the system executes trades through consensus-verified workflows. Access the full DCA dashboard here.",
    position: 'bottom',
  },
  {
    id: 'agent-settings',
    target: 'settings-button',
    title: 'Agent & Settings',
    content: "Manage your profile, subscription, and AI agent wallet. Connect an agentic wallet to enable DeFi skills like sending USDC, trading tokens, and privacy-preserving transfers via Chainlink ACE.",
    position: 'bottom',
  },
  {
    id: 'ai-advisor',
    target: 'ai-advisor-button',
    title: 'Your AI CFO',
    content: 'Have questions about investing, budgeting, or debt? Click here to chat with our AI CFO anytime.',
    position: 'left',
  },
  {
    id: 'feedback',
    target: 'feedback-button',
    title: 'Help Us Improve',
    content: 'Found a bug or have an idea? Click here to submit feedback directly to our team. We read every submission!',
    position: 'right',
  },
  {
    id: 'completion',
    target: null,
    title: "You're All Set!",
    content: 'Start by adding your first asset. The more data you add, the better insights you\'ll get. Happy tracking!',
  },
];
