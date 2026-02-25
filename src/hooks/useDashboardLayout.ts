import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardSection {
  id: string;
  visible: boolean;
  order: number;
}

const DEFAULT_SECTIONS: DashboardSection[] = [
  { id: 'key-metrics', visible: true, order: 0 },
  { id: 'charts', visible: true, order: 1 },
  { id: 'pnl', visible: true, order: 2 },
  { id: 'goals', visible: true, order: 3 },
  { id: 'strategy', visible: true, order: 4 },
  { id: 'assets', visible: true, order: 5 },
  { id: 'income-expenses', visible: true, order: 6 },
  { id: 'debt', visible: true, order: 7 },
];

const SECTION_LABELS: Record<string, string> = {
  'key-metrics': 'Key Metrics',
  'charts': 'Charts',
  'pnl': 'Profit & Loss',
  'goals': 'Financial Goals',
  'strategy': 'Investment Strategy',
  'assets': 'Assets by Category',
  'income-expenses': 'Income, Expenses & Debt',
  'debt': 'Debt Payoff Calculator',
};

export function useDashboardLayout() {
  const { user } = useAuth();
  const [sections, setSections] = useState<DashboardSection[]>(DEFAULT_SECTIONS);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    const load = async () => {
      try {
        const { data } = await supabase
          .from('dashboard_layouts')
          .select('layout_config')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.layout_config) {
          const config = data.layout_config as { sections?: DashboardSection[] };
          if (config.sections?.length) {
            setSections(config.sections);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard layout:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  const saveLayout = useCallback(async (newSections: DashboardSection[]) => {
    if (!user) return;
    setSections(newSections);
    try {
      const { data: existing } = await supabase
        .from('dashboard_layouts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const config = { sections: newSections } as unknown as Record<string, unknown>;
      if (existing) {
        await supabase
          .from('dashboard_layouts')
          .update({ layout_config: config as any })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('dashboard_layouts')
          .insert([{ user_id: user.id, layout_config: config as any }]);
      }
    } catch (err) {
      console.error('Failed to save layout:', err);
    }
  }, [user]);

  const toggleSection = useCallback((id: string) => {
    const updated = sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s);
    saveLayout(updated);
  }, [sections, saveLayout]);

  const moveSection = useCallback((id: string, direction: 'up' | 'down') => {
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(s => s.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sorted.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const tempOrder = sorted[idx].order;
    sorted[idx] = { ...sorted[idx], order: sorted[swapIdx].order };
    sorted[swapIdx] = { ...sorted[swapIdx], order: tempOrder };
    saveLayout(sorted);
  }, [sections, saveLayout]);

  const resetLayout = useCallback(() => {
    saveLayout(DEFAULT_SECTIONS);
  }, [saveLayout]);

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return {
    sections: sortedSections,
    sectionLabels: SECTION_LABELS,
    isEditing,
    setIsEditing,
    isLoading,
    toggleSection,
    moveSection,
    resetLayout,
    isSectionVisible: (id: string) => sortedSections.find(s => s.id === id)?.visible ?? true,
  };
}
