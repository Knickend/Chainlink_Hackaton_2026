import { useMemo, ReactNode } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import type { LayoutItem, ResponsiveLayouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { DashboardCardWrapper } from './DashboardCardWrapper';

interface DashboardGridProps {
  layouts: ResponsiveLayouts;
  hiddenCards: string[];
  isEditMode: boolean;
  onLayoutChange: (currentLayout: readonly LayoutItem[], allLayouts: ResponsiveLayouts) => void;
  onHideCard: (cardId: string) => void;
  cardRenderers: Record<string, ReactNode>;
}

export function DashboardGrid({
  layouts,
  hiddenCards,
  isEditMode,
  onLayoutChange,
  onHideCard,
  cardRenderers,
}: DashboardGridProps) {
  const { width, containerRef } = useContainerWidth({ initialWidth: 1200 });

  const visibleCards = useMemo(() => {
    return Object.keys(cardRenderers).filter(id => !hiddenCards.includes(id));
  }, [cardRenderers, hiddenCards]);

  const filteredLayouts = useMemo(() => {
    const result: ResponsiveLayouts = {};
    for (const [bp, layout] of Object.entries(layouts)) {
      if (layout) {
        result[bp] = (layout as LayoutItem[]).filter(item => visibleCards.includes(item.i));
      }
    }
    return result;
  }, [layouts, visibleCards]);

  return (
    <div ref={containerRef}>
      <ResponsiveGridLayout
        className="layout"
        width={width}
        layouts={filteredLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 1 }}
        rowHeight={80}
        dragConfig={{ enabled: isEditMode, handle: '.dashboard-drag-handle' }}
        resizeConfig={{ enabled: isEditMode }}
        onLayoutChange={onLayoutChange}
        margin={[16, 16] as const}
      >
        {visibleCards.map((cardId) => (
          <div key={cardId}>
            <DashboardCardWrapper
              cardId={cardId}
              isEditMode={isEditMode}
              onHide={() => onHideCard(cardId)}
            >
              {cardRenderers[cardId]}
            </DashboardCardWrapper>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
