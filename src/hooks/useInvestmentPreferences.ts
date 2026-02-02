import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Goal } from '@/lib/types';
import { analyzeGoals, GoalAnalysis } from '@/lib/goalAnalysis';

export interface InvestmentPreferences {
  id: string;
  user_id: string;
  stocks_allocation: number;
  crypto_allocation: number;
  commodities_allocation: number;
  emergency_fund_target: number;
  debt_allocation: number;
  created_at: string;
  updated_at: string;
}

export interface InvestmentAllocation {
  category: string;
  percentage: number;
  amount: number;
  color: string;
  linkedGoals?: Goal[];
}

export interface GoalAwareOptions {
  includeGoalsInStrategy: boolean;
}

export function useInvestmentPreferences(
  freeMonthlyIncome: number,
  goals: Goal[] = [],
  options: GoalAwareOptions = { includeGoalsInStrategy: true }
) {
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
    debt_allocation: number;
  }) => {
    if (!user) return;

    // Validate that allocations sum to 100%
    const total = newPreferences.stocks_allocation + 
                  newPreferences.crypto_allocation + 
                  newPreferences.commodities_allocation + 
                  newPreferences.emergency_fund_target +
                  newPreferences.debt_allocation;
    
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

  // Analyze goals for integration
  const goalAnalysis = useMemo(
    () => analyzeGoals(goals, freeMonthlyIncome),
    [goals, freeMonthlyIncome]
  );

  // Calculate allocation amounts based on free income
  const calculateAllocations = useCallback((): InvestmentAllocation[] => {
    if (!preferences || freeMonthlyIncome <= 0) return [];

    const allocations: InvestmentAllocation[] = [];
    
    // Add debt payoff allocation first if present
    if (preferences.debt_allocation > 0) {
      allocations.push({
        category: 'Debt Payoff',
        percentage: preferences.debt_allocation,
        amount: freeMonthlyIncome * (preferences.debt_allocation / 100),
        color: 'hsl(var(--destructive))',
      });
    }

    // Calculate remaining amount after debt allocation
    const afterDebtAmount = freeMonthlyIncome * (1 - preferences.debt_allocation / 100);
    const investableAmount = afterDebtAmount * (1 - preferences.emergency_fund_target / 100);

    if (preferences.stocks_allocation > 0) {
      allocations.push({
        category: 'Stocks/ETFs',
        percentage: preferences.stocks_allocation,
        amount: investableAmount * (preferences.stocks_allocation / (100 - preferences.debt_allocation - preferences.emergency_fund_target)) || 0,
        color: '#f59e0b',
      });
    }

    if (preferences.crypto_allocation > 0) {
      allocations.push({
        category: 'Crypto',
        percentage: preferences.crypto_allocation,
        amount: investableAmount * (preferences.crypto_allocation / (100 - preferences.debt_allocation - preferences.emergency_fund_target)) || 0,
        color: '#8b5cf6',
      });
    }

    if (preferences.commodities_allocation > 0) {
      allocations.push({
        category: 'Commodities',
        percentage: preferences.commodities_allocation,
        amount: investableAmount * (preferences.commodities_allocation / (100 - preferences.debt_allocation - preferences.emergency_fund_target)) || 0,
        color: '#10b981',
      });
    }

    if (preferences.emergency_fund_target > 0) {
      allocations.push({
        category: 'Emergency Fund',
        percentage: preferences.emergency_fund_target,
        amount: afterDebtAmount * (preferences.emergency_fund_target / 100),
        color: '#3b82f6',
        linkedGoals: goalAnalysis.emergencyFundGoals,
      });
    }

    return allocations;
  }, [preferences, freeMonthlyIncome, goalAnalysis.emergencyFundGoals]);

  // Calculate goal-aware allocations (includes Goal Savings category)
  const calculateGoalAwareAllocations = useCallback((): InvestmentAllocation[] => {
    const baseAllocations = calculateAllocations();
    
    if (!options.includeGoalsInStrategy || goalAnalysis.savingsGoals.length === 0) {
      return baseAllocations;
    }

    // Calculate goal savings as percentage of free income
    const goalSavingsPercentage = Math.min(
      (goalAnalysis.goalSavingsContributions / freeMonthlyIncome) * 100,
      50 // Cap at 50% to avoid overwhelming the chart
    );

    if (goalSavingsPercentage <= 0) {
      return baseAllocations;
    }

    // Add Goal Savings as first category (after debt if present)
    const debtIndex = baseAllocations.findIndex(a => a.category === 'Debt Payoff');
    const insertIndex = debtIndex >= 0 ? debtIndex + 1 : 0;

    const goalSavingsAllocation: InvestmentAllocation = {
      category: 'Goal Savings',
      percentage: Math.round(goalSavingsPercentage),
      amount: goalAnalysis.goalSavingsContributions,
      color: '#ec4899', // pink
      linkedGoals: goalAnalysis.savingsGoals,
    };

    const result = [...baseAllocations];
    result.splice(insertIndex, 0, goalSavingsAllocation);

    return result;
  }, [calculateAllocations, options.includeGoalsInStrategy, goalAnalysis, freeMonthlyIncome]);

  const totalInvestable = freeMonthlyIncome > 0 && preferences
    ? freeMonthlyIncome * (1 - (preferences.emergency_fund_target + preferences.debt_allocation) / 100)
    : 0;

  // Adjusted investable after goal contributions
  const adjustedInvestable = options.includeGoalsInStrategy
    ? Math.max(0, totalInvestable - goalAnalysis.goalSavingsContributions)
    : totalInvestable;

  return {
    preferences,
    loading,
    savePreferences,
    calculateAllocations,
    calculateGoalAwareAllocations,
    totalInvestable,
    adjustedInvestable,
    hasPreferences: !!preferences,
    goalAnalysis,
  };
}
