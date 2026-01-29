import { motion } from 'framer-motion';
import { Coins, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Asset } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface YieldBreakdownCardProps {
  totalYield: number;
  assets: Asset[];
  formatValue: (value: number) => string;
  delay?: number;
}

export function YieldBreakdownCard({
  totalYield,
  assets,
  formatValue,
  delay = 0,
}: YieldBreakdownCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filter assets that have a yield
  const yieldingAssets = assets.filter((a) => a.yield && a.yield > 0);

  // Calculate yield amount for each asset
  const yieldBreakdown = yieldingAssets.map((asset) => ({
    name: asset.name,
    symbol: asset.symbol,
    category: asset.category,
    yieldPercent: asset.yield!,
    yieldAmount: asset.value * (asset.yield! / 100),
    assetValue: asset.value,
  }));

  // Sort by yield amount descending
  yieldBreakdown.sort((a, b) => b.yieldAmount - a.yieldAmount);

  const getCategoryBgColor = (category: string) => {
    switch (category) {
      case 'crypto':
        return 'bg-bitcoin/20 text-bitcoin';
      case 'banking':
        return 'bg-blue-400/20 text-blue-400';
      case 'stocks':
        return 'bg-success/20 text-success';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'crypto':
        return 'Staking';
      case 'banking':
        return 'Interest';
      case 'stocks':
        return 'Dividend';
      default:
        return 'Yield';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card p-6 border-bitcoin/30"
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 rounded-xl bg-bitcoin/20 text-bitcoin">
            <Coins className="w-5 h-5" />
          </div>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors',
                yieldingAssets.length === 0 && 'opacity-50 cursor-not-allowed'
              )}
              disabled={yieldingAssets.length === 0}
            >
              <span>{yieldingAssets.length} source{yieldingAssets.length !== 1 ? 's' : ''}</span>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </CollapsibleTrigger>
        </div>
        
        <p className="stat-label mb-1">Annual Yield</p>
        <p className="stat-value gradient-text">{formatValue(totalYield)}</p>
        <p className="text-xs text-muted-foreground mt-2">From investments</p>

        <CollapsibleContent>
          <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Breakdown
            </p>
            {yieldBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No yield-generating assets yet
              </p>
            ) : (
              <div className="space-y-2">
                {yieldBreakdown.map((item, idx) => (
                  <div
                    key={`${item.symbol || item.name}-${idx}`}
                    className="py-2 px-3 rounded-lg bg-secondary/30"
                  >
                    {/* Top row: Asset name and yield amount */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className="font-mono text-sm text-success">
                        +{formatValue(item.yieldAmount)}
                      </span>
                    </div>
                    {/* Bottom row: Category and percentage */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        getCategoryBgColor(item.category)
                      )}>
                        {getCategoryLabel(item.category)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.yieldPercent.toFixed(1)}% APY
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}
