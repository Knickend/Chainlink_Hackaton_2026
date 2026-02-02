import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Debt, DebtType, DisplayUnit, FOREX_RATES_TO_USD, BankingCurrency, convertCurrency, UNIT_SYMBOLS, DEFAULT_CONVERSION_RATES, calculateConversionRates } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function useDebts(liveForexRates?: Record<string, number>) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all debts
  const fetchDebts = useCallback(async () => {
    if (!user) {
      setDebts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDebts(data.map(d => ({
        id: d.id,
        name: d.name,
        debt_type: d.debt_type as DebtType,
        principal_amount: Number(d.principal_amount),
        interest_rate: Number(d.interest_rate),
        monthly_payment: d.monthly_payment ? Number(d.monthly_payment) : undefined,
        currency: (d as any).currency || 'USD',
      })));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading debts',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  // Add a new debt
  const addDebt = useCallback(async (debtData: {
    name: string;
    debt_type: DebtType;
    principal_amount: number;
    interest_rate: number;
    monthly_payment?: number;
    currency?: string;
  }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.from('debts').insert({
        user_id: user.id,
        name: debtData.name,
        debt_type: debtData.debt_type,
        principal_amount: debtData.principal_amount,
        interest_rate: debtData.interest_rate,
        monthly_payment: debtData.monthly_payment || null,
        currency: debtData.currency || 'USD',
      } as any).select().single();

      if (error) throw error;

      setDebts(prev => [{
        id: data.id,
        name: data.name,
        debt_type: data.debt_type as DebtType,
        principal_amount: Number(data.principal_amount),
        interest_rate: Number(data.interest_rate),
        monthly_payment: data.monthly_payment ? Number(data.monthly_payment) : undefined,
        currency: (data as any).currency || 'USD',
      }, ...prev]);

      toast({ title: 'Debt added successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error adding debt',
        description: error.message,
      });
    }
  }, [user, toast]);

  // Update an existing debt
  const updateDebt = useCallback(async (id: string, debtData: Partial<Omit<Debt, 'id'>>) => {
    if (!user) return;

    try {
      const updatePayload: any = {
        name: debtData.name,
        debt_type: debtData.debt_type,
        principal_amount: debtData.principal_amount,
        interest_rate: debtData.interest_rate,
        monthly_payment: debtData.monthly_payment || null,
      };
      if (debtData.currency) {
        updatePayload.currency = debtData.currency;
      }
      
      const { error } = await supabase.from('debts').update(updatePayload).eq('id', id);

      if (error) throw error;

      setDebts(prev => prev.map(debt =>
        debt.id === id ? { ...debt, ...debtData } : debt
      ));

      toast({ title: 'Debt updated successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating debt',
        description: error.message,
      });
    }
  }, [user, toast]);

  // Delete a debt
  const deleteDebt = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('debts').delete().eq('id', id);
      if (error) throw error;

      setDebts(prev => prev.filter(debt => debt.id !== id));
      toast({ title: 'Debt deleted successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting debt',
        description: error.message,
      });
    }
  }, [user, toast]);

  // Helper to convert currency amount to USD using live rates when available
  const convertToUSD = useCallback((amount: number, currency: string): number => {
    const normalizedCurrency = (currency || 'USD').trim().toUpperCase();
    
    // USD needs no conversion
    if (normalizedCurrency === 'USD') return amount;
    
    // Use live rate if available (API returns USD→Currency, we need Currency→USD)
    if (liveForexRates?.[normalizedCurrency] && liveForexRates[normalizedCurrency] > 0) {
      return amount * (1 / liveForexRates[normalizedCurrency]);
    }
    
    // Fallback to static rates
    const rate = FOREX_RATES_TO_USD[normalizedCurrency as BankingCurrency] || 1;
    return amount * rate;
  }, [liveForexRates]);

  // Calculate totals in USD using live rates when available
  const totalDebt = useMemo(() => {
    return debts.reduce((sum, d) => {
      return sum + convertToUSD(d.principal_amount, d.currency || 'USD');
    }, 0);
  }, [debts, convertToUSD]);
  
  const monthlyPayments = useMemo(() => {
    return debts.reduce((sum, d) => {
      if (!d.monthly_payment) return sum;
      return sum + convertToUSD(d.monthly_payment, d.currency || 'USD');
    }, 0);
  }, [debts, convertToUSD]);
  
  const monthlyInterest = useMemo(() => {
    return debts.reduce((sum, d) => {
      const monthlyRate = d.interest_rate / 100 / 12;
      const interestInCurrency = d.principal_amount * monthlyRate;
      return sum + convertToUSD(interestInCurrency, d.currency || 'USD');
    }, 0);
  }, [debts, convertToUSD]);

  return {
    debts,
    loading,
    addDebt,
    updateDebt,
    deleteDebt,
    refetch: fetchDebts,
    totalDebt,
    monthlyPayments,
    monthlyInterest,
  };
}
