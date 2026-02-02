import { useState } from 'react';
import { Plus, Target, Car, Plane, Shield, Home, GraduationCap, Heart, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GoalCategory, GoalPriority, GOAL_CATEGORIES, GOAL_PRIORITIES, BANKING_CURRENCIES, getCurrencySymbol } from '@/lib/types';
import { GoalInput } from '@/hooks/useGoals';

interface AddGoalDialogProps {
  onAdd: (goal: GoalInput) => void;
  disabled?: boolean;
}

const CATEGORY_ICONS: Record<GoalCategory, React.ElementType> = {
  car: Car,
  holiday: Plane,
  emergency: Shield,
  home: Home,
  education: GraduationCap,
  wedding: Heart,
  retirement: Landmark,
  other: Target,
};

export function AddGoalDialog({ onAdd, disabled }: AddGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GoalCategory>('other');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [targetDate, setTargetDate] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName('');
    setCategory('other');
    setTargetAmount('');
    setCurrentAmount('');
    setCurrency('USD');
    setTargetDate('');
    setMonthlyContribution('');
    setPriority('medium');
    setNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const target = parseFloat(targetAmount);
    if (!name.trim() || isNaN(target) || target <= 0) return;

    onAdd({
      name: name.trim(),
      category,
      target_amount: target,
      current_amount: parseFloat(currentAmount) || 0,
      currency,
      target_date: targetDate || undefined,
      monthly_contribution: parseFloat(monthlyContribution) || undefined,
      priority,
      notes: notes.trim() || undefined,
    });

    resetForm();
    setOpen(false);
  };

  const currencySymbol = getCurrencySymbol(currency);
  const CategoryIcon = CATEGORY_ICONS[category];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={disabled}>
          <Plus className="w-4 h-4" />
          Add Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CategoryIcon className="w-5 h-5 text-primary" />
            Add Financial Goal
          </DialogTitle>
          <DialogDescription>
            Set a savings target for something you want to achieve.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2">
          <div className="space-y-2">
            <Label htmlFor="name">Goal Name</Label>
            <Input
              id="name"
              placeholder="e.g., New Car, Summer Vacation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as GoalCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.value];
                    return (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {cat.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as GoalPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Target Amount ({currencySymbol})</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="10000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANKING_CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.symbol} {c.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentAmount">Already Saved ({currencySymbol})</Label>
              <Input
                id="currentAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyContribution">Monthly Savings ({currencySymbol})</Label>
              <Input
                id="monthlyContribution"
                type="number"
                step="0.01"
                min="0"
                placeholder="500"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date (optional)</Label>
            <Input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional details about this goal..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          </div>

          <div className="pt-4 flex-shrink-0">
            <Button type="submit" className="w-full">
              Add Goal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
