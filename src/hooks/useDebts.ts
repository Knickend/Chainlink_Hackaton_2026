import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Debt, DebtType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function useDebts() {
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
      }).select().single();

      if (error) throw error;

      setDebts(prev => [{
        id: data.id,
        name: data.name,
        debt_type: data.debt_type as DebtType,
        principal_amount: Number(data.principal_amount),
        interest_rate: Number(data.interest_rate),
        monthly_payment: data.monthly_payment ? Number(data.monthly_payment) : undefined,
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
      const { error } = await supabase.from('debts').update({
        name: debtData.name,
        debt_type: debtData.debt_type,
        principal_amount: debtData.principal_amount,
        interest_rate: debtData.interest_rate,
        monthly_payment: debtData.monthly_payment || null,
      }).eq('id', id);

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

  // Calculate totals
  const totalDebt = debts.reduce((sum, d) => sum + d.principal_amount, 0);
  const monthlyPayments = debts.reduce((sum, d) => sum + (d.monthly_payment || 0), 0);
  const monthlyInterest = debts.reduce((sum, d) => {
    // If no monthly payment, estimate interest portion
    const monthlyRate = d.interest_rate / 100 / 12;
    return sum + (d.principal_amount * monthlyRate);
  }, 0);

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
