import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Loader2, Bot, Clock, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useFeedback } from '@/hooks/useFeedback';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { FeedbackTable } from '@/components/admin/FeedbackTable';
import { FeedbackFilters } from '@/components/admin/FeedbackFilters';
import { FeedbackDetailDialog } from '@/components/admin/FeedbackDetailDialog';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminUserStats } from '@/components/admin/AdminUserStats';
import { AnalyticsFilters } from '@/components/admin/AnalyticsFilters';
import { SalesBotAnalytics } from '@/components/admin/SalesBotAnalytics';
import { CronJobMonitor } from '@/components/admin/CronJobMonitor';
import { CancellationFeedback } from '@/components/admin/CancellationFeedback';
import { Feedback, FeedbackType, FeedbackStatus } from '@/lib/feedback.types';

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('overview');
  
  // Date range for analytics
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // Filters for feedback tab
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  
  // Selected feedback for detail view
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Build filter object
  const filters = {
    type: typeFilter !== 'all' ? typeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { feedback, isLoading: feedbackLoading, updateFeedback, isUpdating } = useFeedback(filters, true);
  const analytics = useAdminAnalytics({ dateRange });

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!roleLoading && user && !isAdmin) {
      navigate('/app');
    }
  }, [roleLoading, user, isAdmin, navigate]);

  // Loading state
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Not admin - show access denied (will redirect)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-12 h-12 text-destructive" />
          <p className="text-muted-foreground">Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  const handleSelectFeedback = (item: Feedback) => {
    setSelectedFeedback(item);
    setDetailOpen(true);
  };

  const handleClearFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
  };

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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Analytics, feedback management, and user insights
              </p>
            </div>
          </div>
          <ThemeToggle />
        </motion.header>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales-bot" className="gap-1.5">
              <Bot className="h-3.5 w-3.5" />
              Sales Bot
            </TabsTrigger>
            <TabsTrigger value="cron-jobs" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Cron Jobs
            </TabsTrigger>
            <TabsTrigger value="churn" className="gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              Churn
            </TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Analytics Overview</h2>
              <AnalyticsFilters
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
            <AdminOverview analytics={analytics} />
          </TabsContent>

          {/* Sales Bot Tab */}
          <TabsContent value="sales-bot" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Sales Bot Analytics</h2>
              <AnalyticsFilters
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
            <SalesBotAnalytics dateRange={dateRange} />
          </TabsContent>

          {/* Cron Jobs Tab */}
          <TabsContent value="cron-jobs" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Cron Job Monitor</h2>
            </div>
            <CronJobMonitor />
          </TabsContent>

          {/* Churn Tab */}
          <TabsContent value="churn" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Subscription Cancellations</h2>
            </div>
            <CancellationFeedback />
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-semibold">All Feedback</h2>
                <FeedbackFilters
                  type={typeFilter}
                  status={statusFilter}
                  onTypeChange={setTypeFilter}
                  onStatusChange={setStatusFilter}
                  onClear={handleClearFilters}
                />
              </div>

              <FeedbackTable
                feedback={feedback}
                onSelect={handleSelectFeedback}
                isLoading={feedbackLoading}
              />
            </motion.section>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <AdminUserStats analytics={analytics} />
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <FeedbackDetailDialog
          feedback={selectedFeedback}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onUpdate={async (id, updates) => {
            await updateFeedback({ id, updates });
          }}
          isUpdating={isUpdating}
        />
      </div>
    </div>
  );
};

export default Admin;
