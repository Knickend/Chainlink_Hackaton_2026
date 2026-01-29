import { Asset, Income, Expense, Debt, CommodityUnit } from './types';

export const mockAssets: Asset[] = [
  // Banking
  { id: '1', name: 'Chase Checking', category: 'banking', value: 15420, symbol: 'USD' },
  { id: '2', name: 'Chase Savings', category: 'banking', value: 52000, yield: 4.5, symbol: 'USD' },
  { id: '3', name: 'Ally High Yield Savings', category: 'banking', value: 28500, yield: 4.25, symbol: 'USD' },
  { id: '15', name: 'Euro Account', category: 'banking', value: 18500, yield: 2.1, quantity: 17000, symbol: 'EUR' },
  
  // Crypto
  { id: '4', name: 'Bitcoin', category: 'crypto', value: 48500, quantity: 0.505, symbol: 'BTC', yield: 0 },
  { id: '5', name: 'Ethereum', category: 'crypto', value: 12300, quantity: 3.8, symbol: 'ETH', yield: 3.2 },
  { id: '6', name: 'Solana', category: 'crypto', value: 4200, quantity: 21, symbol: 'SOL', yield: 5.5 },
  { id: '16', name: 'Chainlink', category: 'crypto', value: 2100, quantity: 150, symbol: 'LINK' },
  
  // Stocks
  { id: '7', name: 'S&P 500 ETF (VOO)', category: 'stocks', value: 85000, yield: 1.5, quantity: 175, symbol: 'VOO' },
  { id: '8', name: 'Apple Inc.', category: 'stocks', value: 24500, yield: 0.5, quantity: 110, symbol: 'AAPL' },
  { id: '9', name: 'Microsoft', category: 'stocks', value: 31200, yield: 0.8, quantity: 75, symbol: 'MSFT' },
  { id: '10', name: 'Dividend ETF (VYM)', category: 'stocks', value: 42000, yield: 3.2, quantity: 340, symbol: 'VYM' },
  { id: '17', name: 'NVIDIA', category: 'stocks', value: 18500, yield: 0.03, quantity: 15, symbol: 'NVDA' },
  
  // Commodities
  { id: '11', name: 'Gold Bullion', category: 'commodities', value: 38200, quantity: 15, symbol: 'GOLD', unit: 'oz' },
  { id: '12', name: 'Silver Coins', category: 'commodities', value: 8500, quantity: 280, symbol: 'SILVER', unit: 'oz' },
  { id: '13', name: 'Platinum', category: 'commodities', value: 4800, quantity: 5, symbol: 'PLATINUM', unit: 'oz' },
  { id: '14', name: 'Gold Bars', category: 'commodities', value: 12400, quantity: 200, symbol: 'GOLD', unit: 'g' },
];

export const mockIncome: Income[] = [
  { id: '1', source: 'Software Engineering Salary', amount: 12500, type: 'work', currency: 'USD' },
  { id: '2', source: 'Freelance Consulting', amount: 2500, type: 'work', currency: 'USD' },
  { id: '3', source: 'Dividend Income', amount: 480, type: 'investment', currency: 'USD' },
  { id: '4', source: 'Rental Property', amount: 1800, type: 'passive', currency: 'USD' },
  { id: '5', source: 'Interest Income', amount: 285, type: 'passive', currency: 'USD' },
  { id: '6', source: 'Staking Rewards', amount: 120, type: 'investment', currency: 'USD' },
];

export const mockExpenses: Expense[] = [
  { id: '1', name: 'Rent/Mortgage', amount: 2800, category: 'Housing', is_recurring: true, currency: 'USD' },
  { id: '2', name: 'Groceries', amount: 600, category: 'Food', is_recurring: true, currency: 'USD' },
  { id: '3', name: 'Utilities', amount: 250, category: 'Housing', is_recurring: true, currency: 'USD' },
  { id: '4', name: 'Car Payment', amount: 450, category: 'Transportation', is_recurring: true, currency: 'USD' },
  { id: '5', name: 'Insurance', amount: 380, category: 'Insurance', is_recurring: true, currency: 'USD' },
  { id: '6', name: 'Entertainment', amount: 300, category: 'Lifestyle', is_recurring: true, currency: 'USD' },
  { id: '7', name: 'Subscriptions', amount: 120, category: 'Lifestyle', is_recurring: true, currency: 'USD' },
  { id: '8', name: 'Dining Out', amount: 400, category: 'Food', is_recurring: true, currency: 'USD' },
  { id: '9', name: 'Car Repair', amount: 850, category: 'Emergency', is_recurring: false, expense_date: '2026-01-15', currency: 'USD' },
  { id: '10', name: 'New Laptop', amount: 1200, category: 'Electronics', is_recurring: false, expense_date: '2026-01-22', currency: 'USD' },
];

export const mockDebts: Debt[] = [
  { id: '1', name: 'Primary Mortgage', debt_type: 'mortgage', principal_amount: 285000, interest_rate: 6.5, monthly_payment: 2200, currency: 'USD' },
  { id: '2', name: 'Chase Sapphire', debt_type: 'credit_card', principal_amount: 4500, interest_rate: 19.99, monthly_payment: 250, currency: 'USD' },
  { id: '3', name: 'Auto Loan - Tesla', debt_type: 'auto_loan', principal_amount: 28000, interest_rate: 5.9, monthly_payment: 520, currency: 'USD' },
  { id: '4', name: 'Student Loans', debt_type: 'student_loan', principal_amount: 35000, interest_rate: 4.5, monthly_payment: 380, currency: 'USD' },
];

export const mockHistoricalData = [
  { month: 'Aug', netWorth: 345000 },
  { month: 'Sep', netWorth: 358000 },
  { month: 'Oct', netWorth: 352000 },
  { month: 'Nov', netWorth: 368000 },
  { month: 'Dec', netWorth: 382000 },
  { month: 'Jan', netWorth: 395120 },
];
