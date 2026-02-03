import { useMemo, useState, useCallback } from 'react';
import { DisplayUnit, PortfolioMetrics, DEFAULT_CONVERSION_RATES, UNIT_SYMBOLS, calculateConversionRates, Asset, Income, Expense, convertToTroyOz, CommodityUnit, convertCurrency, FOREX_RATES_TO_USD, BankingCurrency, isBitcoinCurrency, convertBtcToUSD, BitcoinCurrency } from '@/lib/types';
import { LivePrices } from './useLivePrices';
import { usePortfolioData } from './usePortfolioData';
import { mockAssets, mockIncome, mockExpenses } from '@/lib/mockData';

function getLiveAssetPriceUSD(asset: Asset, livePrices?: LivePrices): number | null {
  if (!livePrices || !asset.symbol) return null;
  const sym = asset.symbol.toUpperCase();
  switch (sym) {
    case 'BTC':
      return livePrices.btc;
    case 'ETH':
      return livePrices.eth;
    case 'LINK':
      return livePrices.link;
    case 'GOLD':
    case 'XAU':
      return livePrices.gold;
    case 'SILVER':
    case 'XAG':
      return livePrices.silver;
    default:
      return livePrices.stocks?.[sym]?.price ?? null;
  }
}

export function usePortfolio(livePrices?: LivePrices, isDemo = false) {
  const {
    assets: userAssets,
    income: userIncome,
    expenses: userExpenses,
    loading,
    addAsset,
    updateAsset,
    deleteAsset,
    addIncome,
    updateIncome,
    deleteIncome,
    addExpense,
    updateExpense,
    deleteExpense,
  } = usePortfolioData();

  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>('USD');

  // Use mock data for demo mode, real data otherwise
  const baseAssets = isDemo ? mockAssets : userAssets;
  const income = isDemo ? mockIncome : userIncome;
  const expenses = isDemo ? mockExpenses : userExpenses;

  // Compute market-priced asset values from quantity × live price when possible.
  // For commodities, convert quantity to troy oz first (prices are per oz)
  const assets = useMemo(() => {
    return baseAssets.map((asset) => {
      const price = getLiveAssetPriceUSD(asset, livePrices);
      const isCommodity = asset.category === 'commodities';
      const canCompute =
        (asset.category === 'crypto' || isCommodity || asset.category === 'stocks') &&
        typeof asset.quantity === 'number' &&
        typeof price === 'number';

      if (canCompute && price !== null) {
        // For commodities, convert quantity to troy oz for price calculation
        // Ensure unit is properly typed and default to 'oz' if not set
        let effectiveQuantity = asset.quantity!;
        if (isCommodity) {
          const unit = (asset.unit as CommodityUnit) || 'oz';
          effectiveQuantity = convertToTroyOz(asset.quantity!, unit);
        }
        return {
          ...asset,
          value: effectiveQuantity * price,
        };
      }

      return asset;
    });
  }, [baseAssets, livePrices]);

  const conversionRates = useMemo(() => {
    if (livePrices) {
      return calculateConversionRates(livePrices.btc, livePrices.gold, livePrices.forex);
    }
    return DEFAULT_CONVERSION_RATES;
  }, [livePrices]);

  // Get the current BTC price for income conversion
  const btcPrice = livePrices?.btc || 96000; // fallback to ~96k if not available

  const metrics: PortfolioMetrics = useMemo(() => {
    // Calculate total net worth with smart handling for banking assets
    // Banking assets: use native currency amounts to avoid round-trip conversion errors
    // Other assets: values are already in USD, convert to display unit
    const totalNetWorth = assets.reduce((sum, asset) => {
      if (asset.category === 'banking') {
        const assetCurrency = asset.symbol || 'USD';
        const nativeAmount = asset.quantity ?? asset.value;
        
        // If asset currency matches display unit, use native amount directly
        if (assetCurrency === displayUnit) {
          return sum + nativeAmount;
        }
        
        // Otherwise convert from native currency to display unit
        const liveFromRate = livePrices?.forex?.[assetCurrency];
        let amountInUSD: number;
        if (liveFromRate && liveFromRate > 0) {
          amountInUSD = nativeAmount * (1 / liveFromRate);
        } else {
          amountInUSD = nativeAmount * (FOREX_RATES_TO_USD[assetCurrency as BankingCurrency] || 1);
        }
        
        // Convert USD to display unit
        const liveToRate = livePrices?.forex?.[displayUnit];
        if (liveToRate && liveToRate > 0) {
          return sum + (amountInUSD * liveToRate);
        }
        
        return sum + (amountInUSD * conversionRates[displayUnit]);
      }
      
      // Non-banking assets: convert USD value to display unit
      return sum + (asset.value * conversionRates[displayUnit]);
    }, 0);
    
    // Helper function to convert income amount to USD with normalized currency handling
    // Uses live forex rates when available for consistency with display unit conversion
    const convertIncomeToUSD = (inc: typeof income[0]): number => {
      const currency = (inc.currency || 'USD').trim().toUpperCase();
      
      // Handle Bitcoin currencies (BTC and SATS)
      if (currency === 'BTC' || currency === 'SATS') {
        return convertBtcToUSD(inc.amount, currency as BitcoinCurrency, btcPrice);
      }
      
      // Handle fiat currencies - use live forex rate if available for consistency
      // This ensures €300 → USD → €300 round-trips correctly
      const liveRate = livePrices?.forex?.[currency];
      if (liveRate && liveRate > 0) {
        // API returns USD→Currency, we need Currency→USD
        return inc.amount * (1 / liveRate);
      }
      
      // Fallback to static rates
      const rate = FOREX_RATES_TO_USD[currency as BankingCurrency] || 1;
      return inc.amount * rate;
    };
    
    // Helper function to convert expense amount to USD with normalized currency handling
    // Uses live forex rates when available for consistency with display unit conversion
    const convertExpenseToUSD = (exp: typeof expenses[0]): number => {
      const currency = (exp.currency || 'USD').trim().toUpperCase();
      
      // Use live forex rate if available for consistency
      const liveRate = livePrices?.forex?.[currency];
      if (liveRate && liveRate > 0) {
        // API returns USD→Currency, we need Currency→USD
        return exp.amount * (1 / liveRate);
      }
      
      // Fallback to static rates
      const rate = FOREX_RATES_TO_USD[currency as BankingCurrency] || 1;
      return exp.amount * rate;
    };
    
    // Calculate income with recurring/one-time breakdown
    const recurringIncome = income
      .filter(inc => inc.is_recurring)
      .reduce((sum, inc) => sum + convertIncomeToUSD(inc), 0);
    
    const oneTimeIncome = income
      .filter(inc => !inc.is_recurring)
      .reduce((sum, inc) => sum + convertIncomeToUSD(inc), 0);
    
    const totalIncome = recurringIncome + oneTimeIncome;
    
    // Calculate expenses with recurring/one-time breakdown
    const recurringExpenses = expenses
      .filter(exp => exp.is_recurring)
      .reduce((sum, exp) => sum + convertExpenseToUSD(exp), 0);
    
    const oneTimeExpenses = expenses
      .filter(exp => !exp.is_recurring)
      .reduce((sum, exp) => sum + convertExpenseToUSD(exp), 0);
    
    const totalExpenses = recurringExpenses + oneTimeExpenses;
    
    // Debt metrics - these will be combined with useDebts in Index.tsx
    const totalDebt = 0;
    const monthlyDebtPayments = 0;
    const monthlyInterestExpense = 0;
    
    // Base net income (without debt payments - debt subtracted in Index.tsx)
    const monthlyNetIncome = totalIncome - totalExpenses;
    
    const yearlyYield = assets.reduce((sum, asset) => {
      if (asset.yield) {
        return sum + (asset.value * (asset.yield / 100));
      }
      return sum;
    }, 0);

    return {
      totalNetWorth,
      totalIncome,
      totalExpenses,
      totalDebt,
      monthlyDebtPayments,
      monthlyInterestExpense,
      monthlyNetIncome,
      yearlyYield,
      recurringIncome,
      oneTimeIncome,
      recurringExpenses,
      oneTimeExpenses,
    };
  }, [assets, income, expenses, btcPrice, livePrices, displayUnit, conversionRates]);

  const assetsByCategory = useMemo(() => {
    return assets.reduce((acc, asset) => {
      if (!acc[asset.category]) {
        acc[asset.category] = [];
      }
      acc[asset.category].push(asset);
      return acc;
    }, {} as Record<string, Asset[]>);
  }, [assets]);

  const convertValue = useCallback((valueInUSD: number): number => {
    return valueInUSD * conversionRates[displayUnit];
  }, [conversionRates, displayUnit]);

  // Convert a value from its stored currency to the current display unit
  // Uses live forex rates when available for consistent round-trip conversions
  const convertFromCurrency = useCallback((amount: number, fromCurrency: string): number => {
    const currency = (fromCurrency || 'USD').trim().toUpperCase();
    
    // For BTC and GOLD display units, we need to convert via USD
    if (displayUnit === 'BTC' || displayUnit === 'GOLD') {
      // First convert to USD using live rates if available
      const liveRate = livePrices?.forex?.[currency];
      let amountInUSD: number;
      if (liveRate && liveRate > 0) {
        amountInUSD = amount * (1 / liveRate);
      } else {
        amountInUSD = amount * (FOREX_RATES_TO_USD[currency as BankingCurrency] || 1);
      }
      return amountInUSD * conversionRates[displayUnit];
    }
    
    // For fiat display units (USD, EUR, GBP)
    // If same currency, return original amount (no conversion needed)
    if (currency === displayUnit) {
      return amount;
    }
    
    // Convert via USD using live forex rates for consistency
    // This ensures €300 → USD → €300 round-trips correctly
    const liveFromRate = livePrices?.forex?.[currency];
    const liveToRate = livePrices?.forex?.[displayUnit];
    
    // Convert from stored currency to USD
    let amountInUSD: number;
    if (liveFromRate && liveFromRate > 0) {
      amountInUSD = amount * (1 / liveFromRate);
    } else {
      amountInUSD = amount * (FOREX_RATES_TO_USD[currency as BankingCurrency] || 1);
    }
    
    // Convert from USD to display currency
    if (liveToRate && liveToRate > 0) {
      return amountInUSD * liveToRate;
    }
    
    // Fallback to static conversion
    return convertCurrency(amount, fromCurrency, displayUnit);
  }, [displayUnit, conversionRates, livePrices]);

  // Category totals calculated in display unit
  // For banking assets: use native currency amounts to avoid round-trip conversion errors
  // For other categories: convert USD values to display unit
  const categoryTotals = useMemo(() => {
    return Object.entries(assetsByCategory).map(([category, categoryAssets]) => {
      let total: number;
      
      if (category === 'banking') {
        // For banking, sum assets using their native currency amounts
        // and convert to display unit properly
        total = categoryAssets.reduce((sum, asset) => {
          const assetCurrency = asset.symbol || 'USD';
          const nativeAmount = asset.quantity ?? asset.value;
          
          // If asset currency matches display unit, use native amount directly
          if (assetCurrency === displayUnit) {
            return sum + nativeAmount;
          }
          
          // Otherwise convert from native currency to display unit
          return sum + convertFromCurrency(nativeAmount, assetCurrency);
        }, 0);
      } else {
        // For non-banking, values are already in USD
        // Convert to display unit
        total = categoryAssets.reduce((sum, asset) => sum + convertValue(asset.value), 0);
      }
      
      return { category, total, count: categoryAssets.length };
    });
  }, [assetsByCategory, displayUnit, convertFromCurrency, convertValue]);

  const formatValue = (valueInUSD: number, showDecimals = true): string => {
    const converted = convertValue(valueInUSD);
    const symbol = UNIT_SYMBOLS[displayUnit];
    
    if (displayUnit === 'GOLD') {
      return `${converted.toFixed(4)} ${symbol}`;
    }
    
    if (displayUnit === 'BTC') {
      return `${symbol}${converted.toFixed(6)}`;
    }
    
    const formatted = showDecimals 
      ? converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : converted.toLocaleString('en-US', { maximumFractionDigits: 0 });
    
    return `${symbol}${formatted}`;
  };

  // Format a value that is stored in a specific currency (not USD)
  const formatCurrencyValue = useCallback((amount: number, fromCurrency: string, showDecimals = true): string => {
    const converted = convertFromCurrency(amount, fromCurrency);
    const symbol = UNIT_SYMBOLS[displayUnit];
    
    if (displayUnit === 'GOLD') {
      return `${converted.toFixed(4)} ${symbol}`;
    }
    
    if (displayUnit === 'BTC') {
      return `${symbol}${converted.toFixed(6)}`;
    }
    
    const formatted = showDecimals 
      ? converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : converted.toLocaleString('en-US', { maximumFractionDigits: 0 });
    
    return `${symbol}${formatted}`;
  }, [convertFromCurrency, displayUnit]);

  // Format a value that is already in display unit (no conversion needed)
  const formatDisplayUnitValue = useCallback((value: number, showDecimals = true): string => {
    const symbol = UNIT_SYMBOLS[displayUnit];
    
    if (displayUnit === 'GOLD') {
      return `${value.toFixed(4)} ${symbol}`;
    }
    
    if (displayUnit === 'BTC') {
      return `${symbol}${value.toFixed(6)}`;
    }
    
    const formatted = showDecimals 
      ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    
    return `${symbol}${formatted}`;
  }, [displayUnit]);

  return {
    assets,
    income,
    expenses,
    metrics,
    displayUnit,
    setDisplayUnit,
    assetsByCategory,
    categoryTotals,
    conversionRates,
    convertValue,
    convertFromCurrency,
    formatValue,
    formatCurrencyValue,
    formatDisplayUnitValue,
    loading: isDemo ? false : loading,
    addAsset,
    updateAsset,
    deleteAsset,
    addIncome,
    updateIncome,
    deleteIncome,
    addExpense,
    updateExpense,
    deleteExpense,
  };
}
