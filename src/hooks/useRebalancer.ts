import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Asset } from '@/lib/types';
import { InvestmentPreferences } from './useInvestmentPreferences';

export interface DriftItem {
  category: string;
  target: number;
  actual: number;
  diff: number; // actual - target (positive = overweight)
  color: string;
}

export interface TradeSuggestion {
  action: 'sell' | 'buy';
  category: string;
  amount: number;
}

export interface RebalanceAlert {
  id: string;
  user_id: string;
  created_at: string;
  drift_data: DriftItem[];
  max_drift: number;
  is_dismissed: boolean;
}

// Map asset categories to investment allocation categories
const CATEGORY_MAP: Record<string, { label: string; prefKey: keyof InvestmentPreferences }> = {
  banking: { label: 'Cash & Stablecoins', prefKey: 'emergency_fund_target' },
  crypto: { label: 'Cryptocurrency', prefKey: 'crypto_allocation' },
  stocks: { label: 'Stocks, Bonds & ETFs', prefKey: 'stocks_allocation' },
  commodities: { label: 'Commodities', prefKey: 'commodities_allocation' },
};

const CATEGORY_COLORS: Record<string, string> = {
  'Cash & Stablecoins': '#3B82F6',
  'Cryptocurrency': '#F7931A',
  'Stocks, Bonds & ETFs': '#22C55E',
  'Commodities': '#EAB308',
};

export function useRebalancer(
  assets: Asset[],
  preferences: InvestmentPreferences | null
) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<RebalanceAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  // Fetch undismissed alerts
  const fetchAlerts = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setAlertsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('rebalance_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      setAlerts((data as unknown as RebalanceAlert[]) || []);
    } catch (error) {
      console.error('Error fetching rebalance alerts:', error);
    } finally {
      setAlertsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Compute drift from current assets vs target allocations
  const driftData = useMemo((): DriftItem[] => {
    if (!preferences || assets.length === 0) return [];

    // Sum asset values by mapped category
    const categoryTotals: Record<string, number> = {};
    let totalPortfolioValue = 0;

    for (const asset of assets) {
      const mapping = CATEGORY_MAP[asset.category];
      if (!mapping) continue; // skip realestate etc
      const label = mapping.label;
      categoryTotals[label] = (categoryTotals[label] || 0) + asset.value;
      totalPortfolioValue += asset.value;
    }

    // Also count realestate in total but not in any target category
    for (const asset of assets) {
      if (!CATEGORY_MAP[asset.category]) {
        totalPortfolioValue += asset.value;
      }
    }

    if (totalPortfolioValue <= 0) return [];

    const items: DriftItem[] = [];
    for (const [, mapping] of Object.entries(CATEGORY_MAP)) {
      const target = Number(preferences[mapping.prefKey]) || 0;
      if (target <= 0) continue; // skip categories with 0% target

      const actual = ((categoryTotals[mapping.label] || 0) / totalPortfolioValue) * 100;
      const diff = actual - target;

      items.push({
        category: mapping.label,
        target: Math.round(target * 10) / 10,
        actual: Math.round(actual * 10) / 10,
        diff: Math.round(diff * 10) / 10,
        color: CATEGORY_COLORS[mapping.label] || '#6b7280',
      });
    }

    return items;
  }, [assets, preferences]);

  const threshold = preferences?.rebalance_threshold ?? 10;

  const isThresholdExceeded = useMemo(
    () => driftData.some((d) => Math.abs(d.diff) > threshold),
    [driftData, threshold]
  );

  const maxDrift = useMemo(
    () => driftData.reduce((max, d) => Math.max(max, Math.abs(d.diff)), 0),
    [driftData]
  );

  // Calculate total portfolio value for trade suggestions
  const totalPortfolioValue = useMemo(
    () => assets.reduce((sum, a) => sum + a.value, 0),
    [assets]
  );

  const tradeSuggestions = useMemo((): TradeSuggestion[] => {
    if (!isThresholdExceeded || totalPortfolioValue <= 0) return [];

    return driftData
      .filter((d) => Math.abs(d.diff) > threshold)
      .map((d) => ({
        action: d.diff > 0 ? ('sell' as const) : ('buy' as const),
        category: d.category,
        amount: Math.round(Math.abs(d.diff / 100) * totalPortfolioValue),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [driftData, isThresholdExceeded, totalPortfolioValue, threshold]);

  // Dismiss an alert
  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('rebalance_alerts')
        .update({ is_dismissed: true } as any)
        .eq('id', alertId);

      if (error) throw error;
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  }, []);

  // Whether to show the rebalance card
  const shouldShow = isThresholdExceeded || alerts.length > 0;

  return {
    driftData,
    isThresholdExceeded,
    maxDrift,
    tradeSuggestions,
    alerts,
    alertsLoading,
    dismissAlert,
    shouldShow,
    threshold,
    totalPortfolioValue,
  };
}
