import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, PiggyBank, LogOut, Loader2, LogIn, CreditCard, HelpCircle, Settings } from 'lucide-react';
import { FinancialAdvisorChat } from '@/components/FinancialAdvisorChat';
import { FeedbackButton } from '@/components/FeedbackButton';
import { usePortfolio } from '@/hooks/usePortfolio';
import { mockDebts } from '@/lib/mockData';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useDebts } from '@/hooks/useDebts';
import { useAuth } from '@/contexts/AuthContext';
import { UnitSelector } from '@/components/UnitSelector';
import { StatCard } from '@/components/StatCard';
import { YieldBreakdownCard } from '@/components/YieldBreakdownCard';
import { AssetCategoryCard } from '@/components/AssetCategoryCard';
import { IncomeExpenseCard } from '@/components/IncomeExpenseCard';
import { DebtOverviewCard } from '@/components/DebtOverviewCard';
import { DebtPayoffCalculator } from '@/components/DebtPayoffCalculator';
import { DebtPayoffTeaser } from '@/components/DebtPayoffTeaser';
import { InvestmentStrategyTeaser } from '@/components/InvestmentStrategyTeaser';
import { PortfolioHistoryTeaser } from '@/components/PortfolioHistoryTeaser';
import { NetWorthChart } from '@/components/NetWorthChart';
import { AllocationChart } from '@/components/AllocationChart';
import { AddAssetDialog } from '@/components/AddAssetDialog';
import { ViewAllAssetsDialog } from '@/components/ViewAllAssetsDialog';
import { AddIncomeDialog } from '@/components/AddIncomeDialog';
import { AddExpenseDropdown } from '@/components/AddExpenseDropdown';
import { AddDebtDialog } from '@/components/AddDebtDialog';
import { PriceIndicator } from '@/components/PriceIndicator';
import { DemoBanner } from '@/components/DemoBanner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { SubscriptionDialog } from '@/components/SubscriptionDialog';
import { ProBadge } from '@/components/ProBadge';
import { PerformanceCard } from '@/components/PerformanceCard';
import { PortfolioHistoryCard } from '@/components/PortfolioHistoryCard';
import { InvestmentStrategyCard } from '@/components/InvestmentStrategyCard';

import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AssetCategory, DebtType } from '@/lib/types';
import { SubscriptionTier } from '@/lib/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { TutorialProvider, TutorialOverlay, WelcomeModal, CompletionModal, useTutorialContext } from '@/components/Tutorial';

