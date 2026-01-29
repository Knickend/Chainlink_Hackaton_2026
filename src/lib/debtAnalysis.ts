import { Debt } from './types';

export const HIGH_INTEREST_THRESHOLD = 0.07; // 7% APR

export interface DebtPriority {
  debt: Debt;
  isPriority: boolean;
  reason: string;
  monthlyInterest: number;
  potentialSavings: number;
  monthsSavedWithExtra: number;
}

export interface DebtAnalysis {
  priorityDebts: DebtPriority[];
  lowInterestDebts: DebtPriority[];
  hasPriorityDebt: boolean;
  totalPriorityDebt: number;
  suggestedDebtAllocation: number; // percentage of free income
  tips: string[];
}

export interface DebtAwareAllocation {
  category: string;
  percentage: number;
  amount: number;
  color: string;
  isPriority?: boolean;
}

/**
 * Analyze a single debt for priority status
 */
function analyzeDebt(debt: Debt, extraMonthlyPayment: number = 200): DebtPriority {
  const apr = debt.interest_rate / 100;
  const monthlyRate = apr / 12;
  const monthlyInterest = debt.principal_amount * monthlyRate;
  const currentPayment = debt.monthly_payment || 0;
  
  // Check if it's high priority
  const isPriority = apr > HIGH_INTEREST_THRESHOLD || debt.debt_type === 'credit_card';
  
  let reason = '';
  if (debt.debt_type === 'credit_card') {
    reason = 'Credit card debt - typically highest interest';
  } else if (apr > HIGH_INTEREST_THRESHOLD) {
    reason = `${(apr * 100).toFixed(1)}% APR exceeds typical market returns`;
  } else {
    reason = `${(apr * 100).toFixed(1)}% APR is below typical market returns`;
  }
  
  // Calculate potential savings from extra payments
  const { potentialSavings, monthsSaved } = calculateExtraPaymentSavings(
    debt.principal_amount,
    apr,
    currentPayment,
    extraMonthlyPayment
  );
  
  return {
    debt,
    isPriority,
    reason,
    monthlyInterest,
    potentialSavings,
    monthsSavedWithExtra: monthsSaved,
  };
}

/**
 * Calculate interest savings from making extra payments
 */
function calculateExtraPaymentSavings(
  principal: number,
  apr: number,
  currentPayment: number,
  extraPayment: number
): { potentialSavings: number; monthsSaved: number } {
  if (principal <= 0 || apr <= 0 || currentPayment <= 0) {
    return { potentialSavings: 0, monthsSaved: 0 };
  }
  
  const monthlyRate = apr / 12;
  const minPayment = principal * monthlyRate;
  
  // If current payment doesn't cover interest, can't calculate savings
  if (currentPayment <= minPayment) {
    return { potentialSavings: 0, monthsSaved: 0 };
  }
  
  // Calculate months to payoff with current payment
  const monthsWithCurrent = calculateMonthsToPayoff(principal, apr, currentPayment);
  
  // Calculate months to payoff with extra payment
  const monthsWithExtra = calculateMonthsToPayoff(principal, apr, currentPayment + extraPayment);
  
  // Calculate total interest with current payment
  const totalInterestCurrent = (monthsWithCurrent * currentPayment) - principal;
  
  // Calculate total interest with extra payment
  const totalInterestExtra = (monthsWithExtra * (currentPayment + extraPayment)) - principal;
  
  const potentialSavings = Math.max(0, totalInterestCurrent - totalInterestExtra);
  const monthsSaved = Math.max(0, monthsWithCurrent - monthsWithExtra);
  
  return { potentialSavings, monthsSaved };
}

/**
 * Calculate months to pay off debt
 */
function calculateMonthsToPayoff(principal: number, apr: number, monthlyPayment: number): number {
  const monthlyRate = apr / 12;
  
  if (monthlyPayment <= principal * monthlyRate) {
    return Infinity;
  }
  
  return Math.ceil(
    Math.log(monthlyPayment / (monthlyPayment - principal * monthlyRate)) / Math.log(1 + monthlyRate)
  );
}

