import { motion } from 'framer-motion';
import { Wallet, TrendingUp, PiggyBank, Coins } from 'lucide-react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useLivePrices } from '@/hooks/useLivePrices';
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
import { AssetCategory } from '@/lib/types';

const Index = () => {
  const { prices, isLoading: pricesLoading, lastUpdated, error: pricesError, refetch: refetchPrices } = useLivePrices();
  
  const {
    income,
    expenses,
    metrics,
    displayUnit,
    setDisplayUnit,
    assetsByCategory,
    categoryTotals,
    formatValue,
    addAsset,
    updateAsset,
    deleteAsset,
    addIncome,
    updateIncome,
    deleteIncome,
    addExpense,
    updateExpense,
    deleteExpense,
  } = usePortfolio(prices);

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient glow effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-glow-pulse" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="gradient-text">Wealth</span>
              <span className="text-foreground">Manager</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your assets across all markets
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <PriceIndicator
              isLoading={pricesLoading}
              lastUpdated={lastUpdated}
              error={pricesError}
              onRefresh={refetchPrices}
            />
            <AddAssetDialog onAdd={addAsset} />
            <UnitSelector value={displayUnit} onChange={setDisplayUnit} />
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
          <h2 className="text-xl font-semibold mb-4">Assets by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryTotals.map((cat, index) => (
              <AssetCategoryCard
                key={cat.category}
                category={cat.category as AssetCategory}
                assets={assetsByCategory[cat.category] || []}
                total={formatValue(cat.total)}
                percentage={(cat.total / metrics.totalNetWorth) * 100}
                formatValue={formatValue}
                onUpdateAsset={updateAsset}
                onDeleteAsset={deleteAsset}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>

        {/* Income & Expenses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <IncomeExpenseCard
            type="income"
            items={income}
            total={formatValue(metrics.totalIncome)}
            formatValue={formatValue}
            actionButton={<AddIncomeDialog onAdd={addIncome} />}
            onUpdateIncome={updateIncome}
            onDeleteIncome={deleteIncome}
          />
          <IncomeExpenseCard
            type="expense"
            items={expenses}
            total={formatValue(metrics.totalExpenses)}
            formatValue={formatValue}
            actionButton={<AddExpenseDialog onAdd={addExpense} />}
            onUpdateExpense={updateExpense}
            onDeleteExpense={deleteExpense}
          />
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center text-sm text-muted-foreground"
        >
          <p>Prices updated in real-time • Data is for demonstration purposes</p>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;
