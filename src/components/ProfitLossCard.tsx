import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ChevronRight, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProBadge } from './ProBadge';
import { ProfitLossData } from '@/hooks/useProfitLoss';
import { ProfitLossDetailDialog } from './ProfitLossDetailDialog';
import { cn } from '@/lib/utils';

interface ProfitLossCardProps {
  pnlData: ProfitLossData;
  formatValue: (value: number, showSign?: boolean) => string;
  delay?: number;
}

export function ProfitLossCard({ pnlData, formatValue, delay = 0 }: ProfitLossCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const { totalPnL, totalUnrealizedPnL, totalRealizedPnL, totalPnLPercent } = pnlData;
  const isPositive = totalPnL >= 0;
  const hasData = pnlData.assetsWithCostBasis.length > 0 || totalRealizedPnL !== 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
      >
        <Card className="glass-card border-primary/20 h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Profit & Loss
              </CardTitle>
              <ProBadge />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasData ? (
              <>
                {/* Total P&L */}
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground mb-1">Total P&L</p>
                  <div className="flex items-center justify-center gap-2">
                    {isPositive ? (
                      <TrendingUp className="w-5 h-5 text-success" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-destructive" />
                    )}
                    <span className={cn(
                      'text-2xl font-bold',
                      isPositive ? 'text-success' : 'text-destructive'
                    )}>
                      {isPositive ? '+' : ''}{formatValue(totalPnL)}
                    </span>
                  </div>
                  <p className={cn(
                    'text-sm font-medium',
                    isPositive ? 'text-success' : 'text-destructive'
                  )}>
                    {isPositive ? '+' : ''}{totalPnLPercent.toFixed(1)}%
                  </p>
                </div>

                {/* Unrealized vs Realized */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Unrealized</p>
                    <p className={cn(
                      'text-sm font-semibold',
                      totalUnrealizedPnL >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {totalUnrealizedPnL >= 0 ? '+' : ''}{formatValue(totalUnrealizedPnL)}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Realized</p>
                    <p className={cn(
                      'text-sm font-semibold',
                      totalRealizedPnL >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {totalRealizedPnL >= 0 ? '+' : ''}{formatValue(totalRealizedPnL)}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  className="w-full justify-between text-muted-foreground hover:text-foreground"
                  onClick={() => setShowDetails(true)}
                >
                  View Details
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">
                  No cost basis data yet.
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Add purchase price when editing assets to track P&L.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <ProfitLossDetailDialog
        open={showDetails}
        onOpenChange={setShowDetails}
        pnlData={pnlData}
        formatValue={formatValue}
      />
    </>
  );
}
