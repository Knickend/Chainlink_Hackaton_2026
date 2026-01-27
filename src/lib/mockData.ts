import { Asset, Income, Expense } from './types';

export const mockAssets: Asset[] = [
  // Banking
  { id: '1', name: 'Chase Checking', category: 'banking', value: 15420, symbol: 'USD' },
  { id: '2', name: 'Chase Savings', category: 'banking', value: 52000, yield: 4.5, symbol: 'USD' },
  { id: '3', name: 'Ally High Yield Savings', category: 'banking', value: 28500, yield: 4.25, symbol: 'USD' },
  
  // Crypto
  { id: '4', name: 'Bitcoin', category: 'crypto', value: 48500, quantity: 0.505, symbol: 'BTC' },
  { id: '5', name: 'Ethereum', category: 'crypto', value: 12300, quantity: 3.8, symbol: 'ETH' },
  { id: '6', name: 'Solana', category: 'crypto', value: 4200, quantity: 21, symbol: 'SOL' },
  
  // Stocks
  { id: '7', name: 'S&P 500 ETF (VOO)', category: 'stocks', value: 85000, yield: 1.5, quantity: 175 },
  { id: '8', name: 'Apple Inc.', category: 'stocks', value: 24500, yield: 0.5, quantity: 110, symbol: 'AAPL' },
  { id: '9', name: 'Microsoft', category: 'stocks', value: 31200, yield: 0.8, quantity: 75, symbol: 'MSFT' },
  { id: '10', name: 'Dividend ETF (VYM)', category: 'stocks', value: 42000, yield: 3.2, quantity: 340 },
  
  // Precious Metals
  { id: '11', name: 'Gold Bullion', category: 'metals', value: 38200, quantity: 15, symbol: 'XAU' },
  { id: '12', name: 'Silver Coins', category: 'metals', value: 8500, quantity: 280, symbol: 'XAG' },
  { id: '13', name: 'Platinum', category: 'metals', value: 4800, quantity: 5, symbol: 'XPT' },
];

export const mockIncome: Income[] = [
  { id: '1', source: 'Software Engineering Salary', amount: 12500, type: 'work' },
  { id: '2', source: 'Freelance Consulting', amount: 2500, type: 'work' },
  { id: '3', source: 'Dividend Income', amount: 380, type: 'investment' },
  { id: '4', source: 'Rental Property', amount: 1800, type: 'passive' },
  { id: '5', source: 'Interest Income', amount: 285, type: 'passive' },
];

export const mockExpenses: Expense[] = [
  { id: '1', name: 'Rent/Mortgage', amount: 2800, category: 'Housing' },
  { id: '2', name: 'Groceries', amount: 600, category: 'Food' },
  { id: '3', name: 'Utilities', amount: 250, category: 'Housing' },
  { id: '4', name: 'Car Payment', amount: 450, category: 'Transportation' },
  { id: '5', name: 'Insurance', amount: 380, category: 'Insurance' },
  { id: '6', name: 'Entertainment', amount: 300, category: 'Lifestyle' },
  { id: '7', name: 'Subscriptions', amount: 120, category: 'Lifestyle' },
  { id: '8', name: 'Dining Out', amount: 400, category: 'Food' },
];

export const mockHistoricalData = [
  { month: 'Aug', netWorth: 345000 },
  { month: 'Sep', netWorth: 358000 },
  { month: 'Oct', netWorth: 352000 },
  { month: 'Nov', netWorth: 368000 },
  { month: 'Dec', netWorth: 382000 },
  { month: 'Jan', netWorth: 395120 },
];
