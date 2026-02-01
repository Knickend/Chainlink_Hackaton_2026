import { motion } from 'framer-motion';
import { Target, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GoalsTeaserProps {
  currentGoals: number;
  goalLimit: number;
  onUpgrade: () => void;
  delay?: number;
}

export function GoalsTeaser({ currentGoals, goalLimit, onUpgrade, delay = 0 }: GoalsTeaserProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="glass-card border-primary/20 relative overflow-hidden">
        {/* Blur overlay */}
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Goal Limit Reached</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              You've used all {goalLimit} goal{goalLimit === 1 ? '' : 's'} in your current plan. 
              Upgrade to add more financial goals.
            </p>
            <Button onClick={onUpgrade} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Upgrade Plan
            </Button>
          </div>
        </div>

        {/* Background content (blurred) */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Financial Goals
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 opacity-50">
            {/* Fake goal items */}
            <div className="p-3 rounded-lg bg-muted/30 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-2 bg-muted rounded w-full" />
            </div>
            <div className="p-3 rounded-lg bg-muted/30 animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-2" />
              <div className="h-2 bg-muted rounded w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
