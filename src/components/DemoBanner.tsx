import { motion } from 'framer-motion';
import { LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function DemoBanner() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card border border-primary/20 rounded-xl p-4 mb-6"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h3 className="font-semibold text-foreground">
            👋 Welcome to WealthManager Demo
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            You're viewing sample data. Sign in or create an account to track your own portfolio.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/auth')}
            className="gap-2"
          >
            <LogIn className="w-4 h-4" />
            Sign in
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/auth?signup=true')}
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Get Started
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
