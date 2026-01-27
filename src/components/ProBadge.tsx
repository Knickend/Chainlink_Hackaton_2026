import { Crown } from 'lucide-react';
import { motion } from 'framer-motion';

export function ProBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30"
    >
      <Crown className="w-3 h-3 text-primary" />
      <span className="text-xs font-medium text-primary">PRO</span>
    </motion.div>
  );
}