// Inner component that has access to tutorial context
const IndexContent = () => {
  const { startTutorial, hasCompletedTutorial, isActive: isTutorialActive } = useTutorialContext();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { debts, totalDebt, monthlyPayments, monthlyInterest, addDebt, updateDebt, deleteDebt, loading: debtsLoading } = useDebts();
  
  // Demo mode when user is not logged in
  const isDemo = !user;
  
  // Subscription state from database
  const { tier: subscriptionTier, isPro: subscriptionIsPro, isSubscribed: subscriptionIsSubscribed, upgradeTo } = useSubscription();
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  
  // Show Pro during tutorial OR in demo mode so users see all features
  const effectiveSubscriptionTier = (isDemo || isTutorialActive) ? 'pro' : subscriptionTier;
  const isPro = (isDemo || isTutorialActive) ? true : subscriptionIsPro;
  const isSubscribed = (isDemo || isTutorialActive) ? true : subscriptionIsSubscribed;
  
  // First call to usePortfolio with undefined prices to get assets for symbol extraction
  const portfolioInitial = usePortfolio(undefined, isDemo);
  
  // Extract unique crypto symbols from user's assets (excluding hardcoded BTC, ETH, LINK)
  const additionalCryptoSymbols = useMemo(() => {
    return portfolioInitial.assets
      .filter(a => a.category === 'crypto' && a.symbol)
      .map(a => a.symbol!.toUpperCase())
      .filter(s => !['BTC', 'ETH', 'LINK'].includes(s))
      .filter((s, i, arr) => arr.indexOf(s) === i); // unique
  }, [portfolioInitial.assets]);
  
  const { prices, isLoading: pricesLoading, lastUpdated, error: pricesError, isCached, refetch: refetchPrices, addStockPrice } = useLivePrices(15 * 60 * 1000, additionalCryptoSymbols);
  
  // Use portfolio with live prices for accurate values
  const {
    assets,
    income,
    expenses,
    metrics,
    displayUnit,
    setDisplayUnit,
    assetsByCategory,
    categoryTotals,
    formatValue,
    convertFromCurrency,
    formatCurrencyValue,
    loading: dataLoading,
    addAsset,
    updateAsset,
    deleteAsset,
    addIncome,
    updateIncome,
    deleteIncome,
    addExpense,
    updateExpense,
    deleteExpense,
  } = usePortfolio(prices, isDemo);

  if (authLoading || (!isDemo && (dataLoading || debtsLoading))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  // Use mock debts for demo mode
  const demoDebts = isDemo ? mockDebts : debts;
  const demoTotalDebt = isDemo ? mockDebts.reduce((sum, d) => sum + d.principal_amount, 0) : totalDebt;
  const demoMonthlyPayments = isDemo ? mockDebts.reduce((sum, d) => sum + (d.monthly_payment || 0), 0) : monthlyPayments;
  const demoMonthlyInterest = isDemo ? mockDebts.reduce((sum, d) => sum + (d.principal_amount * d.interest_rate / 100 / 12), 0) : monthlyInterest;

  // Calculate adjusted net worth (assets - debt)
  const adjustedNetWorth = metrics.totalNetWorth - demoTotalDebt;
  // Adjusted monthly net (income - expenses - debt payments)
  const adjustedMonthlyNet = metrics.totalIncome - metrics.totalExpenses - demoMonthlyPayments;

  return (
    <>
      {/* Tutorial Components */}
      <WelcomeModal />
      <CompletionModal />
      <TutorialOverlay />
      
      <div className="min-h-screen bg-background">
        {/* Ambient glow effect */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-glow-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-glow-pulse" />
        </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Banner */}
        {isDemo && <DemoBanner />}
        
        {/* Subscription Banner (show for logged-in non-subscribed users) */}
        {!isDemo && !isSubscribed && (
          <SubscriptionBanner onUpgrade={() => setShowSubscriptionDialog(true)} />
        )}
        
        {/* Subscription Dialog */}
        <SubscriptionDialog
          open={showSubscriptionDialog}
          onOpenChange={setShowSubscriptionDialog}
          onSubscribe={(tier, billingPeriod) => upgradeTo(tier, billingPeriod || 'monthly')}
        />

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8"
        >
          {/* Left section: Logo + Description */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
            <div className="flex items-center gap-2 flex-shrink-0">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                <span className="gradient-text">In</span>
                <span className="text-foreground">Control</span>
              </h1>
              {isPro && <ProBadge />}
            </div>
    <p className="text-muted-foreground whitespace-nowrap hidden xl:block">
      Track your assets across all markets
    </p>
          </div>
          
          {/* Right section: Controls - all aligned in a row */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <PriceIndicator
              isLoading={pricesLoading}
              lastUpdated={lastUpdated}
              error={pricesError}
              isCached={isCached}
              onRefresh={refetchPrices}
            />
            <UnitSelector value={displayUnit} onChange={setDisplayUnit} />
            <ThemeToggle />
            {hasCompletedTutorial && (
              <Button
                variant="ghost"
                size="sm"
                onClick={startTutorial}
                className="gap-2"
                title="Restart tutorial"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Tour</span>
              </Button>
            )}
            {!isDemo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/settings')}
                className="rounded-full"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </Button>
            )}
            {isDemo ? (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => navigate('/auth')}
                className="gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            )}
          </div>
        </motion.header>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8" data-tutorial="key-metrics">
          <div data-tutorial="net-worth-card">
            <StatCard
              title="Net Worth"
              value={formatValue(adjustedNetWorth, false)}
              subtitle={totalDebt > 0 ? `Assets: ${formatValue(metrics.totalNetWorth, false)}` : undefined}
              icon={Wallet}
              trend={{ value: 14.5, isPositive: true }}
              variant="primary"
              delay={0}
            />
          </div>
          <StatCard
            title="Total Debt"
            value={formatValue(demoTotalDebt, false)}
            subtitle={demoMonthlyPayments > 0 ? `${formatValue(demoMonthlyPayments)}/mo` : undefined}
            icon={CreditCard}
            variant="danger"
            delay={0.05}
          />
          <StatCard
            title="Monthly Income"
            value={formatValue(metrics.totalIncome)}
            subtitle="From all sources"
            icon={TrendingUp}
            variant="success"
            delay={0.1}
          />
          <StatCard
            title="Monthly Net"
            value={formatValue(adjustedMonthlyNet)}
            subtitle="After all expenses"
            icon={PiggyBank}
            trend={{ value: 8.2, isPositive: adjustedMonthlyNet >= 0 }}
            delay={0.2}
          />
          <YieldBreakdownCard
            totalYield={metrics.yearlyYield}
            assets={assets}
            formatValue={formatValue}
            delay={0.3}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Main charts - wrapped for tutorial spotlight */}
          <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4" data-tutorial="charts-section">
            <NetWorthChart formatValue={formatValue} displayUnit={displayUnit} />
            <AllocationChart data={categoryTotals} formatValue={formatValue} />
          </div>
          {/* Third column - Pro features, excluded from tutorial */}
          {isPro && !isDemo && (
            <div data-tutorial="portfolio-history-card">
              <PortfolioHistoryCard 
                currentNetWorth={adjustedNetWorth} 
                formatValue={formatValue} 
                delay={0.2}
              />
            </div>
          )}
          {isPro && isDemo && (
            <div data-tutorial="portfolio-history-card">
              <PerformanceCard 
                currentNetWorth={metrics.totalNetWorth} 
                formatValue={formatValue} 
                delay={0.2}
              />
            </div>
          )}
          {!isPro && !isDemo && (
            <PortfolioHistoryTeaser 
              onUpgrade={() => setShowSubscriptionDialog(true)}
              delay={0.2}
            />
          )}
        </div>

        {/* Investment Strategy - Show for logged-in users, or in demo with Pro */}
        {(!isDemo || isPro) && (
          <div className="mb-8" data-tutorial="investment-strategy-card">
            {isPro ? (
              <InvestmentStrategyCard
                freeMonthlyIncome={adjustedMonthlyNet}
                formatValue={formatValue}
                debts={demoDebts}
                monthlyPayments={demoMonthlyPayments}
                delay={0.3}
              />
            ) : (
              <InvestmentStrategyTeaser
                freeMonthlyIncome={adjustedMonthlyNet}
                formatValue={formatValue}
                onUpgrade={() => setShowSubscriptionDialog(true)}
                delay={0.3}
              />
            )}
          </div>
        )}

        {/* Asset Categories */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4" data-tutorial="assets-section">
            <h2 className="text-xl font-semibold">Assets by Category</h2>
            <div className="flex items-center gap-2">
              <ViewAllAssetsDialog
                assets={Object.values(assetsByCategory).flat()}
                formatValue={formatValue}
                onUpdateAsset={isDemo ? undefined : updateAsset}
                onDeleteAsset={isDemo ? undefined : deleteAsset}
                livePrices={prices}
              />
              {isDemo ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/auth')}
                  className="gap-2"
                  data-tutorial="add-asset-button"
                >
                  <PiggyBank className="w-4 h-4" />
                  Add Asset
                </Button>
              ) : (
                <div data-tutorial="add-asset-button">
                  <AddAssetDialog onAdd={addAsset} livePrices={prices} onStockPriceUpdate={addStockPrice} onCryptoPriceUpdate={addStockPrice} />
                </div>
              )}
            </div>
          </div>
          {categoryTotals.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <p className="text-muted-foreground">No assets yet. Add your first asset to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryTotals.map((cat, index) => (
                <AssetCategoryCard
                  key={cat.category}
                  category={cat.category as AssetCategory}
                  assets={assetsByCategory[cat.category] || []}
                  total={formatValue(cat.total)}
                  percentage={(cat.total / metrics.totalNetWorth) * 100}
                  formatValue={formatValue}
                  onUpdateAsset={isDemo ? undefined : updateAsset}
                  onDeleteAsset={isDemo ? undefined : deleteAsset}
                  livePrices={prices}
                  delay={index * 0.1}
                />
              ))}
            </div>
          )}
        </div>

        {/* Income, Expenses & Debt */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div data-tutorial="income-card">
            <IncomeExpenseCard
              type="income"
              items={income}
              total={formatValue(metrics.totalIncome)}
              formatValue={formatValue}
              actionButton={isDemo ? undefined : <AddIncomeDialog onAdd={(data: { source: string; amount: number; type: 'work' | 'passive' | 'investment' }) => addIncome({ ...data, currency: displayUnit === 'BTC' || displayUnit === 'GOLD' ? 'USD' : displayUnit })} displayUnit={displayUnit} />}
              displayUnit={displayUnit}
              onUpdateIncome={isDemo ? undefined : updateIncome}
              onDeleteIncome={isDemo ? undefined : deleteIncome}
            />
          </div>
          <div data-tutorial="expense-card">
            <IncomeExpenseCard
              type="expense"
              items={expenses}
              total={formatValue(metrics.totalExpenses)}
              formatValue={formatValue}
              actionButton={isDemo ? undefined : (
                <AddExpenseDropdown
                  onAddRecurring={(data) => addExpense({ ...data, is_recurring: true, currency: displayUnit === 'BTC' || displayUnit === 'GOLD' ? 'USD' : displayUnit })}
                  onAddOneTime={(data) => addExpense({ ...data, currency: displayUnit === 'BTC' || displayUnit === 'GOLD' ? 'USD' : displayUnit })}
                  displayUnit={displayUnit}
                  isPro={isPro}
                  onUpgrade={() => setShowSubscriptionDialog(true)}
                />
              )}
              onUpdateExpense={isDemo ? undefined : updateExpense}
              onDeleteExpense={isDemo ? undefined : deleteExpense}
              displayUnit={displayUnit}
            />
          </div>
          <div data-tutorial="debt-card">
            <DebtOverviewCard
              debts={demoDebts}
              totalDebt={demoTotalDebt}
              monthlyPayments={demoMonthlyPayments}
              monthlyInterest={demoMonthlyInterest}
              formatValue={formatValue}
              onUpdateDebt={isDemo ? undefined : updateDebt}
              onDeleteDebt={isDemo ? undefined : deleteDebt}
              actionButton={isDemo ? undefined : <AddDebtDialog onAdd={(data: { name: string; debt_type: DebtType; principal_amount: number; interest_rate: number; monthly_payment?: number }) => addDebt({ ...data, currency: displayUnit === 'BTC' || displayUnit === 'GOLD' ? 'USD' : displayUnit })} displayUnit={displayUnit} />}
              delay={0.2}
              displayUnit={displayUnit}
            />
          </div>
        </div>

        {/* Debt Payoff Calculator - Pro Only, show in demo mode too */}
        {demoDebts.length > 0 && (
          <div className="mt-8" data-tutorial="debt-payoff-calculator">
            {isPro ? (
              <DebtPayoffCalculator
                debts={demoDebts}
                displayUnit={displayUnit}
                convertFromCurrency={convertFromCurrency}
                formatCurrencyValue={formatCurrencyValue}
                delay={0.3}
              />
            ) : (
              <DebtPayoffTeaser
                debtCount={demoDebts.length}
                onUpgrade={() => setShowSubscriptionDialog(true)}
                delay={0.3}
              />
            )}
          </div>
        )}

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center text-sm text-muted-foreground"
        >
          <p>Prices updated in real-time • Your data is securely stored</p>
        </motion.footer>
      </div>

        {/* AI Financial Advisor Chat */}
        <FinancialAdvisorChat />
        
        {/* Feedback Button */}
        <FeedbackButton />
      </div>
    </>
  );
};

const Index = () => {
  return (
    <TutorialProvider>
      <IndexContent />
    </TutorialProvider>
  );
};

export default Index;
