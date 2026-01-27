import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, PiggyBank, Coins, LogOut, Loader2, LogIn } from 'lucide-react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useAuth } from '@/contexts/AuthContext';
import { UnitSelector } from '@/components/UnitSelector';
import { StatCard } from '@/components/StatCard';
import { AssetCategoryCard } from '@/components/AssetCategoryCard';
import { IncomeExpenseCard } from '@/components/IncomeExpenseCard';
import { NetWorthChart } from '@/components/NetWorthChart';
import { AllocationChart } from '@/components/AllocationChart';
import { AddAssetDialog } from '@/components/AddAssetDialog';
import { AddIncomeDialog } from '@/components/AddIncomeDialog';
import { AddExpenseDialog } from '@/components/AddExpenseDialog';
import { PriceIndicator } from '@/components/PriceIndicator';
import { DemoBanner } from '@/components/DemoBanner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { SubscriptionDialog } from '@/components/SubscriptionDialog';
import { ProBadge } from '@/components/ProBadge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AssetCategory } from '@/lib/types';

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { prices, isLoading: pricesLoading, lastUpdated, error: pricesError, refetch: refetchPrices } = useLivePrices();
  
  // Subscription state (mockup)
  const [isPro, setIsPro] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  
  // Demo mode when user is not logged in
  const isDemo = !user;
  
  const {
    income,
    expenses,
    metrics,
    displayUnit,
    setDisplayUnit,
    assetsByCategory,
    categoryTotals,
    formatValue,
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

  if (authLoading || (!isDemo && dataLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient glow effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-glow-pulse" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Banner */}
        {isDemo && <DemoBanner />}
        
        {/* Subscription Banner (show for logged-in non-pro users) */}
        {!isDemo && !isPro && (
          <SubscriptionBanner onUpgrade={() => setShowSubscriptionDialog(true)} />
        )}
        
        {/* Subscription Dialog */}
        <SubscriptionDialog
          open={showSubscriptionDialog}
          onOpenChange={setShowSubscriptionDialog}
          onSubscribe={() => setIsPro(true)}
        />

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="gradient-text">Wealth</span>
              <span className="text-foreground">Manager</span>
            </h1>
            {isPro && <ProBadge />}
          </div>
          <p className="text-muted-foreground mt-1">
            Track your assets across all markets
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <PriceIndicator
              isLoading={pricesLoading}
              lastUpdated={lastUpdated}
              error={pricesError}
              onRefresh={refetchPrices}
            />
            <UnitSelector value={displayUnit} onChange={setDisplayUnit} />
            <ThemeToggle />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Net Worth"
            value={formatValue(metrics.totalNetWorth, false)}
            icon={Wallet}
            trend={{ value: 14.5, isPositive: true }}
            variant="primary"
            delay={0}
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
            value={formatValue(metrics.monthlyNetIncome)}
            subtitle="After expenses"
            icon={PiggyBank}
            trend={{ value: 8.2, isPositive: true }}
            delay={0.2}
          />
          <StatCard
            title="Annual Yield"
            value={formatValue(metrics.yearlyYield)}
            subtitle="From investments"
            icon={Coins}
            variant="warning"
            delay={0.3}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <NetWorthChart formatValue={formatValue} />
          <AllocationChart data={categoryTotals} formatValue={formatValue} />
        </div>

        {/* Asset Categories */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Assets by Category</h2>
            {!isDemo && <AddAssetDialog onAdd={addAsset} livePrices={prices} />}
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

        {/* Income & Expenses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <IncomeExpenseCard
            type="income"
            items={income}
            total={formatValue(metrics.totalIncome)}
            formatValue={formatValue}
            actionButton={isDemo ? undefined : <AddIncomeDialog onAdd={addIncome} />}
            onUpdateIncome={isDemo ? undefined : updateIncome}
            onDeleteIncome={isDemo ? undefined : deleteIncome}
          />
          <IncomeExpenseCard
            type="expense"
            items={expenses}
            total={formatValue(metrics.totalExpenses)}
            formatValue={formatValue}
            actionButton={isDemo ? undefined : <AddExpenseDialog onAdd={addExpense} />}
            onUpdateExpense={isDemo ? undefined : updateExpense}
            onDeleteExpense={isDemo ? undefined : deleteExpense}
          />
        </div>

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
    </div>
  );
};

export default Index;
