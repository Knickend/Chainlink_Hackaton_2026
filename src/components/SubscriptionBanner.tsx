import { motion } from 'framer-motion';
import { Crown, Sparkles, BarChart3, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubscriptionBannerProps {
  onUpgrade: () => void;
}

export function SubscriptionBanner({ onUpgrade }: SubscriptionBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-4 mb-6 border border-primary/20 bg-gradient-to-r from-primary/10 via-transparent to-primary/10"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/20">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Unlock Premium Features</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                Performance tracking
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                One-time expenses
              </span>
            </p>
          </div>
        </div>
        <Button onClick={onUpgrade} className="gap-2 bg-primary hover:bg-primary/90">
          <Crown className="w-4 h-4" />
          View Plans
        </Button>
      </div>
    </motion.div>
  );
}
