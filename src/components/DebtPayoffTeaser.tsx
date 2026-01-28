import { motion } from 'framer-motion';
import { Calculator, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DebtPayoffTeaserProps {
  debtCount: number;
  onUpgrade: () => void;
  delay?: number;
}

export function DebtPayoffTeaser({ debtCount, onUpgrade, delay = 0 }: DebtPayoffTeaserProps) {
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
          <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-secondary/30 rounded-lg">
            <div className="text-center">
              <div className="h-3 w-16 mx-auto bg-muted-foreground/20 rounded" />
              <div className="h-5 w-12 mx-auto mt-1 bg-primary/20 rounded" />
            </div>
            <div className="text-center border-x border-border/50">
              <div className="h-3 w-16 mx-auto bg-muted-foreground/20 rounded" />
              <div className="h-5 w-14 mx-auto mt-1 bg-amber-500/20 rounded" />
            </div>
            <div className="text-center">
              <div className="h-3 w-16 mx-auto bg-muted-foreground/20 rounded" />
              <div className="h-5 w-12 mx-auto mt-1 bg-muted-foreground/20 rounded" />
            </div>
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 rounded-lg bg-secondary/20">
                <div className="flex justify-between mb-2">
                  <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
                  <div className="h-4 w-16 bg-primary/20 rounded" />
                </div>
                <div className="h-2 w-full bg-muted-foreground/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Foreground content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[200px] text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 relative">
          <Calculator className="w-7 h-7 text-primary" />
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center">
            <Lock className="w-3 h-3 text-primary" />
          </div>
        </div>
        
        <h3 className="font-semibold text-lg mb-2">Debt Payoff Calculator</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
          See exactly when you'll be debt-free with personalized payoff timelines for your {debtCount} {debtCount === 1 ? 'debt' : 'debts'}.
        </p>
        
        <div className="flex flex-wrap justify-center gap-2 mb-4 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded-full bg-secondary/50">Time to debt-free</span>
          <span className="px-2 py-1 rounded-full bg-secondary/50">Total interest</span>
          <span className="px-2 py-1 rounded-full bg-secondary/50">Payment analysis</span>
        </div>

        <Button onClick={onUpgrade} className="gap-2">
          <Sparkles className="w-4 h-4" />
          Upgrade to Pro
        </Button>
      </div>
    </motion.div>
  );
}
