import { Settings2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { CardConfig } from '@/hooks/useDashboardLayout';

interface DashboardSettingsPanelProps {
  cardRegistry: CardConfig[];
  hiddenCards: string[];
  onShowCard: (cardId: string) => void;
  onHideCard: (cardId: string) => void;
  onReset: () => void;
}

export function DashboardSettingsPanel({
  cardRegistry,
  hiddenCards,
  onShowCard,
  onHideCard,
  onReset,
}: DashboardSettingsPanelProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          <span className="hidden sm:inline">Cards</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Dashboard Cards</SheetTitle>
          <SheetDescription>Toggle cards on or off, or reset to the default layout.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {cardRegistry.map((card) => {
            const isVisible = !hiddenCards.includes(card.id);
            return (
              <div key={card.id} className="flex items-center justify-between">
                <span className="text-sm font-medium">{card.label}</span>
                <Switch
                  checked={isVisible}
                  onCheckedChange={(checked) => {
                    if (checked) onShowCard(card.id);
                    else onHideCard(card.id);
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-8">
          <Button variant="outline" size="sm" className="gap-2 w-full" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
