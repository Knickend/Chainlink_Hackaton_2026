import { Goal } from '@/lib/types';
import { differenceInMonths, addMonths } from 'date-fns';

export interface GoalAnalysis {
  /** Total monthly contributions from all active, non-completed goals */
  totalMonthlyContributions: number;
  /** Monthly contributions for emergency fund goals only */
  emergencyFundContributions: number;
  /** Monthly contributions for non-emergency goals (Goal Savings) */
  goalSavingsContributions: number;
  /** Active goals with monthly contributions */
  activeContributingGoals: Goal[];
  /** Emergency fund goals only */
  emergencyFundGoals: Goal[];
  /** Non-emergency goals with contributions */
  savingsGoals: Goal[];
  /** Warning if goal contributions exceed free income */
  exceedsFreeIncome: boolean;
  /** Percentage of free income going to goals */
  goalIncomePercentage: number;
}

export interface GoalRecommendation {
  /** What's needed monthly to meet the deadline */
  requiredMonthlySavings: number;
  /** Current contribution (or 0) */
  currentMonthlySavings: number;
  /** Difference between required and current */
  monthlyShortfall: number;
  /** Months until target date */
  monthsRemaining: number;
  /** Based on months remaining (>0) */
  isAchievable: boolean;
  /** If current deadline can't be met at current rate */
  suggestedDeadline?: Date;
  /** Whether a recommendation should be shown */
  hasRecommendation: boolean;
}

/**
 * Calculate the required monthly savings to meet a goal's target date
 */
export function calculateRequiredMonthlySavings(goal: Goal): number {
  if (!goal.target_date) return 0;
  
  const remaining = goal.target_amount - goal.current_amount;
  if (remaining <= 0) return 0; // Goal already reached
  
  const now = new Date();
  const targetDate = new Date(goal.target_date);
  const monthsRemaining = differenceInMonths(targetDate, now);
  
  if (monthsRemaining <= 0) {
    // Deadline passed or is this month - need full amount
    return remaining;
  }
  
  return Math.ceil(remaining / monthsRemaining);
}

/**
 * Get comprehensive recommendation for a goal
 */
export function getGoalRecommendation(goal: Goal): GoalRecommendation {
  // No recommendation for completed goals or goals without target dates
  if (goal.is_completed || !goal.target_date) {
    return {
      requiredMonthlySavings: 0,
      currentMonthlySavings: goal.monthly_contribution || 0,
      monthlyShortfall: 0,
      monthsRemaining: 0,
      isAchievable: true,
      hasRecommendation: false,
    };
  }

  const requiredMonthlySavings = calculateRequiredMonthlySavings(goal);
  const currentMonthlySavings = goal.monthly_contribution || 0;
  const monthlyShortfall = Math.max(0, requiredMonthlySavings - currentMonthlySavings);
  
  // Calculate months remaining
  const now = new Date();
  const targetDate = new Date(goal.target_date);
  const monthsRemaining = Math.max(0, differenceInMonths(targetDate, now));
  
  // Goal already on track or reached
  if (monthlyShortfall === 0) {
    return {
      requiredMonthlySavings,
      currentMonthlySavings,
      monthlyShortfall: 0,
      monthsRemaining,
      isAchievable: true,
      hasRecommendation: false,
    };
  }
  
  // If current contribution exists, calculate when goal would actually be met
  let suggestedDeadline: Date | undefined;
  if (currentMonthlySavings > 0 && monthlyShortfall > 0) {
    const remaining = goal.target_amount - goal.current_amount;
    const actualMonthsNeeded = Math.ceil(remaining / currentMonthlySavings);
    suggestedDeadline = addMonths(new Date(), actualMonthsNeeded);
  }
  
  return {
    requiredMonthlySavings,
    currentMonthlySavings,
    monthlyShortfall,
    monthsRemaining,
    isAchievable: monthsRemaining > 0,
    suggestedDeadline,
    hasRecommendation: true,
  };
}

/**
 * Analyzes goals for integration with investment strategy
 * @param goals All user goals
 * @param freeMonthlyIncome Available income after expenses and debt payments
 * @returns Analysis of goal funding requirements
 */
export function analyzeGoals(
  goals: Goal[],
  freeMonthlyIncome: number
): GoalAnalysis {
  // Filter to only active (non-completed) goals with monthly contributions
  const activeContributingGoals = goals.filter(
    (g) => !g.is_completed && g.monthly_contribution && g.monthly_contribution > 0
  );

  // Separate emergency fund goals from other savings goals
  const emergencyFundGoals = activeContributingGoals.filter(
    (g) => g.category === 'emergency'
  );
  const savingsGoals = activeContributingGoals.filter(
    (g) => g.category !== 'emergency'
  );

  // Calculate contribution totals
  const emergencyFundContributions = emergencyFundGoals.reduce(
    (sum, g) => sum + (g.monthly_contribution || 0),
    0
  );
  const goalSavingsContributions = savingsGoals.reduce(
    (sum, g) => sum + (g.monthly_contribution || 0),
    0
  );
  const totalMonthlyContributions = emergencyFundContributions + goalSavingsContributions;

  // Calculate percentage of income going to goals
  const goalIncomePercentage =
    freeMonthlyIncome > 0
      ? (totalMonthlyContributions / freeMonthlyIncome) * 100
      : 0;

  return {
    totalMonthlyContributions,
    emergencyFundContributions,
    goalSavingsContributions,
    activeContributingGoals,
    emergencyFundGoals,
    savingsGoals,
    exceedsFreeIncome: totalMonthlyContributions > freeMonthlyIncome && freeMonthlyIncome > 0,
    goalIncomePercentage: Math.min(goalIncomePercentage, 100),
  };
}

/**
 * Calculate progress percentage for an emergency fund goal
 */
export function calculateEmergencyFundProgress(goal: Goal): number {
  if (goal.target_amount <= 0) return 0;
  return Math.min(100, (goal.current_amount / goal.target_amount) * 100);
}
