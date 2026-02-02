export type AssetCategory = 'banking' | 'crypto' | 'stocks' | 'commodities';

export type DisplayUnit = 'USD' | 'BTC' | 'GOLD' | 'EUR' | 'GBP';

export type BankingCurrency = 'USD' | 'EUR' | 'GBP' | 'CHF' | 'JPY' | 'CAD' | 'AUD' | 'CNY' | 'INR' | 'SGD' | 'HKD' | 'NZD' | 'SEK' | 'NOK' | 'DKK' | 'ZAR' | 'BRL' | 'MXN' | 'KRW' | 'THB';

export type CommodityUnit = 'oz' | 'g' | 'kg';

export const COMMODITY_UNITS: { value: CommodityUnit; label: string; toTroyOz: number }[] = [
  { value: 'oz', label: 'Troy Ounce (oz)', toTroyOz: 1 },
  { value: 'g', label: 'Gram (g)', toTroyOz: 0.0321507 }, // 1 gram = 0.0321507 troy oz
  { value: 'kg', label: 'Kilogram (kg)', toTroyOz: 32.1507 }, // 1 kg = 32.1507 troy oz
];

export const BANKING_CURRENCIES: { value: BankingCurrency; label: string; symbol: string }[] = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { value: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { value: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { value: 'CNY', label: 'Chinese Yuan', symbol: '¥' },
  { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { value: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
  { value: 'HKD', label: 'Hong Kong Dollar', symbol: 'HK$' },
  { value: 'NZD', label: 'New Zealand Dollar', symbol: 'NZ$' },
  { value: 'SEK', label: 'Swedish Krona', symbol: 'kr' },
  { value: 'NOK', label: 'Norwegian Krone', symbol: 'kr' },
  { value: 'DKK', label: 'Danish Krone', symbol: 'kr' },
  { value: 'ZAR', label: 'South African Rand', symbol: 'R' },
  { value: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  { value: 'MXN', label: 'Mexican Peso', symbol: '$' },
  { value: 'KRW', label: 'South Korean Won', symbol: '₩' },
  { value: 'THB', label: 'Thai Baht', symbol: '฿' },
];

// Approximate forex rates to USD (fallback values when live rates unavailable)
export const FOREX_RATES_TO_USD: Record<BankingCurrency, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CHF: 1.13,
  JPY: 0.0064,
  CAD: 0.74,
  AUD: 0.65,
  CNY: 0.14,
  INR: 0.012,
  SGD: 0.74,
  HKD: 0.13,
  NZD: 0.60,
  SEK: 0.095,
  NOK: 0.093,
  DKK: 0.145,
  ZAR: 0.055,
  BRL: 0.20,
  MXN: 0.058,
  KRW: 0.00073,
  THB: 0.029,
};

// Get forex rate to USD using live rates with fallback to static
export function getForexRateToUSD(
  currency: string, 
  liveRates?: Record<string, number>
): number {
  // USD is always 1
  if (currency === 'USD') return 1;
  
  // Live rate takes priority (API returns USD→Currency, we need Currency→USD)
  if (liveRates && liveRates[currency] && liveRates[currency] > 0) {
    return 1 / liveRates[currency];
  }
  
  // Fallback to static rates
  return FOREX_RATES_TO_USD[currency as BankingCurrency] || 1;
}

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  value: number; // in USD (or original currency amount for banking with forex)
  yield?: number; // annual yield percentage
  quantity?: number; // for banking, this stores the original currency amount
  symbol?: string; // for banking, this stores the currency code (USD, EUR, etc.)
  unit?: CommodityUnit; // for commodities, the measurement unit
  // P&L tracking fields
  cost_basis?: number; // Total amount paid for this asset (in USD)
  purchase_date?: string; // ISO date string when asset was acquired
  purchase_price_per_unit?: number; // Price paid per unit at purchase (in USD)
}

// Asset transaction types for P&L tracking
export type TransactionType = 'buy' | 'sell';

export interface AssetTransaction {
  id: string;
  user_id: string;
  asset_id?: string;
  transaction_type: TransactionType;
  symbol: string;
  asset_name: string;
  category: string;
  quantity: number;
  price_per_unit: number;
  total_value: number;
  realized_pnl?: number;
  transaction_date: string;
  notes?: string;
  created_at: string;
}

// Helper to convert commodity quantity to troy ounces (for price calculation)
export function convertToTroyOz(quantity: number, unit: CommodityUnit): number {
  const unitConfig = COMMODITY_UNITS.find(u => u.value === unit);
  return quantity * (unitConfig?.toTroyOz ?? 1);
}

// Helper to get unit label
export function getUnitLabel(unit: CommodityUnit): string {
  const unitConfig = COMMODITY_UNITS.find(u => u.value === unit);
  return unitConfig?.label ?? unit;
}

// Bitcoin currency types for mining income
export type BitcoinCurrency = 'BTC' | 'SATS';

export const BITCOIN_CURRENCIES: { value: BitcoinCurrency; label: string; symbol: string }[] = [
  { value: 'BTC', label: 'Bitcoin (BTC)', symbol: '₿' },
  { value: 'SATS', label: 'Satoshis (sats)', symbol: 'sats' },
];

// Helper to convert BTC/SATS to USD
export function convertBtcToUSD(amount: number, currency: BitcoinCurrency, btcPrice: number): number {
  if (currency === 'SATS') {
    // Convert sats to BTC first (1 BTC = 100,000,000 sats)
    const btcAmount = amount / 100_000_000;
    return btcAmount * btcPrice;
  }
  // Direct BTC to USD
  return amount * btcPrice;
}

// Check if a currency is a Bitcoin denomination
export function isBitcoinCurrency(currency: string): currency is BitcoinCurrency {
  return currency === 'BTC' || currency === 'SATS';
}

// Get Bitcoin currency symbol
export function getBitcoinCurrencySymbol(currency: BitcoinCurrency): string {
  const curr = BITCOIN_CURRENCIES.find(c => c.value === currency);
  return curr?.symbol || currency;
}

export interface Income {
  id: string;
  source: string;
  amount: number; // in original currency (can be BTC, SATS, or fiat)
  type: 'work' | 'passive' | 'investment' | 'mining' | 'other';
  currency: string; // 'USD', 'EUR', 'GBP', 'BTC', 'SATS', etc.
  is_recurring: boolean; // true for monthly recurring, false for one-time
  income_date?: string; // ISO date string for one-time income
}

export interface Expense {
  id: string;
  name: string;
  amount: number; // in original currency
  category: string;
  is_recurring: boolean; // true for monthly recurring, false for one-time
  expense_date?: string; // ISO date string for one-time expenses
  currency: string; // 'USD', 'EUR', 'GBP', etc.
}

export type DebtType = 'mortgage' | 'credit_card' | 'personal_loan' | 'auto_loan' | 'student_loan' | 'other';

export const DEBT_TYPES: { value: DebtType; label: string }[] = [
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'auto_loan', label: 'Auto Loan' },
  { value: 'student_loan', label: 'Student Loan' },
  { value: 'other', label: 'Other' },
];

export interface Debt {
  id: string;
  name: string;
  debt_type: DebtType;
  principal_amount: number; // in original currency
  interest_rate: number; // annual percentage
  monthly_payment?: number; // in original currency
  currency: string; // 'USD', 'EUR', 'GBP', etc.
}

export interface InvestmentPreferences {
  id: string;
  user_id: string;
  stocks_allocation: number;
  crypto_allocation: number;
  commodities_allocation: number;
  emergency_fund_target: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioMetrics {
  totalNetWorth: number;
  totalIncome: number;
  totalExpenses: number;
  totalDebt: number;
  monthlyDebtPayments: number;
  monthlyInterestExpense: number;
  monthlyNetIncome: number;
  yearlyYield: number;
  // Breakdown fields for UI display
  recurringIncome: number;
  oneTimeIncome: number;
  recurringExpenses: number;
  oneTimeExpenses: number;
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
// Accepts optional live forex rates for consistent conversions
export function calculateConversionRates(
  btcPrice: number, 
  goldPrice: number,
  liveForexRates?: Record<string, number>
): Record<DisplayUnit, number> {
  // For EUR/GBP: API returns USD→Currency rate (e.g., 0.84459 means 1 USD = 0.84459 EUR)
  // So to convert FROM USD to EUR, we multiply by this rate
  const eurRate = liveForexRates?.EUR ?? 0.92;
  const gbpRate = liveForexRates?.GBP ?? 0.79;
  
  return {
    USD: 1,
    BTC: 1 / btcPrice,
    GOLD: 1 / goldPrice,
    EUR: eurRate,
    GBP: gbpRate,
  };
}

// Helper to convert banking currency to USD (supports live forex rates)
export function convertToUSD(
  amount: number, 
  currency: string, 
  liveForexRates?: Record<string, number>
): number {
  const rate = getForexRateToUSD(currency, liveForexRates);
  return amount * rate;
}

// Helper to convert from one fiat currency to another via USD (supports live forex rates)
export function convertCurrency(
  amount: number, 
  fromCurrency: string, 
  toCurrency: string,
  liveForexRates?: Record<string, number>
): number {
  // If same currency, no conversion needed
  if (fromCurrency === toCurrency) return amount;
  
  // Convert to USD first
  const amountInUSD = convertToUSD(amount, fromCurrency, liveForexRates);
  
  // Then convert from USD to target currency
  const targetRate = getForexRateToUSD(toCurrency, liveForexRates);
  if (!targetRate) return amountInUSD; // If target not found, return USD amount
  
  return amountInUSD / targetRate;
}

// Helper to get currency symbol
export function getCurrencySymbol(currency: string): string {
  const curr = BANKING_CURRENCIES.find(c => c.value === currency);
  return curr?.symbol || currency;
}

// Goal types
export type GoalCategory = 'car' | 'holiday' | 'emergency' | 'home' | 'education' | 'wedding' | 'retirement' | 'other';

export const GOAL_CATEGORIES: { value: GoalCategory; label: string }[] = [
  { value: 'car', label: 'Car' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'emergency', label: 'Emergency Fund' },
  { value: 'home', label: 'Home' },
  { value: 'education', label: 'Education' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'other', label: 'Other' },
];

export type GoalPriority = 'low' | 'medium' | 'high';

export const GOAL_PRIORITIES: { value: GoalPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export interface Goal {
  id: string;
  name: string;
  category: GoalCategory;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date?: string; // ISO date string
  monthly_contribution?: number;
  priority: GoalPriority;
  notes?: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}