/**
 * Analyze all debts and generate recommendations
 */
export function analyzeDebts(debts: Debt[], freeMonthlyIncome: number): DebtAnalysis {
  if (!debts || debts.length === 0) {
    return {
      priorityDebts: [],
      lowInterestDebts: [],
      hasPriorityDebt: false,
      totalPriorityDebt: 0,
      suggestedDebtAllocation: 0,
      tips: [],
    };
  }
  
  // Calculate extra payment based on free income
  const extraPayment = Math.min(freeMonthlyIncome * 0.2, 500); // 20% of free income, max $500
  
  const analyzedDebts = debts.map(debt => analyzeDebt(debt, extraPayment));
  
  const priorityDebts = analyzedDebts.filter(d => d.isPriority);
  const lowInterestDebts = analyzedDebts.filter(d => !d.isPriority);
  
  const totalPriorityDebt = priorityDebts.reduce((sum, d) => sum + d.debt.principal_amount, 0);
  const hasPriorityDebt = priorityDebts.length > 0;
  
  // Suggest allocation based on debt situation
  let suggestedDebtAllocation = 0;
  if (hasPriorityDebt) {
    // More aggressive allocation for high-interest debt
    if (priorityDebts.some(d => d.debt.debt_type === 'credit_card')) {
      suggestedDebtAllocation = 40; // 40% toward credit card debt
    } else {
      suggestedDebtAllocation = 30; // 30% toward other high-interest debt
    }
  }
  
  // Generate tips
  const tips = generateDebtTips(analyzedDebts, freeMonthlyIncome);
  
  return {
    priorityDebts,
    lowInterestDebts,
    hasPriorityDebt,
    totalPriorityDebt,
    suggestedDebtAllocation,
    tips,
  };
}

/**
 * Generate smart tips based on debt analysis
 */
function generateDebtTips(analyzedDebts: DebtPriority[], freeMonthlyIncome: number): string[] {
  const tips: string[] = [];
  
  const priorityDebts = analyzedDebts.filter(d => d.isPriority);
  const lowInterestDebts = analyzedDebts.filter(d => !d.isPriority);
  
  // Sort by APR descending
  const sortedPriority = [...priorityDebts].sort(
    (a, b) => b.debt.interest_rate - a.debt.interest_rate
  );
  
  // Check for credit card debt
  const creditCards = priorityDebts.filter(d => d.debt.debt_type === 'credit_card');
  if (creditCards.length > 0) {
    const cc = creditCards[0];
    tips.push(
      `Pay off ${cc.debt.name} first — ${cc.debt.interest_rate}% APR far exceeds typical investment returns (7-10%).`
    );
  }
  
  // Check for high APR non-credit-card debt
  const highAprLoans = sortedPriority.filter(d => d.debt.debt_type !== 'credit_card');
  if (highAprLoans.length > 0 && creditCards.length === 0) {
    const loan = highAprLoans[0];
    if (loan.potentialSavings > 0) {
      tips.push(
        `Extra payments toward ${loan.debt.name} could save $${Math.round(loan.potentialSavings).toLocaleString()} in interest.`
      );
    }
  }
  
  // Multiple high-interest debts
  if (sortedPriority.length > 1) {
    tips.push(
      `Focus on highest APR first (debt avalanche method) for maximum interest savings.`
    );
  }
  
  // Check for insufficient payments
  const insufficientPayments = analyzedDebts.filter(d => {
    const monthlyInterest = d.debt.principal_amount * (d.debt.interest_rate / 100 / 12);
    return (d.debt.monthly_payment || 0) <= monthlyInterest;
  });
  
  if (insufficientPayments.length > 0) {
    const debt = insufficientPayments[0];
    const monthlyInterest = debt.debt.principal_amount * (debt.debt.interest_rate / 100 / 12);
    const shortfall = Math.ceil(monthlyInterest - (debt.debt.monthly_payment || 0) + 1);
    tips.push(
      `⚠️ ${debt.debt.name} payment doesn't cover interest — increase by $${shortfall}/mo minimum.`
    );
  }
  
  // Only low-interest debt (good situation)
  if (priorityDebts.length === 0 && lowInterestDebts.length > 0) {
    const avgRate = lowInterestDebts.reduce((sum, d) => sum + d.debt.interest_rate, 0) / lowInterestDebts.length;
    tips.push(
      `Your ${avgRate.toFixed(1)}% average debt rate is below typical market returns — maintaining while investing makes sense.`
    );
  }
  
  // After debt-free tip
  if (priorityDebts.length > 0 && priorityDebts.some(d => d.monthsSavedWithExtra > 0)) {
    tips.push(
      `Once high-interest debt is cleared, reallocate those payments to accelerate wealth building.`
    );
  }
  
  return tips.slice(0, 3); // Max 3 tips
}

