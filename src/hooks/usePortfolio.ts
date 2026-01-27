import { useState, useMemo, useCallback } from 'react';
import { Asset, Income, Expense, DisplayUnit, PortfolioMetrics, DEFAULT_CONVERSION_RATES, UNIT_SYMBOLS, calculateConversionRates } from '@/lib/types';
import { mockAssets, mockIncome, mockExpenses } from '@/lib/mockData';
import { LivePrices } from './useLivePrices';

export function usePortfolio(livePrices?: LivePrices) {
  const [assets, setAssets] = useState<Asset[]>(mockAssets);
  const [income, setIncome] = useState<Income[]>(mockIncome);
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>('USD');

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

  const addAsset = useCallback((assetData: {
    name: string;
    category: Asset['category'];
    value: number;
    quantity?: number;
    symbol?: string;
    yield?: number;
    stakingRate?: number;
  }) => {
    const newAsset: Asset = {
      id: crypto.randomUUID(),
      name: assetData.name,
      category: assetData.category,
      value: assetData.value,
      quantity: assetData.quantity,
      symbol: assetData.symbol || undefined,
      yield: assetData.yield || assetData.stakingRate,
    };
    setAssets((prev) => [...prev, newAsset]);
  }, []);

  const updateAsset = useCallback((id: string, assetData: Partial<Omit<Asset, 'id'>>) => {
    setAssets((prev) => prev.map((asset) => 
      asset.id === id ? { ...asset, ...assetData } : asset
    ));
  }, []);

  const deleteAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((asset) => asset.id !== id));
  }, []);

  const addIncome = useCallback((incomeData: {
    source: string;
    amount: number;
    type: Income['type'];
  }) => {
    const newIncome: Income = {
      id: crypto.randomUUID(),
      source: incomeData.source,
      amount: incomeData.amount,
      type: incomeData.type,
    };
    setIncome((prev) => [...prev, newIncome]);
  }, []);

  const updateIncome = useCallback((id: string, incomeData: Partial<Omit<Income, 'id'>>) => {
    setIncome((prev) => prev.map((inc) => 
      inc.id === id ? { ...inc, ...incomeData } : inc
    ));
  }, []);

  const deleteIncome = useCallback((id: string) => {
    setIncome((prev) => prev.filter((inc) => inc.id !== id));
  }, []);

  const addExpense = useCallback((expenseData: {
    name: string;
    amount: number;
    category: string;
  }) => {
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      name: expenseData.name,
      amount: expenseData.amount,
      category: expenseData.category,
    };
    setExpenses((prev) => [...prev, newExpense]);
  }, []);

  const updateExpense = useCallback((id: string, expenseData: Partial<Omit<Expense, 'id'>>) => {
    setExpenses((prev) => prev.map((exp) => 
      exp.id === id ? { ...exp, ...expenseData } : exp
    ));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
  }, []);

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
