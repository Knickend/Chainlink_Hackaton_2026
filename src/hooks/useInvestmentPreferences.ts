import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

export interface InvestmentAllocation {
  category: string;
  percentage: number;
  amount: number;
  color: string;
}

export function useInvestmentPreferences(freeMonthlyIncome: number) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<InvestmentPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_investment_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setPreferences(data);
    } catch (error) {
      console.error('Error fetching investment preferences:', error);
      toast.error('Failed to load investment preferences');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const savePreferences = async (newPreferences: {
    stocks_allocation: number;
    crypto_allocation: number;
    commodities_allocation: number;
    emergency_fund_target: number;
  }) => {
    if (!user) return;

    // Validate that allocations sum to 100%
    const total = newPreferences.stocks_allocation + 
                  newPreferences.crypto_allocation + 
                  newPreferences.commodities_allocation + 
                  newPreferences.emergency_fund_target;
    
    if (Math.abs(total - 100) > 0.01) {
      toast.error('Allocations must sum to 100%');
      return false;
    }

    try {
      if (preferences) {
        // Update existing
        const { error } = await supabase
          .from('user_investment_preferences')
          .update(newPreferences)
          .eq('id', preferences.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_investment_preferences')
          .insert({ ...newPreferences, user_id: user.id });

        if (error) throw error;
      }

      await fetchPreferences();
      toast.success('Investment preferences saved');
      return true;
    } catch (error) {
      console.error('Error saving investment preferences:', error);
      toast.error('Failed to save investment preferences');
      return false;
    }
  };

  // Calculate allocation amounts based on free income
  const calculateAllocations = useCallback((): InvestmentAllocation[] => {
    if (!preferences || freeMonthlyIncome <= 0) return [];

    const investableAmount = freeMonthlyIncome * (1 - preferences.emergency_fund_target / 100);

    return [
      {
        category: 'Stocks/ETFs',
        percentage: preferences.stocks_allocation,
        amount: investableAmount * (preferences.stocks_allocation / 100),
        color: '#f59e0b',
      },
      {
        category: 'Crypto',
        percentage: preferences.crypto_allocation,
        amount: investableAmount * (preferences.crypto_allocation / 100),
        color: '#8b5cf6',
      },
      {
        category: 'Commodities',
        percentage: preferences.commodities_allocation,
        amount: investableAmount * (preferences.commodities_allocation / 100),
        color: '#10b981',
      },
      {
        category: 'Emergency Fund',
        percentage: preferences.emergency_fund_target,
        amount: freeMonthlyIncome * (preferences.emergency_fund_target / 100),
        color: '#3b82f6',
      },
    ].filter(a => a.percentage > 0);
  }, [preferences, freeMonthlyIncome]);

  const totalInvestable = freeMonthlyIncome > 0 && preferences
    ? freeMonthlyIncome * (1 - preferences.emergency_fund_target / 100)
    : 0;

  return {
    preferences,
    loading,
    savePreferences,
    calculateAllocations,
    totalInvestable,
    hasPreferences: !!preferences,
  };
}
