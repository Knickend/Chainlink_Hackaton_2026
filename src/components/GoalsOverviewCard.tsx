import { motion } from 'framer-motion';
import { Target, Car, Plane, Shield, Home, GraduationCap, Heart, Landmark, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Goal, GoalCategory, getCurrencySymbol } from '@/lib/types';
import { GoalInput } from '@/hooks/useGoals';
import { AddGoalDialog } from './AddGoalDialog';
import { EditGoalDialog } from './EditGoalDialog';
import { ViewAllGoalsDialog } from './ViewAllGoalsDialog';
import { GoalsTeaser } from './GoalsTeaser';
import { format } from 'date-fns';

interface GoalsOverviewCardProps {
  goals: Goal[];
  loading?: boolean;
  calculateProgress: (goal: Goal) => number;
  calculateMonthsToGoal: (goal: Goal) => number | undefined;
  getGoalStatus: (goal: Goal) => 'completed' | 'on_track' | 'behind' | 'no_deadline';
  formatValue: (value: number, showCents?: boolean) => string;
  onAddGoal?: (data: GoalInput) => void;
  onUpdateGoal?: (id: string, data: Partial<GoalInput & { is_completed?: boolean }>) => void;
  onDeleteGoal?: (id: string) => void;
  canAddGoal: boolean;
  goalLimit?: number;
  onUpgrade?: () => void;
  delay?: number;
  isDemo?: boolean;
}

const CATEGORY_ICONS: Record<GoalCategory, React.ElementType> = {
  car: Car,
  holiday: Plane,
  emergency: Shield,
  home: Home,
  education: GraduationCap,
  wedding: Heart,
  retirement: Landmark,
  other: Target,
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  completed: { label: 'Done', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  on_track: { label: 'On Track', className: 'bg-primary/20 text-primary border-primary/30' },
  behind: { label: 'Behind', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  no_deadline: { label: 'Active', className: 'bg-muted text-muted-foreground border-border' },
};

export function GoalsOverviewCard({
  goals,
  loading,
  calculateProgress,
  calculateMonthsToGoal,
  getGoalStatus,
  formatValue,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  canAddGoal,
  goalLimit,
  onUpgrade,
  delay = 0,
  isDemo = false,
}: GoalsOverviewCardProps) {
  // Filter out completed goals and sort by priority, show top 3
  const activeGoals = goals
    .filter(g => !g.is_completed)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 3);

  // Show teaser if user hit limit and tries to add more
  if (!canAddGoal && goalLimit !== undefined && goals.length >= goalLimit && onUpgrade) {
    return (
      <GoalsTeaser
        currentGoals={goals.length}
        goalLimit={goalLimit}
        onUpgrade={onUpgrade}
        delay={delay}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Financial Goals
              {goalLimit !== undefined && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({goals.length}/{goalLimit === undefined ? '∞' : goalLimit})
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {goals.length > 0 && (
                <ViewAllGoalsDialog
                  goals={goals}
                  calculateProgress={calculateProgress}
                  calculateMonthsToGoal={calculateMonthsToGoal}
                  getGoalStatus={getGoalStatus}
                  formatValue={formatValue}
                  onUpdateGoal={isDemo ? undefined : onUpdateGoal}
                  onDeleteGoal={isDemo ? undefined : onDeleteGoal}
                />
              )}
              {!isDemo && onAddGoal && (
                <AddGoalDialog onAdd={onAddGoal} disabled={!canAddGoal} />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/30 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-2 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          ) : activeGoals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">
                {goals.length > 0 
                  ? "All goals completed! 🎉" 
                  : "No goals yet. Set your first financial goal!"
                }
              </p>
              {!isDemo && onAddGoal && canAddGoal && (
                <AddGoalDialog onAdd={onAddGoal} />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activeGoals.map((goal) => {
                const Icon = CATEGORY_ICONS[goal.category];
                const progress = calculateProgress(goal);
                const monthsRemaining = calculateMonthsToGoal(goal);
                const status = getGoalStatus(goal);
                const statusStyle = STATUS_STYLES[status];
                const currencySymbol = getCurrencySymbol(goal.currency);

                return (
                  <div
                    key={goal.id}
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium truncate">{goal.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={`text-[10px] ${statusStyle.className}`}>
                          {statusStyle.label}
                        </Badge>
                        {!isDemo && onUpdateGoal && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <EditGoalDialog goal={goal} onUpdate={onUpdateGoal} />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {currencySymbol}{goal.current_amount.toLocaleString()} / {currencySymbol}{goal.target_amount.toLocaleString()}
                        </span>
                        <span className="font-medium text-foreground">{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                      {monthsRemaining !== undefined && monthsRemaining > 0 && (
                        <p className="text-[10px] text-muted-foreground text-right">
                          ~{monthsRemaining} month{monthsRemaining === 1 ? '' : 's'} to go
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
