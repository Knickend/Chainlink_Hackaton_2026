import { X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardCardWrapperProps {
  children: React.ReactNode;
  isEditMode: boolean;
  onHide: () => void;
  cardId: string;
}

export function DashboardCardWrapper({ children, isEditMode, onHide, cardId }: DashboardCardWrapperProps) {
  return (
    <div className={cn(
      "h-full w-full relative group",
      isEditMode && "ring-2 ring-primary/20 rounded-lg"
    )}>
      {isEditMode && (
        <>
          <div className="dashboard-drag-handle absolute top-0 left-0 right-0 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 bg-muted/60 rounded-t-lg backdrop-blur-sm">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 z-20 h-7 w-7 rounded-full bg-destructive/80 hover:bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onHide();
            }}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </>
      )}
      <div className={cn("h-full", isEditMode && "pt-8")}>
        {children}
      </div>
    </div>
  );
}
