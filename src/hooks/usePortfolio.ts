import { useMemo, useState } from 'react';
import { DisplayUnit, PortfolioMetrics, DEFAULT_CONVERSION_RATES, UNIT_SYMBOLS, calculateConversionRates, Asset, Income, Expense } from '@/lib/types';
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
      return livePrices.gold;
    case 'SILVER':
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
  // This ensures Shares/Amount inputs affect net worth even if the stored value is 0.
  const assets = useMemo(() => {
    return baseAssets.map((asset) => {
      const price = getLiveAssetPriceUSD(asset, livePrices);
      const canCompute =
        (asset.category === 'crypto' || asset.category === 'metals' || asset.category === 'stocks') &&
        typeof asset.quantity === 'number' &&
        typeof price === 'number';

      return {
        ...asset,
        value: canCompute ? asset.quantity! * price : asset.value,
      };
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
    const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
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
    formatValue,
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
