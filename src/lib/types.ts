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

// Default conversion rates (updated dynamically with live prices)
export const DEFAULT_CONVERSION_RATES: Record<DisplayUnit, number> = {
  USD: 1,
  BTC: 0.0000104, // 1 USD = X BTC (based on ~96k BTC)
  GOLD: 0.000377, // 1 USD = X oz of gold (based on ~2650/oz)
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

// Helper to calculate conversion rates from live prices
export function calculateConversionRates(btcPrice: number, goldPrice: number): Record<DisplayUnit, number> {
  return {
    USD: 1,
    BTC: 1 / btcPrice,
    GOLD: 1 / goldPrice,
    EUR: 0.92,
    GBP: 0.79,
  };
}
