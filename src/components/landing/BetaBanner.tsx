import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export function BetaBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-[60] bg-warning/10 border-b border-warning/30 backdrop-blur-sm"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-8 flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning text-warning-foreground text-[10px] sm:text-xs font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-warning-foreground animate-pulse" />
          Beta
        </span>
        <span className="text-xs sm:text-sm text-warning font-medium">
          This app is in beta testing. Features may change.
        </span>
      </div>
    </motion.div>
  );
}
