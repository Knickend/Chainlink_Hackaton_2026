import { Goal } from '@/lib/types';

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
