import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useDCAStrategies } from '@/hooks/useDCAStrategies';
import { useAgentWallet } from '@/hooks/useAgentWallet';
import { DCAStrategyCard } from '@/components/dca/DCAStrategyCard';
import { CreateDCADialog } from '@/components/dca/CreateDCADialog';
import { DCAExecutionHistory } from '@/components/dca/DCAExecutionHistory';
import { DCAWorkflowDemo } from '@/components/dca/DCAWorkflowDemo';
import { CREArchitectureExplainer } from '@/components/dca/CREArchitectureExplainer';

const DCA = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { status: walletStatus, isLoading: walletLoading } = useAgentWallet();
  const { strategies, executions, loading, createStrategy, toggleStrategy, deleteStrategy, updateStrategy, totalCommitted } = useDCAStrategies();

  if (authLoading || loading || walletLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const walletBalance = Number(walletStatus.balance) || 0;
  const showBalanceWarning = walletStatus.connected && totalCommitted > walletBalance;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                <span className="gradient-text">DCA</span> <span className="text-foreground">Strategies</span>
              </h1>
              <p className="text-sm text-muted-foreground">Automated dollar-cost averaging via Chainlink CRE</p>
            </div>
          </div>
          <CreateDCADialog onCreate={createStrategy} />
        </motion.header>

        {/* Architecture Explainer */}
        <CREArchitectureExplainer />

        {/* Balance Warning */}
        {showBalanceWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
            <Card className="border-warning/50 bg-warning/10">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                <p className="text-sm">
                  Your wallet balance (${walletBalance.toFixed(2)} USDC) is less than total committed amount (${totalCommitted.toFixed(2)} USDC). 
                  Some executions may fail.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!walletStatus.connected && (
          <Card className="glass-card mb-6">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-3">Connect your agent wallet in Settings to use DCA strategies.</p>
              <Button variant="outline" onClick={() => navigate('/settings')}>Go to Settings</Button>
            </CardContent>
          </Card>
        )}

        {/* Strategies */}
        {strategies.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 mb-8">
            {strategies.map(s => (
              <DCAStrategyCard key={s.id} strategy={s} onToggle={toggleStrategy} onDelete={deleteStrategy} onUpdate={updateStrategy} />
            ))}
          </div>
        ) : walletStatus.connected ? (
          <Card className="glass-card mb-8">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No DCA strategies yet. Create your first one to start automated investing.</p>
            </CardContent>
          </Card>
        ) : null}

        {/* Workflow Simulator */}
        {strategies.length > 0 && (
          <div className="mb-8">
            <DCAWorkflowDemo strategies={strategies} />
          </div>
        )}

        {/* Execution History */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Execution History</CardTitle>
          </CardHeader>
          <CardContent>
            <DCAExecutionHistory executions={executions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DCA;
