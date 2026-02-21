import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Play, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import chainlinkLogo from '@/assets/chainlink-logo.png';

interface StepLog {
  step: string;
  message: string;
  timestamp: string;
}

interface SimulationResponse {
  steps: StepLog[];
  results: Array<{ strategy_id: string; success: boolean; error?: string; tx_hash?: string }>;
  summary: { total: number; succeeded: number; failed: number; skipped: number };
  error?: string;
}

const PIPELINE_STEPS = [
  { key: 'cron_trigger', label: 'Cron Trigger' },
  { key: 'fetch_strategies', label: 'Fetch Strategies' },
  { key: 'filter_due', label: 'Filter Due' },
  { key: 'price_check', label: 'Price Check' },
  { key: 'execute_order', label: 'Execute Order' },
];

interface Props {
  refetch: () => void;
}

export function DCAWorkflowDemo({ refetch }: Props) {
  const [force, setForce] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<StepLog[]>([]);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [summary, setSummary] = useState<SimulationResponse['summary'] | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const runSimulation = async () => {
    setIsRunning(true);
    setLogs([]);
    setSummary(null);
    setActiveStep('cron_trigger');

    try {
      const { data, error } = await supabase.functions.invoke('simulate-dca-cre', {
        body: { force },
      });

      if (error) throw error;

      const response = data as SimulationResponse;

      // Animate steps appearing
      for (let i = 0; i < response.steps.length; i++) {
        const step = response.steps[i];
        setActiveStep(step.step);
        setLogs(prev => [...prev, step]);
        await new Promise(r => setTimeout(r, 300));
      }

      setSummary(response.summary);
      refetch();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Simulation failed';
      setLogs(prev => [...prev, { step: 'error', message: `❌ ${errMsg}`, timestamp: new Date().toISOString() }]);
    } finally {
      setIsRunning(false);
      setActiveStep(null);
    }
  };

  return (
    <Card className="border-blue-500/30 bg-card overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-3">
          <img src={chainlinkLogo} alt="Chainlink" className="h-6 w-6" />
          <CardTitle className="text-lg">CRE Workflow Simulator</CardTitle>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">Hackathon Demo</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Trigger the Chainlink CRE DCA pipeline live. In production, this runs across multiple nodes with consensus.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Flow Diagram */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center">
              <div
                className={`
                  rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap transition-all duration-300
                  ${activeStep === step.key
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)] scale-105'
                    : logs.some(l => l.step === step.key)
                      ? 'border-green-500/50 bg-green-500/10 text-green-400'
                      : 'border-border text-muted-foreground'
                  }
                `}
              >
                {step.label}
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={`mx-1 h-px w-4 ${logs.some(l => l.step === PIPELINE_STEPS[i + 1].key) ? 'bg-green-500/50' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={force} onCheckedChange={setForce} disabled={isRunning} />
            <span className="text-sm text-muted-foreground">Force execute all</span>
          </div>
          <Button onClick={runSimulation} disabled={isRunning} className="gap-2">
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {isRunning ? 'Simulating…' : 'Simulate CRE Trigger'}
          </Button>
        </div>

        {/* Log Panel */}
        {logs.length > 0 && (
          <div
            ref={logRef}
            className="max-h-64 overflow-y-auto rounded-lg bg-black/80 p-3 font-mono text-xs leading-relaxed"
          >
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0 text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-green-400">{log.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Results Summary */}
        {summary && (
          <div className="flex items-center gap-2 pt-1">
            {summary.succeeded > 0 && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                {summary.succeeded} succeeded
              </Badge>
            )}
            {summary.failed > 0 && (
              <Badge variant="destructive">
                {summary.failed} failed
              </Badge>
            )}
            {summary.skipped > 0 && (
              <Badge variant="secondary">
                {summary.skipped} skipped
              </Badge>
            )}
            {summary.total === 0 && (
              <span className="text-sm text-muted-foreground">No active strategies found</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
