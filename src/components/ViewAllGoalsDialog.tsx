import { useState } from 'react';
import { Eye, Target, Car, Plane, Shield, Home, GraduationCap, Heart, Landmark, Trash2, CheckCircle, Circle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Goal, GoalCategory, getCurrencySymbol } from '@/lib/types';
import { GoalInput } from '@/hooks/useGoals';
import { GoalRecommendation } from '@/lib/goalAnalysis';
import { EditGoalDialog } from './EditGoalDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { format } from 'date-fns';

interface ViewAllGoalsDialogProps {
  goals: Goal[];
  calculateProgress: (goal: Goal) => number;
  calculateMonthsToGoal: (goal: Goal) => number | undefined;
  getGoalStatus: (goal: Goal) => 'completed' | 'on_track' | 'behind' | 'no_deadline';
  getRecommendation: (goal: Goal) => GoalRecommendation;
  formatValue: (value: number, showCents?: boolean) => string;
  onUpdateGoal?: (id: string, data: Partial<GoalInput & { is_completed?: boolean }>) => void;
  onDeleteGoal?: (id: string) => void;
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
  completed: { label: 'Completed', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  on_track: { label: 'On Track', className: 'bg-primary/20 text-primary border-primary/30' },
  behind: { label: 'Behind', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  no_deadline: { label: 'No Deadline', className: 'bg-muted text-muted-foreground border-border' },
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-muted-foreground',
};

export function ViewAllGoalsDialog({
  goals,
  calculateProgress,
  calculateMonthsToGoal,
  getGoalStatus,
  getRecommendation,
  formatValue,
  onUpdateGoal,
  onDeleteGoal,
}: ViewAllGoalsDialogProps) {
  const [open, setOpen] = useState(false);

  const sortedGoals = [...goals].sort((a, b) => {
    // Completed goals at the bottom
    if (a.is_completed && !b.is_completed) return 1;
    if (!a.is_completed && b.is_completed) return -1;
    // Then by priority (high first)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Eye className="w-4 h-4" />
          View All
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            All Financial Goals
          </DialogTitle>
          <DialogDescription>
            Track and manage all your savings goals.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {sortedGoals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No goals yet. Create your first goal to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedGoals.map((goal) => {
                const Icon = CATEGORY_ICONS[goal.category];
                const progress = calculateProgress(goal);
                const monthsRemaining = calculateMonthsToGoal(goal);
                const status = getGoalStatus(goal);
                const statusStyle = STATUS_STYLES[status];
                const currencySymbol = getCurrencySymbol(goal.currency);
                const recommendation = getRecommendation(goal);

                return (
                  <div
                    key={goal.id}
                    className={`glass-card rounded-lg p-4 border ${goal.is_completed ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className={`font-medium truncate ${goal.is_completed ? 'line-through' : ''}`}>
                            {goal.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className={PRIORITY_STYLES[goal.priority]}>
                              {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)} Priority
                            </span>
                            {goal.target_date && (
                              <>
                                <span>•</span>
                                <span>Due: {format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="outline" className={statusStyle.className}>
                          {statusStyle.label}
                        </Badge>
                        {onUpdateGoal && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onUpdateGoal(goal.id, { is_completed: !goal.is_completed })}
                              title={goal.is_completed ? 'Mark as incomplete' : 'Mark as complete'}
                            >
                              {goal.is_completed ? (
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </Button>
                            <EditGoalDialog goal={goal} onUpdate={onUpdateGoal} />
                          </>
                        )}
                        {onDeleteGoal && (
                          <DeleteConfirmDialog
                            onConfirm={() => onDeleteGoal(goal.id)}
                            title="Delete Goal"
                            description={`Are you sure you want to delete "${goal.name}"? This action cannot be undone.`}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            }
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {currencySymbol}{goal.current_amount.toLocaleString()} of {currencySymbol}{goal.target_amount.toLocaleString()}
                        </span>
                        <span className="font-medium">{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {goal.monthly_contribution 
                            ? `${currencySymbol}${goal.monthly_contribution.toLocaleString()}/month`
                            : 'No monthly contribution set'
                          }
                        </span>
                        {monthsRemaining !== undefined && (
                          <span>
                            {monthsRemaining === 0 
                              ? 'Goal reached!' 
                              : `~${monthsRemaining} month${monthsRemaining === 1 ? '' : 's'} remaining`
                            }
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Recommendation section for behind goals */}
                    {status === 'behind' && recommendation.hasRecommendation && onUpdateGoal && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-amber-400">Recommendation</p>
                            <p className="text-muted-foreground mt-1">
                              To reach your goal by {format(new Date(goal.target_date!), 'MMM yyyy')}, save{' '}
                              <span className="font-semibold text-foreground">
                                {currencySymbol}{recommendation.requiredMonthlySavings.toLocaleString()}/month
                              </span>
                              {recommendation.currentMonthlySavings > 0 && (
                                <> instead of {currencySymbol}{recommendation.currentMonthlySavings.toLocaleString()}/month</>
                              )}.
                            </p>
                            {recommendation.monthlyShortfall > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Monthly shortfall: {currencySymbol}{recommendation.monthlyShortfall.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 border-amber-500/30 hover:bg-amber-500/10"
                            onClick={() => onUpdateGoal(goal.id, { monthly_contribution: recommendation.requiredMonthlySavings })}
                          >
                            Apply {currencySymbol}{recommendation.requiredMonthlySavings.toLocaleString()}/mo
                          </Button>
                          {recommendation.suggestedDeadline && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
                              onClick={() => onUpdateGoal(goal.id, { target_date: format(recommendation.suggestedDeadline!, 'yyyy-MM-dd') })}
                            >
                              Extend to {format(recommendation.suggestedDeadline, 'MMM yyyy')}
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {goal.notes && (
                      <p className="mt-3 text-sm text-muted-foreground border-t pt-3 border-border/50">
                        {goal.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
