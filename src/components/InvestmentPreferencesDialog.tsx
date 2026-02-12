import { useState, useEffect } from 'react';
import { Settings2, Target, Scale } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Goal } from '@/lib/types';
import { GoalAnalysis } from '@/lib/goalAnalysis';

interface InvestmentPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPreferences: {
    stocks_allocation: number;
    crypto_allocation: number;
    commodities_allocation: number;
    realestate_allocation?: number;
    emergency_fund_target: number;
    debt_allocation?: number;
  } | null;
  onSave: (preferences: {
    stocks_allocation: number;
    crypto_allocation: number;
    commodities_allocation: number;
    realestate_allocation: number;
    emergency_fund_target: number;
    debt_allocation: number;
    rebalance_threshold?: number;
    rebalance_frequency?: string;
  }) => Promise<boolean>;
  goals?: Goal[];
  goalAnalysis?: GoalAnalysis;
  trigger?: React.ReactNode;
}

const COLORS = [
  'hsl(0, 84%, 60%)',     // red for debt payoff
  '#ec4899',              // pink for goal savings
  '#22C55E',              // green for stocks
  '#F7931A',              // orange for crypto
  '#EAB308',              // yellow for commodities
  '#8B5CF6',              // purple for real estate
  '#3B82F6',              // blue for emergency fund
];

