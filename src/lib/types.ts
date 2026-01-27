export type AssetCategory = 'banking' | 'crypto' | 'stocks' | 'metals';

export type DisplayUnit = 'USD' | 'BTC' | 'GOLD' | 'EUR' | 'GBP';

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  value: number; // in USD
  yield?: number; // annual yield percentage
  quantity?: number;
  symbol?: string;
}

export interface Income {
  id: string;
  source: string;
  amount: number; // monthly in USD
  type: 'work' | 'passive' | 'investment';
}

export interface Expense {
  id: string;
  name: string;
  amount: number; // monthly in USD
  category: string;
}

export interface PortfolioMetrics {
  totalNetWorth: number;
  totalIncome: number;
  totalExpenses: number;
  monthlyNetIncome: number;
  yearlyYield: number;
}

// Conversion rates (would be fetched from API in production)
export const CONVERSION_RATES: Record<DisplayUnit, number> = {
  USD: 1,
  BTC: 0.0000104, // 1 USD = X BTC
  GOLD: 0.000385, // 1 USD = X oz of gold
  EUR: 0.92,
  GBP: 0.79,
};

export const UNIT_SYMBOLS: Record<DisplayUnit, string> = {
  USD: '$',
  BTC: '₿',
  GOLD: 'oz',
  EUR: '€',
  GBP: '£',
};