/**
 * Generate tips specifically for users with negative income
 */
export function generateNegativeIncomeTips(
  debts: Debt[],
  monthlyShortfall: number,
  formatValue: (value: number) => string
): string[] {
  const tips: string[] = [];

  // Primary tip: break-even requirement
  tips.push(
    `You need to free up at least ${formatValue(monthlyShortfall)}/month to break even.`
  );

  // Find highest interest debt for refinancing suggestion
  const sortedDebts = [...debts].sort((a, b) => b.interest_rate - a.interest_rate);
  const highestInterestDebt = sortedDebts[0];
  
  if (highestInterestDebt && highestInterestDebt.interest_rate > 10) {
    tips.push(
      `Consider refinancing ${highestInterestDebt.name} (${highestInterestDebt.interest_rate}% APR) for a lower rate.`
    );
  }

  // Check for debts where payment doesn't cover interest
  const underPayingDebts = debts.filter(d => {
    const monthlyInterest = d.principal_amount * (d.interest_rate / 100 / 12);
    return (d.monthly_payment || 0) < monthlyInterest;
  });

  if (underPayingDebts.length > 0) {
    tips.push(
      `Warning: ${underPayingDebts.length} debt(s) have payments below the accruing interest.`
    );
  }

  // Expense reduction suggestion
  tips.push(
    `Review discretionary spending to find potential savings.`
  );

  // Income supplementation if shortfall is significant
  if (monthlyShortfall > 500) {
    tips.push(
      `With a ${formatValue(monthlyShortfall)} gap, consider additional income sources.`
    );
  }

  return tips.slice(0, 4); // Max 4 tips for negative income
}

/**
 * Calculate debt-aware investment allocations
 */
export function calculateDebtAwareAllocations(
  freeMonthlyIncome: number,
  debtAnalysis: DebtAnalysis,
  investmentAllocations: { category: string; percentage: number; amount: number; color: string }[]
): DebtAwareAllocation[] {
  if (!debtAnalysis.hasPriorityDebt || freeMonthlyIncome <= 0) {
    return investmentAllocations;
  }
  
  const debtAllocationPercent = debtAnalysis.suggestedDebtAllocation;
  const investmentPercent = 100 - debtAllocationPercent;
  
  // Scale down investment allocations
  const scaledInvestments = investmentAllocations.map(alloc => ({
    ...alloc,
    percentage: Math.round(alloc.percentage * (investmentPercent / 100)),
    amount: Math.round(alloc.amount * (investmentPercent / 100)),
  }));
  
  // Add debt payoff allocation at the beginning
  const debtAllocation: DebtAwareAllocation = {
    category: 'Debt Payoff',
    percentage: debtAllocationPercent,
    amount: Math.round(freeMonthlyIncome * (debtAllocationPercent / 100)),
    color: 'hsl(var(--destructive))',
    isPriority: true,
  };
  
  return [debtAllocation, ...scaledInvestments];
}
