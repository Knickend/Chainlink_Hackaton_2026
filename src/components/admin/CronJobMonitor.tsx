import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { Clock, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Calendar, Activity, Play, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCronJobLogs, CronJobLog } from '@/hooks/useCronJobLogs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const statusConfig = {
  success: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success/10',
    badge: 'bg-success/20 text-success border-success/30',
  },
  partial: {
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    badge: 'bg-warning/20 text-warning border-warning/30',
  },
  failed: {
    icon: XCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    badge: 'bg-destructive/20 text-destructive border-destructive/30',
  },
};

function StatusBadge({ status }: { status: CronJobLog['status'] }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={config.badge}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CronJobMonitor() {
  const { data: logs, isLoading, refetch, isRefetching } = useCronJobLogs();
  const [isTriggering, setIsTriggering] = useState(false);

  // Manual trigger function
  const handleManualTrigger = async () => {
    setIsTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-bulk-snapshots');
      
      if (error) {
        console.error('Failed to trigger bulk snapshots:', error);
        toast.error('Failed to trigger bulk snapshots', {
          description: error.message,
        });
        return;
      }

      toast.success('Bulk snapshots created', {
        description: `Processed ${data.processed} users: ${data.succeeded} succeeded, ${data.failed} failed`,
      });
      
      // Refresh the logs
      await refetch();
    } catch (err) {
      console.error('Error triggering bulk snapshots:', err);
      toast.error('Error triggering bulk snapshots');
    } finally {
      setIsTriggering(false);
    }
  };

  // Calculate stats
  const totalRuns = logs?.length || 0;
  const successfulRuns = logs?.filter(l => l.status === 'success').length || 0;
  const failedRuns = logs?.filter(l => l.status === 'failed').length || 0;
  const lastRun = logs?.[0];
  const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;

  // Get next scheduled run (1st of next month at 00:05)
  const getNextScheduledRun = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 5, 0);
    return nextMonth;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Runs"
          value={totalRuns}
          icon={Activity}
          description="All time executions"
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={CheckCircle2}
          description={`${successfulRuns} successful`}
        />
        <StatCard
          title="Failed Runs"
          value={failedRuns}
          icon={XCircle}
          description="Needs attention"
        />
        <StatCard
          title="Next Run"
          value={format(getNextScheduledRun(), 'MMM d')}
          icon={Calendar}
          description={formatDistanceToNow(getNextScheduledRun(), { addSuffix: true })}
        />
      </div>

      {/* Execution History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Execution History
            </CardTitle>
            <CardDescription>
              Recent cron job executions and their results
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleManualTrigger}
              disabled={isTriggering}
            >
              {isTriggering ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Run Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Success/Failed</TableHead>
                    <TableHead>Execution Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.job_name}
                        </code>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} />
                      </TableCell>
                      <TableCell>{log.processed_count}</TableCell>
                      <TableCell>
                        <span className="text-success">{log.succeeded_count}</span>
                        {' / '}
                        <span className="text-destructive">{log.failed_count}</span>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="text-muted-foreground text-sm">
                              {formatDistanceToNow(new Date(log.execution_time), { addSuffix: true })}
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(log.execution_time), 'PPpp')}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">No executions yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                The cron job runs on the 1st of each month at 00:05 UTC
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Run Details */}
      {lastRun && (
        <Card>
          <CardHeader>
            <CardTitle>Last Execution Details</CardTitle>
            <CardDescription>
              {format(new Date(lastRun.execution_time), 'PPpp')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <StatusBadge status={lastRun.status} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Users Processed</p>
                <p className="text-lg font-semibold">{lastRun.processed_count}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-lg font-semibold text-success">{lastRun.succeeded_count}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-lg font-semibold text-destructive">{lastRun.failed_count}</p>
              </div>
            </div>
            {lastRun.error_message && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm font-medium text-destructive">Error:</p>
                <p className="text-sm text-destructive/80">{lastRun.error_message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
