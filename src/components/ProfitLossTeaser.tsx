import { motion } from 'framer-motion';
import { TrendingUp, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProfitLossTeaserProps {
  onUpgrade: () => void;
  delay?: number;
}

export function ProfitLossTeaser({ onUpgrade, delay = 0 }: ProfitLossTeaserProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="glass-card border-primary/20 relative overflow-hidden">
        {/* Blurred preview content */}
        <div className="blur-sm pointer-events-none select-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Profit & Loss
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Total P&L - main stat */}
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-success/10">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total P&L</p>
                  <span className="text-2xl font-bold text-success">+$12,450.32</span>
                  <p className="text-sm font-medium text-success">+8.2%</p>
                </div>
              </div>

              {/* Unrealized & Realized - side by side */}
              <div className="flex gap-4 md:gap-6">
                <div className="bg-secondary/30 rounded-lg p-4 min-w-[140px]">
                  <p className="text-xs text-muted-foreground mb-1">Unrealized</p>
                  <p className="text-lg font-semibold text-success">+$10,200.00</p>
                  <p className="text-xs text-success/80">+7.1%</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-4 min-w-[140px]">
                  <p className="text-xs text-muted-foreground mb-1">Realized</p>
                  <p className="text-lg font-semibold text-success">+$2,250.32</p>
                  <p className="text-xs text-muted-foreground">From sales</p>
                </div>
              </div>

              {/* View Details button placeholder */}
              <Button variant="outline" className="gap-2 md:w-auto">
                View Details
              </Button>
            </div>
          </CardContent>
        </div>

        {/* Overlay with upgrade CTA */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Pro Feature</span>
          </div>
          <p className="text-sm text-muted-foreground text-center mb-4 px-4">
            Track your investment gains and losses across your portfolio
          </p>
          <Button onClick={onUpgrade} className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Unlock P&L Tracking
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
