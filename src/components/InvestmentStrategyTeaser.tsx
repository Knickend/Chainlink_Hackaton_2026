import { motion } from 'framer-motion';
import { Target, Lock, Sparkles, TrendingUp, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InvestmentStrategyTeaserProps {
  freeMonthlyIncome: number;
  formatValue: (value: number) => string;
  onUpgrade: () => void;
  delay?: number;
}

export function InvestmentStrategyTeaser({ freeMonthlyIncome, formatValue, onUpgrade, delay = 0 }: InvestmentStrategyTeaserProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card rounded-xl p-6 relative overflow-hidden"
    >
      {/* Blurred background preview */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="p-6 opacity-30 blur-[2px]">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-32 bg-muted-foreground/20 rounded" />
            <div className="h-8 w-20 bg-primary/20 rounded" />
          </div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-secondary/20">
                <div className="h-3 w-12 mx-auto bg-muted-foreground/20 rounded mb-2" />
                <div className="h-4 w-16 mx-auto bg-primary/20 rounded" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between p-2 bg-secondary/10 rounded">
                <div className="h-3 w-20 bg-muted-foreground/20 rounded" />
                <div className="h-3 w-12 bg-primary/20 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Foreground content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[200px] text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 relative">
          <Target className="w-7 h-7 text-primary" />
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center">
            <Lock className="w-3 h-3 text-primary" />
          </div>
        </div>
        
        <h3 className="font-semibold text-lg mb-2">Investment Strategy Advisor</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
          Get personalized monthly investment recommendations based on your {formatValue(freeMonthlyIncome)} free income.
        </p>
        
        <div className="flex flex-wrap justify-center gap-2 mb-4 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded-full bg-secondary/50 flex items-center gap-1">
            <PieChart className="w-3 h-3" />
            Asset allocation
          </span>
          <span className="px-2 py-1 rounded-full bg-secondary/50 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Smart tips
          </span>
        </div>

        <Button onClick={onUpgrade} className="gap-2">
          <Sparkles className="w-4 h-4" />
          Upgrade to Pro
        </Button>
      </div>
    </motion.div>
  );
}
