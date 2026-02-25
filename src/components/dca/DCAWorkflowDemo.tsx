import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Clock, Search, Filter, DollarSign, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { DCAStrategy } from '@/hooks/useDCAStrategies';

interface WorkflowStep {
  id: string;
  label: string;
  icon: React.ElementType;
  status: 'idle' | 'running' | 'success' | 'skipped' | 'error';
  log?: string;
}

const INITIAL_STEPS: WorkflowStep[] = [
  { id: 'cron', label: 'Cron Trigger', icon: Clock, status: 'idle' },
  { id: 'fetch', label: 'Fetch Strategies', icon: Search, status: 'idle' },
  { id: 'filter', label: 'Filter Due', icon: Filter, status: 'idle' },
  { id: 'price', label: 'Get Price', icon: DollarSign, status: 'idle' },
  { id: 'execute', label: 'Execute Trade', icon: Zap, status: 'idle' },
];

interface DCAWorkflowDemoProps {
  strategies: DCAStrategy[];
}

export function DCAWorkflowDemo({ strategies }: DCAWorkflowDemoProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const runSimulation = async () => {
    setIsRunning(true);
    setSummary(null);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'idle', log: undefined })));

    try {
      const { data, error } = await supabase.functions.invoke('simulate-dca-cre', {
        body: { strategies: strategies.filter(s => s.is_active) },
      });

      if (error) throw error;

      const logs: { step: string; status: string; message: string }[] = data?.logs || [];
      const summaryMsg = data?.summary || null;

      // Animate steps sequentially
      for (let i = 0; i < INITIAL_STEPS.length; i++) {
        const stepId = INITIAL_STEPS[i].id;
        const log = logs.find(l => l.step === stepId);
        
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'running' } : s));
        await new Promise(r => setTimeout(r, 500));

        const isSkipped = log?.message?.toLowerCase().includes('skip') || log?.status === 'skipped';
        const finalStatus = log ? (isSkipped ? 'skipped' : log.status === 'error' ? 'error' : 'success') : 'skipped';
        
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: finalStatus as WorkflowStep['status'], log: log?.message } : s));
      }

      setSummary(summaryMsg);
    } catch (err) {
      console.error('Simulation error:', err);
      setSummary('Simulation failed. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">CRE Workflow Simulator</CardTitle>
          <Button size="sm" variant="outline" onClick={runSimulation} disabled={isRunning || strategies.filter(s => s.is_active).length === 0}>
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {isRunning ? 'Running...' : 'Simulate'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const bgClass = step.status === 'success' ? 'bg-success/20 border-success/50 text-success' :
              step.status === 'skipped' ? 'bg-warning/20 border-warning/50 text-warning' :
              step.status === 'error' ? 'bg-destructive/20 border-destructive/50 text-destructive' :
              step.status === 'running' ? 'bg-primary/20 border-primary/50 text-primary animate-pulse' :
              'bg-muted border-border text-muted-foreground';

            return (
              <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
                <div className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${bgClass} min-w-[80px]`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{step.label}</span>
                  {step.log && <span className="text-[10px] opacity-75 text-center max-w-[100px] truncate" title={step.log}>{step.log}</span>}
                </div>
                {i < steps.length - 1 && <span className="text-muted-foreground">→</span>}
              </div>
            );
          })}
        </div>
        {summary && (
          <p className="mt-3 text-sm text-muted-foreground border-t border-border/50 pt-3">{summary}</p>
        )}
      </CardContent>
    </Card>
  );
}
