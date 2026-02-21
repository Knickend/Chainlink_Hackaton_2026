import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useDCAStrategies, type CreateStrategyInput, type DCAStrategy } from '@/hooks/useDCAStrategies';
import { useAgentWallet } from '@/hooks/useAgentWallet';
import { DCAStrategyForm } from '@/components/DCAStrategyForm';
import { DCAProgressCard } from '@/components/DCAProgressCard';
import { DCAExecutionHistory } from '@/components/DCAExecutionHistory';
import { EditDCAStrategyDialog } from '@/components/EditDCAStrategyDialog';
import { CREArchitectureCard } from '@/components/CREArchitectureCard';
import { DCAWorkflowDemo } from '@/components/DCAWorkflowDemo';

export default function DCA() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { strategies, executions, isLoading, createStrategy, updateStrategy, toggleStrategy, deleteStrategy, refetch } = useDCAStrategies();
  const { status: walletStatus } = useAgentWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<DCAStrategy | null>(null);

  const walletBalance = walletStatus.balance ?? 0;
  const totalActiveCommitment = strategies
    .filter(s => s.is_active)
    .reduce((sum, s) => sum + s.amount_per_execution, 0);
  const shortfall = totalActiveCommitment - walletBalance;

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleCreate = async (input: CreateStrategyInput) => {
    setIsSubmitting(true);
    try {
      await createStrategy(input);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Dollar Cost Averaging</h1>
            <p className="text-sm text-muted-foreground">Automate recurring crypto purchases from USDC</p>
          </div>
        </div>

        {!walletStatus.connected && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Connect your wallet in Settings → Agent to enable automated DCA execution.
            </AlertDescription>
          </Alert>
        )}

        {walletStatus.connected && shortfall > 0 && (
          <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your wallet holds <strong>${walletBalance.toFixed(2)}</strong> USDC but your active strategies require <strong>${totalActiveCommitment.toFixed(2)}</strong> per cycle. Fund your wallet to avoid failed executions.
            </AlertDescription>
          </Alert>
        )}

        <CREArchitectureCard />

        <DCAStrategyForm onSubmit={handleCreate} isSubmitting={isSubmitting} walletBalance={walletStatus.connected ? walletBalance : null} />

        <DCAWorkflowDemo refetch={refetch} />

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading strategies…</p>
        ) : strategies.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Active Strategies</h2>
            {strategies.map(s => (
              <DCAProgressCard
                key={s.id}
                strategy={s}
                onToggle={toggleStrategy}
                onDelete={deleteStrategy}
                onEdit={setEditingStrategy}
              />
            ))}
          </div>
        ) : null}

        <DCAExecutionHistory executions={executions} />

        {editingStrategy && (
          <EditDCAStrategyDialog
            strategy={editingStrategy}
            open={!!editingStrategy}
            onOpenChange={(open) => { if (!open) setEditingStrategy(null); }}
            onSave={updateStrategy}
          />
        )}
      </div>
    </div>
  );
}
