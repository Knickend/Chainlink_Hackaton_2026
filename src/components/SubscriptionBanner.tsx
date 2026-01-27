import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';
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
            <h3 className="font-semibold text-foreground">Upgrade to Pro</h3>
            <p className="text-sm text-muted-foreground">
              Unlock unlimited assets, advanced analytics & more
            </p>
          </div>
        </div>
        <Button onClick={onUpgrade} className="gap-2 bg-primary hover:bg-primary/90">
          <Crown className="w-4 h-4" />
          Upgrade for $4.99/mo
        </Button>
      </div>
    </motion.div>
  );
}
