import { useMemo, useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import type { LayoutItem, ResponsiveLayouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { DashboardCardWrapper } from './DashboardCardWrapper';

/** Stable container width hook using ResizeObserver (avoids react-grid-layout's useContainerWidth loop) */
function useStableContainerWidth(initialWidth = 1200) {
  const [width, setWidth] = useState(initialWidth);
  const ref = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Set initial width
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setWidth(rect.width);

    observerRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setWidth(w);
      }
    });
    observerRef.current.observe(el);

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { width, containerRef: ref };
}

interface DashboardGridProps {
  layouts: ResponsiveLayouts;
  hiddenCards: string[];
  isEditMode: boolean;
  onLayoutChange: (currentLayout: readonly LayoutItem[], allLayouts: ResponsiveLayouts) => void;
  onUserLayoutChange: () => void;
  onHideCard: (cardId: string) => void;
  cardRenderers: Record<string, ReactNode>;
}

export function DashboardGrid({
  layouts,
  hiddenCards,
  isEditMode,
  onLayoutChange,
  onUserLayoutChange,
  onHideCard,
  cardRenderers,
}: DashboardGridProps) {
  const { width, containerRef } = useStableContainerWidth(1200);

  const visibleCards = useMemo(() => {
    return Object.keys(cardRenderers).filter(id => !hiddenCards.includes(id));
  }, [cardRenderers, hiddenCards]);

  const filteredLayoutsRef = useRef<ResponsiveLayouts>({});
  const filteredLayouts = useMemo(() => {
    const result: ResponsiveLayouts = {};
    for (const [bp, layout] of Object.entries(layouts)) {
      if (layout) {
        result[bp] = (layout as LayoutItem[]).filter(item => visibleCards.includes(item.i));
      }
    }
    const newStr = JSON.stringify(result);
    const prevStr = JSON.stringify(filteredLayoutsRef.current);
    if (newStr === prevStr) return filteredLayoutsRef.current;
    filteredLayoutsRef.current = result;
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
        onDragStop={onUserLayoutChange}
        onResizeStop={onUserLayoutChange}
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