export function InvestmentPreferencesDialog({
  open,
  onOpenChange,
  currentPreferences,
  onSave,
  goals = [],
  goalAnalysis,
  trigger,
}: InvestmentPreferencesDialogProps) {
  const [debtPayoff, setDebtPayoff] = useState(0);
  const [stocks, setStocks] = useState(35);
  const [crypto, setCrypto] = useState(25);
  const [commodities, setCommodities] = useState(15);
  const [realestate, setRealestate] = useState(15);
  const [emergency, setEmergency] = useState(10);
  const [rebalanceThreshold, setRebalanceThreshold] = useState(10);
  const [rebalanceFrequency, setRebalanceFrequency] = useState('weekly');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentPreferences) {
      setDebtPayoff(currentPreferences.debt_allocation || 0);
      setStocks(currentPreferences.stocks_allocation);
      setCrypto(currentPreferences.crypto_allocation);
      setCommodities(currentPreferences.commodities_allocation);
      setRealestate(currentPreferences.realestate_allocation || 0);
      setEmergency(currentPreferences.emergency_fund_target);
      if ('rebalance_threshold' in currentPreferences) {
        setRebalanceThreshold((currentPreferences as any).rebalance_threshold ?? 10);
      }
      if ('rebalance_frequency' in currentPreferences) {
        setRebalanceFrequency((currentPreferences as any).rebalance_frequency ?? 'weekly');
      }
    }
  }, [currentPreferences, open]);

  const total = debtPayoff + stocks + crypto + commodities + realestate + emergency;
  const isValid = Math.abs(total - 100) < 0.01;

  const chartData = [
    { name: 'Debt Payoff', value: debtPayoff },
    { name: 'Stocks, Bonds & ETFs', value: stocks },
    { name: 'Cryptocurrency', value: crypto },
    { name: 'Commodities', value: commodities },
    { name: 'Real Estate, Equity & Misc.', value: realestate },
    { name: 'Cash & Stablecoins', value: emergency },
  ].filter(item => item.value > 0);

  const handleSave = async () => {
    setSaving(true);
    const success = await onSave({
      debt_allocation: debtPayoff,
      stocks_allocation: stocks,
      crypto_allocation: crypto,
      commodities_allocation: commodities,
      realestate_allocation: realestate,
      emergency_fund_target: emergency,
      rebalance_threshold: rebalanceThreshold,
      rebalance_frequency: rebalanceFrequency,
    });
    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleSliderChange = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    newValue: number
  ) => {
    setter(newValue);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] h-[85vh] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Investment Strategy Preferences
          </DialogTitle>
          <DialogDescription>
            Set your target allocation percentages. Total must equal 100%.
            {goalAnalysis && goalAnalysis.totalMonthlyContributions > 0 && (
              <span className="block mt-1 text-primary">
                Goals require {goalAnalysis.totalMonthlyContributions.toFixed(0)}/mo — shown separately in your strategy.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2">
        {/* Goals Summary Panel */}
        {goalAnalysis && goalAnalysis.activeContributingGoals.length > 0 && (
          <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-pink-500" />
              <span className="text-sm font-medium text-pink-500">Active Goal Contributions</span>
            </div>
            <div className="space-y-1">
              {goalAnalysis.activeContributingGoals.slice(0, 4).map((goal) => (
                <div key={goal.id} className="flex justify-between text-xs text-muted-foreground">
                  <span>{goal.name}</span>
                  <span className="text-pink-400">{goal.monthly_contribution}/mo</span>
                </div>
              ))}
              {goalAnalysis.activeContributingGoals.length > 4 && (
                <p className="text-xs text-muted-foreground">
                  +{goalAnalysis.activeContributingGoals.length - 4} more goals
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Sliders */}
          <div className="space-y-6">
            {/* Debt Payoff Slider */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-destructive">Debt Payoff</Label>
                <span className="text-sm font-medium text-destructive">{debtPayoff}%</span>
              </div>
              <Slider
                value={[debtPayoff]}
                onValueChange={([v]) => handleSliderChange(setDebtPayoff, v)}
                max={100}
                step={5}
                className="[&_[role=slider]]:bg-destructive [&_.bg-primary]:bg-destructive"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Stocks/ETFs</Label>
                <span className="text-sm font-medium text-primary">{stocks}%</span>
              </div>
              <Slider
                value={[stocks]}
                onValueChange={([v]) => handleSliderChange(setStocks, v)}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Crypto</Label>
                <span className="text-sm font-medium text-primary">{crypto}%</span>
              </div>
              <Slider
                value={[crypto]}
                onValueChange={([v]) => handleSliderChange(setCrypto, v)}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Commodities</Label>
                <span className="text-sm font-medium text-primary">{commodities}%</span>
              </div>
              <Slider
                value={[commodities]}
                onValueChange={([v]) => handleSliderChange(setCommodities, v)}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Real Estate, Equity & Misc.</Label>
                <span className="text-sm font-medium text-primary">{realestate}%</span>
              </div>
              <Slider
                value={[realestate]}
                onValueChange={([v]) => handleSliderChange(setRealestate, v)}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Cash & Stablecoins</Label>
                <span className="text-sm font-medium text-primary">{emergency}%</span>
              </div>
              <Slider
                value={[emergency]}
                onValueChange={([v]) => handleSliderChange(setEmergency, v)}
                max={100}
                step={5}
              />
            </div>

            {/* Total indicator */}
            <div className={`p-3 rounded-lg ${isValid ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="font-bold">{total}%</span>
              </div>
              {!isValid && (
                <p className="text-xs mt-1">
                  {total < 100 ? `Add ${100 - total}% more` : `Remove ${total - 100}%`}
                </p>
              )}
            </div>
          </div>

          {/* Pie Chart Preview */}
          <div className="flex flex-col items-center justify-center">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="40%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => {
                  const colorIndex = ['Debt Payoff', 'Goal Savings', 'Stocks, Bonds & ETFs', 'Cryptocurrency', 'Commodities', 'Real Estate, Equity & Misc.', 'Cash & Stablecoins'].indexOf(entry.name);
                  return <Cell key={`cell-${index}`} fill={COLORS[colorIndex >= 0 ? colorIndex : index]} />;
                })}
              </Pie>
              <Tooltip
                formatter={(value: number) => `${value}%`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
              <Legend 
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Rebalance Settings */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">Rebalance Settings</h4>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm">Drift Threshold</Label>
              <span className="text-sm font-medium text-primary">{rebalanceThreshold}%</span>
            </div>
            <Slider
              value={[rebalanceThreshold]}
              onValueChange={([v]) => setRebalanceThreshold(v)}
              min={5}
              max={20}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Get notified when any category drifts more than {rebalanceThreshold}% from target.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Check Frequency</Label>
            <Select value={rebalanceFrequency} onValueChange={setRebalanceFrequency}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving ? 'Saving...' : 'Save Strategy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
