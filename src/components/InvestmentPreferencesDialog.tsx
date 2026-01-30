import { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
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
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface InvestmentPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPreferences: {
    stocks_allocation: number;
    crypto_allocation: number;
    commodities_allocation: number;
    emergency_fund_target: number;
    debt_allocation?: number;
  } | null;
  onSave: (preferences: {
    stocks_allocation: number;
    crypto_allocation: number;
    commodities_allocation: number;
    emergency_fund_target: number;
    debt_allocation: number;
  }) => Promise<boolean>;
  trigger?: React.ReactNode;
}

const COLORS = [
  'hsl(0, 84%, 60%)',     // red for debt payoff
  '#f59e0b',              // amber/gold for stocks
  '#8b5cf6',              // purple for crypto
  '#10b981',              // green for commodities
  '#3b82f6',              // blue for emergency fund
];

export function InvestmentPreferencesDialog({
  open,
  onOpenChange,
  currentPreferences,
  onSave,
  trigger,
}: InvestmentPreferencesDialogProps) {
  const [debtPayoff, setDebtPayoff] = useState(0);
  const [stocks, setStocks] = useState(40);
  const [crypto, setCrypto] = useState(30);
  const [commodities, setCommodities] = useState(20);
  const [emergency, setEmergency] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentPreferences) {
      setDebtPayoff(currentPreferences.debt_allocation || 0);
      setStocks(currentPreferences.stocks_allocation);
      setCrypto(currentPreferences.crypto_allocation);
      setCommodities(currentPreferences.commodities_allocation);
      setEmergency(currentPreferences.emergency_fund_target);
    }
  }, [currentPreferences, open]);

  const total = debtPayoff + stocks + crypto + commodities + emergency;
  const isValid = Math.abs(total - 100) < 0.01;

  const chartData = [
    { name: 'Debt Payoff', value: debtPayoff },
    { name: 'Stocks/ETFs', value: stocks },
    { name: 'Crypto', value: crypto },
    { name: 'Commodities', value: commodities },
    { name: 'Emergency Fund', value: emergency },
  ].filter(item => item.value > 0);

  const handleSave = async () => {
    setSaving(true);
    const success = await onSave({
      debt_allocation: debtPayoff,
      stocks_allocation: stocks,
      crypto_allocation: crypto,
      commodities_allocation: commodities,
      emergency_fund_target: emergency,
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Investment Strategy Preferences
          </DialogTitle>
          <DialogDescription>
            Set your target allocation percentages. Total must equal 100%.
          </DialogDescription>
        </DialogHeader>

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
                <Label>Emergency Fund</Label>
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
                  // Find the correct color based on category name
                  const colorIndex = ['Debt Payoff', 'Stocks/ETFs', 'Crypto', 'Commodities', 'Emergency Fund'].indexOf(entry.name);
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
