import { useState, useEffect, useCallback, useRef } from 'react';
import type { LayoutItem, ResponsiveLayouts } from 'react-grid-layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDebouncedCallback } from '@/hooks/useDebounce';

export interface CardConfig {
  id: string;
  label: string;
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
}

export const CARD_REGISTRY: CardConfig[] = [
  { id: 'net-worth-trend', label: 'Net Worth Trend', defaultW: 4, defaultH: 3, minW: 3, minH: 2 },
  { id: 'allocation-chart', label: 'Allocation Chart', defaultW: 4, defaultH: 3, minW: 3, minH: 2 },
  { id: 'portfolio-history', label: 'Portfolio History', defaultW: 4, defaultH: 4, minW: 3, minH: 3 },
  { id: 'pnl-overview', label: 'Profit & Loss', defaultW: 12, defaultH: 3, minW: 6, minH: 2 },
  { id: 'goals-overview', label: 'Financial Goals', defaultW: 12, defaultH: 3, minW: 6, minH: 2 },
  { id: 'investment-strategy', label: 'Investment Strategy', defaultW: 12, defaultH: 3, minW: 6, minH: 2 },
  { id: 'income-card', label: 'Income', defaultW: 4, defaultH: 4, minW: 3, minH: 3 },
  { id: 'expense-card', label: 'Expenses', defaultW: 4, defaultH: 4, minW: 3, minH: 3 },
  { id: 'debt-card', label: 'Debt Overview', defaultW: 4, defaultH: 4, minW: 3, minH: 3 },
  { id: 'debt-payoff', label: 'Debt Payoff Calculator', defaultW: 12, defaultH: 3, minW: 6, minH: 2 },
  { id: 'rebalancer', label: 'Portfolio Rebalancer', defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
];

function generateDefaultLayout(): LayoutItem[] {
  let y = 0;
  const layout: LayoutItem[] = [];

  layout.push({ i: 'net-worth-trend', x: 0, y, w: 4, h: 3, minW: 3, minH: 2 });
  layout.push({ i: 'allocation-chart', x: 4, y, w: 4, h: 3, minW: 3, minH: 2 });
  layout.push({ i: 'portfolio-history', x: 8, y, w: 4, h: 4, minW: 3, minH: 3 });
  y += 4;

  layout.push({ i: 'pnl-overview', x: 0, y, w: 12, h: 3, minW: 6, minH: 2 });
  y += 3;

  layout.push({ i: 'goals-overview', x: 0, y, w: 12, h: 3, minW: 6, minH: 2 });
  y += 3;

  layout.push({ i: 'investment-strategy', x: 0, y, w: 12, h: 3, minW: 6, minH: 2 });
  y += 3;

  layout.push({ i: 'income-card', x: 0, y, w: 4, h: 4, minW: 3, minH: 3 });
  layout.push({ i: 'expense-card', x: 4, y, w: 4, h: 4, minW: 3, minH: 3 });
  layout.push({ i: 'debt-card', x: 8, y, w: 4, h: 4, minW: 3, minH: 3 });
  y += 4;

  layout.push({ i: 'debt-payoff', x: 0, y, w: 12, h: 3, minW: 6, minH: 2 });
  y += 3;

  layout.push({ i: 'rebalancer', x: 0, y, w: 6, h: 4, minW: 4, minH: 3 });

  return layout;
}

interface LayoutConfig {
  layouts: ResponsiveLayouts;
  hiddenCards: string[];
}

export function useDashboardLayout() {
  const { user } = useAuth();
  const [layouts, setLayouts] = useState<ResponsiveLayouts>({ lg: generateDefaultLayout() });
  const [hiddenCards, setHiddenCards] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const isSaving = useRef(false);

  useEffect(() => {
    if (!user) {
      setLayouts({ lg: generateDefaultLayout() });
      setHiddenCards([]);
      setIsLoaded(true);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from('dashboard_layouts')
        .select('layout_config')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.layout_config) {
        const config = data.layout_config as unknown as LayoutConfig;
        if (config.layouts) setLayouts(config.layouts);
        if (config.hiddenCards) setHiddenCards(config.hiddenCards);
      }
      setIsLoaded(true);
    };
    load();
  }, [user]);

  const saveLayout = useDebouncedCallback(async (newLayouts: ResponsiveLayouts, newHidden: string[]) => {
    if (!user || isSaving.current) return;
    isSaving.current = true;

    const config: LayoutConfig = { layouts: newLayouts, hiddenCards: newHidden };
    const jsonConfig = JSON.parse(JSON.stringify(config));

    const { data: existing } = await supabase
      .from('dashboard_layouts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('dashboard_layouts')
        .update({ layout_config: jsonConfig })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('dashboard_layouts')
        .insert({ user_id: user.id, layout_config: jsonConfig });
    }

    isSaving.current = false;
  }, 1000);

  const onLayoutChange = useCallback((currentLayout: readonly LayoutItem[], allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts);
    if (user) saveLayout(allLayouts, hiddenCards);
  }, [user, hiddenCards, saveLayout]);

  const hideCard = useCallback((cardId: string) => {
    const newHidden = [...hiddenCards, cardId];
    setHiddenCards(newHidden);
    if (user) saveLayout(layouts, newHidden);
  }, [hiddenCards, layouts, user, saveLayout]);

  const showCard = useCallback((cardId: string) => {
    const newHidden = hiddenCards.filter(id => id !== cardId);
    setHiddenCards(newHidden);
    if (user) saveLayout(layouts, newHidden);
  }, [hiddenCards, layouts, user, saveLayout]);

  const resetLayout = useCallback(() => {
    const defaultLayouts: ResponsiveLayouts = { lg: generateDefaultLayout() };
    setLayouts(defaultLayouts);
    setHiddenCards([]);
    if (user) saveLayout(defaultLayouts, []);
  }, [user, saveLayout]);

  return {
    layouts,
    hiddenCards,
    isEditMode,
    setIsEditMode,
    onLayoutChange,
    hideCard,
    showCard,
    resetLayout,
    isLoaded,
    cardRegistry: CARD_REGISTRY,
  };
}
