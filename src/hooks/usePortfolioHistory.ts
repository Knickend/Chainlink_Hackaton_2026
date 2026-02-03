import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth } from 'date-fns';

export interface AssetsBreakdown {
  banking: number;
  crypto: number;
  stocks: number;
  commodities: number;
  realestate: number;
}

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_month: string;
  net_worth: number;
  total_assets: number;
  total_debt: number;
  total_income: number;
  total_expenses: number;
  monthly_debt_payments: number;
  assets_breakdown: AssetsBreakdown;
  created_at: string;
}

export interface MonthComparison {
  month1: PortfolioSnapshot;
  month2: PortfolioSnapshot;
  changes: {
    netWorth: { absolute: number; percent: number };
    totalAssets: { absolute: number; percent: number };
    totalDebt: { absolute: number; percent: number };
    totalIncome: { absolute: number; percent: number };
    totalExpenses: { absolute: number; percent: number };
    breakdown: {
      banking: { absolute: number; percent: number };
      crypto: { absolute: number; percent: number };
      stocks: { absolute: number; percent: number };
      commodities: { absolute: number; percent: number };
    };
  };
}

function calculateChange(newVal: number, oldVal: number): { absolute: number; percent: number } {
  const absolute = newVal - oldVal;
  const percent = oldVal !== 0 ? (absolute / oldVal) * 100 : (newVal !== 0 ? 100 : 0);
  return { absolute, percent };
}

export interface MetricTrend {
  value: number;
  isPositive: boolean;
}

export interface MetricTrends {
  netWorth: MetricTrend | null;
  totalDebt: MetricTrend | null;
  totalIncome: MetricTrend | null;
  totalExpenses: MetricTrend | null;
  monthlyNet: MetricTrend | null;
}

