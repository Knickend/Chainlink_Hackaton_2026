import { useMemo, useState, useCallback } from 'react';
import { DisplayUnit, PortfolioMetrics, DEFAULT_CONVERSION_RATES, UNIT_SYMBOLS, calculateConversionRates, Asset, Income, Expense, convertToTroyOz, CommodityUnit, convertCurrency, FOREX_RATES_TO_USD, BankingCurrency } from '@/lib/types';
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
      return calculateConversionRates(livePrices.btc, livePrices.gold);
    }
    return DEFAULT_CONVERSION_RATES;
  }, [livePrices]);

  const metrics: PortfolioMetrics = useMemo(() => {
    const totalNetWorth = assets.reduce((sum, asset) => sum + asset.value, 0);
    
    // Convert income/expenses to USD for totals (they may have different currencies)
    const totalIncome = income.reduce((sum, inc) => {
      const currency = inc.currency || 'USD';
      const rate = FOREX_RATES_TO_USD[currency as BankingCurrency] || 1;
      return sum + (inc.amount * rate);
    }, 0);
    
    const totalExpenses = expenses.reduce((sum, exp) => {
      const currency = exp.currency || 'USD';
      const rate = FOREX_RATES_TO_USD[currency as BankingCurrency] || 1;
      return sum + (exp.amount * rate);
    }, 0);
    
    // Debt metrics will be passed from useDebts hook when integrated
    const totalDebt = 0;
    const monthlyDebtPayments = 0;
    const monthlyInterestExpense = 0;
    
    const monthlyNetIncome = totalIncome - totalExpenses - monthlyDebtPayments;
    
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
    };
  }, [assets, income, expenses]);

  const assetsByCategory = useMemo(() => {
    return assets.reduce((acc, asset) => {
      if (!acc[asset.category]) {
        acc[asset.category] = [];
      }
      acc[asset.category].push(asset);
      return acc;
    }, {} as Record<string, Asset[]>);
  }, [assets]);

  const categoryTotals = useMemo(() => {
    return Object.entries(assetsByCategory).map(([category, categoryAssets]) => ({
      category,
      total: categoryAssets.reduce((sum, asset) => sum + asset.value, 0),
      count: categoryAssets.length,
    }));
  }, [assetsByCategory]);

  const convertValue = (valueInUSD: number): number => {
    return valueInUSD * conversionRates[displayUnit];
  };

  // Convert a value from its stored currency to the current display unit
  const convertFromCurrency = useCallback((amount: number, fromCurrency: string): number => {
    // For BTC and GOLD display units, we need to convert via USD
    if (displayUnit === 'BTC' || displayUnit === 'GOLD') {
      // First convert to USD, then to display unit
      const amountInUSD = amount * (FOREX_RATES_TO_USD[fromCurrency as BankingCurrency] || 1);
      return amountInUSD * conversionRates[displayUnit];
    }
    
    // For fiat display units (USD, EUR, GBP)
    // If same currency, return original amount
    if (fromCurrency === displayUnit) {
      return amount;
    }
    
    // Otherwise, convert from stored currency to display currency
    return convertCurrency(amount, fromCurrency, displayUnit);
  }, [displayUnit, conversionRates]);

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

  return {
    assets,
    income,
    expenses,
    metrics,
    displayUnit,
    setDisplayUnit,
    assetsByCategory,
    categoryTotals,
    convertValue,
    convertFromCurrency,
    formatValue,
    formatCurrencyValue,
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
