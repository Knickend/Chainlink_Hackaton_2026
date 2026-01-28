import { motion } from 'framer-motion';
import { History, Lock, Sparkles, CalendarDays, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PortfolioHistoryTeaserProps {
  onUpgrade: () => void;
  delay?: number;
}

export function PortfolioHistoryTeaser({ onUpgrade, delay = 0 }: PortfolioHistoryTeaserProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card rounded-xl p-6 relative overflow-hidden h-full"
    >
      {/* Blurred background preview */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="p-6 opacity-30 blur-[2px]">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-28 bg-muted-foreground/20 rounded" />
            <div className="h-6 w-16 bg-primary/20 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-secondary/20">
              <div className="h-3 w-16 bg-muted-foreground/20 rounded mb-2" />
              <div className="h-5 w-20 bg-primary/20 rounded" />
            </div>
            <div className="p-3 rounded-lg bg-secondary/20">
              <div className="h-3 w-16 bg-muted-foreground/20 rounded mb-2" />
              <div className="h-5 w-20 bg-emerald-500/20 rounded" />
            </div>
          </div>
          <div className="h-24 bg-secondary/10 rounded-lg flex items-end justify-around px-4 pb-2">
            {[40, 55, 45, 60, 50, 70].map((h, i) => (
              <div key={i} className="w-4 bg-primary/30 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Foreground content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[200px] text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 relative">
          <History className="w-7 h-7 text-primary" />
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center">
            <Lock className="w-3 h-3 text-primary" />
          </div>
        </div>
        
        <h3 className="font-semibold text-lg mb-2">Portfolio History</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
          Track your financial journey with monthly snapshots and side-by-side comparisons.
        </p>
        
        <div className="flex flex-wrap justify-center gap-2 mb-4 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded-full bg-secondary/50 flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            Monthly snapshots
          </span>
          <span className="px-2 py-1 rounded-full bg-secondary/50 flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3" />
            Compare months
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
