import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDCAStrategies, type CreateStrategyInput, type DCAStrategy } from '@/hooks/useDCAStrategies';
import { DCAStrategyForm } from '@/components/DCAStrategyForm';
import { DCAProgressCard } from '@/components/DCAProgressCard';
import { DCAExecutionHistory } from '@/components/DCAExecutionHistory';
import { EditDCAStrategyDialog } from '@/components/EditDCAStrategyDialog';

export default function DCA() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { strategies, executions, isLoading, createStrategy, updateStrategy, toggleStrategy, deleteStrategy } = useDCAStrategies();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<DCAStrategy | null>(null);

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

        <DCAStrategyForm onSubmit={handleCreate} isSubmitting={isSubmitting} />

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