export function usePortfolioHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [comparisonMonth, setComparisonMonth] = useState<string | null>(null);

  // Fetch all snapshots for the user
  const { data: snapshots = [], isLoading, error, refetch } = useQuery({
    queryKey: ['portfolio-snapshots', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('snapshot_month', { ascending: false });

      if (error) throw error;
      
      // Type cast and ensure assets_breakdown is properly typed
      return (data || []).map(snapshot => {
        const breakdown = snapshot.assets_breakdown as unknown as AssetsBreakdown | null;
        return {
          ...snapshot,
          assets_breakdown: breakdown || {
            banking: 0,
            crypto: 0,
            stocks: 0,
            commodities: 0,
            realestate: 0,
          },
        };
      }) as PortfolioSnapshot[];
    },
    enabled: !!user?.id,
  });

  // Create snapshot mutation
  const createSnapshotMutation = useMutation({
    mutationFn: async (month?: Date) => {
      const body = month ? { month: startOfMonth(month).toISOString() } : undefined;

      const response = await supabase.functions.invoke('create-monthly-snapshot', {
        body,
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-snapshots'] });
      toast.success('Portfolio snapshot created successfully');
    },
    onError: (error) => {
      console.error('Snapshot creation error:', error);
      toast.error('Failed to create snapshot');
    },
  });

  // Delete snapshot mutation
  const deleteSnapshotMutation = useMutation({
    mutationFn: async (snapshotId: string) => {
      const { error } = await supabase
        .from('portfolio_snapshots')
        .delete()
        .eq('id', snapshotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-snapshots'] });
      toast.success('Snapshot deleted');
    },
    onError: () => {
      toast.error('Failed to delete snapshot');
    },
  });

  // Create snapshot for current month
  const createSnapshot = useCallback(async () => {
    return createSnapshotMutation.mutateAsync(undefined);
  }, [createSnapshotMutation]);

  // Delete a snapshot
  const deleteSnapshot = useCallback(async (snapshotId: string) => {
    return deleteSnapshotMutation.mutateAsync(snapshotId);
  }, [deleteSnapshotMutation]);

  // Get comparison between two months
  const getComparison = useCallback((month1Id: string, month2Id: string): MonthComparison | null => {
    const snap1 = snapshots.find(s => s.id === month1Id);
    const snap2 = snapshots.find(s => s.id === month2Id);

    if (!snap1 || !snap2) return null;

    // Ensure snap1 is the earlier month
    const [earlier, later] = parseISO(snap1.snapshot_month) < parseISO(snap2.snapshot_month)
      ? [snap1, snap2]
      : [snap2, snap1];

    return {
      month1: earlier,
      month2: later,
      changes: {
        netWorth: calculateChange(later.net_worth, earlier.net_worth),
        totalAssets: calculateChange(later.total_assets, earlier.total_assets),
        totalDebt: calculateChange(later.total_debt, earlier.total_debt),
        totalIncome: calculateChange(later.total_income, earlier.total_income),
        totalExpenses: calculateChange(later.total_expenses, earlier.total_expenses),
        breakdown: {
          banking: calculateChange(later.assets_breakdown.banking, earlier.assets_breakdown.banking),
          crypto: calculateChange(later.assets_breakdown.crypto, earlier.assets_breakdown.crypto),
          stocks: calculateChange(later.assets_breakdown.stocks, earlier.assets_breakdown.stocks),
          commodities: calculateChange(later.assets_breakdown.commodities, earlier.assets_breakdown.commodities),
        },
      },
    };
  }, [snapshots]);

  // Get the selected snapshot
  const selectedSnapshot = useMemo(() => {
    if (!selectedMonth) return snapshots[0] || null;
    return snapshots.find(s => s.id === selectedMonth) || null;
  }, [snapshots, selectedMonth]);

  // Calculate month-over-month change for the selected snapshot
  const monthOverMonthChange = useMemo(() => {
    if (!selectedSnapshot || snapshots.length < 2) return null;
    
    const currentIndex = snapshots.findIndex(s => s.id === selectedSnapshot.id);
    const previousSnapshot = snapshots[currentIndex + 1]; // Snapshots are sorted desc
    
    if (!previousSnapshot) return null;

    return calculateChange(selectedSnapshot.net_worth, previousSnapshot.net_worth);
  }, [selectedSnapshot, snapshots]);

  // Calculate trends for all metrics (comparing most recent two snapshots)
  const metricTrends = useMemo((): MetricTrends => {
    if (snapshots.length < 2) {
      return { netWorth: null, totalDebt: null, totalIncome: null, totalExpenses: null, monthlyNet: null };
    }
    
    const current = snapshots[0]; // Most recent
    const previous = snapshots[1]; // Previous month
    
    const netWorthChange = calculateChange(current.net_worth, previous.net_worth);
    const debtChange = calculateChange(current.total_debt, previous.total_debt);
    const incomeChange = calculateChange(current.total_income, previous.total_income);
    const expensesChange = calculateChange(current.total_expenses, previous.total_expenses);
    
    // Monthly net = income - expenses
    const currentMonthlyNet = current.total_income - current.total_expenses;
    const previousMonthlyNet = previous.total_income - previous.total_expenses;
    const monthlyNetChange = calculateChange(currentMonthlyNet, previousMonthlyNet);
    
    return {
      netWorth: { value: Math.abs(netWorthChange.percent), isPositive: netWorthChange.percent >= 0 },
      totalDebt: { value: Math.abs(debtChange.percent), isPositive: debtChange.percent <= 0 }, // Lower debt is positive
      totalIncome: { value: Math.abs(incomeChange.percent), isPositive: incomeChange.percent >= 0 },
      totalExpenses: { value: Math.abs(expensesChange.percent), isPositive: expensesChange.percent <= 0 }, // Lower expenses is positive
      monthlyNet: { value: Math.abs(monthlyNetChange.percent), isPositive: monthlyNetChange.percent >= 0 },
    };
  }, [snapshots]);

  // Format month for display
  const formatMonth = useCallback((dateString: string) => {
    return format(parseISO(dateString), 'MMMM yyyy');
  }, []);

  // Format short month for charts
  const formatShortMonth = useCallback((dateString: string) => {
    return format(parseISO(dateString), 'MMM');
  }, []);

  return {
    snapshots,
    isLoading,
    error,
    refetch,
    createSnapshot,
    isCreating: createSnapshotMutation.isPending,
    deleteSnapshot,
    isDeleting: deleteSnapshotMutation.isPending,
    selectedMonth,
    setSelectedMonth,
    comparisonMonth,
    setComparisonMonth,
    selectedSnapshot,
    monthOverMonthChange,
    metricTrends,
    getComparison,
    formatMonth,
    formatShortMonth,
    hasSnapshots: snapshots.length > 0,
    canCompare: snapshots.length >= 2,
  };
}
