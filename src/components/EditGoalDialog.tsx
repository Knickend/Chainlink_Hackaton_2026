import { useState, useEffect } from 'react';
import { Pencil, Target, Car, Plane, Shield, Home, GraduationCap, Heart, Landmark } from 'lucide-react';
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
import { Goal, GoalCategory, GoalPriority, GOAL_CATEGORIES, GOAL_PRIORITIES, BANKING_CURRENCIES, getCurrencySymbol } from '@/lib/types';
import { GoalInput } from '@/hooks/useGoals';

interface EditGoalDialogProps {
  goal: Goal;
  onUpdate: (id: string, data: Partial<GoalInput & { is_completed?: boolean }>) => void;
  trigger?: React.ReactNode;
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

export function EditGoalDialog({ goal, onUpdate, trigger }: EditGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(goal.name);
  const [category, setCategory] = useState<GoalCategory>(goal.category);
  const [targetAmount, setTargetAmount] = useState(goal.target_amount.toString());
  const [currentAmount, setCurrentAmount] = useState(goal.current_amount.toString());
  const [currency, setCurrency] = useState(goal.currency);
  const [targetDate, setTargetDate] = useState(goal.target_date || '');
  const [monthlyContribution, setMonthlyContribution] = useState(goal.monthly_contribution?.toString() || '');
  const [priority, setPriority] = useState<GoalPriority>(goal.priority);
  const [notes, setNotes] = useState(goal.notes || '');

  // Reset form when goal changes
  useEffect(() => {
    setName(goal.name);
    setCategory(goal.category);
    setTargetAmount(goal.target_amount.toString());
    setCurrentAmount(goal.current_amount.toString());
    setCurrency(goal.currency);
    setTargetDate(goal.target_date || '');
    setMonthlyContribution(goal.monthly_contribution?.toString() || '');
    setPriority(goal.priority);
    setNotes(goal.notes || '');
  }, [goal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const target = parseFloat(targetAmount);
    if (!name.trim() || isNaN(target) || target <= 0) return;

    onUpdate(goal.id, {
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

    setOpen(false);
  };

  const currencySymbol = getCurrencySymbol(currency);
  const CategoryIcon = CATEGORY_ICONS[category];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CategoryIcon className="w-5 h-5 text-primary" />
            Edit Goal
          </DialogTitle>
          <DialogDescription>
            Update your savings goal details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Goal Name</Label>
            <Input
              id="edit-name"
              placeholder="e.g., New Car, Summer Vacation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
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
              <Label htmlFor="edit-priority">Priority</Label>
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
              <Label htmlFor="edit-targetAmount">Target Amount ({currencySymbol})</Label>
              <Input
                id="edit-targetAmount"
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
              <Label htmlFor="edit-currency">Currency</Label>
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
              <Label htmlFor="edit-currentAmount">Already Saved ({currencySymbol})</Label>
              <Input
                id="edit-currentAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-monthlyContribution">Monthly Savings ({currencySymbol})</Label>
              <Input
                id="edit-monthlyContribution"
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
            <Label htmlFor="edit-targetDate">Target Date (optional)</Label>
            <Input
              id="edit-targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Textarea
              id="edit-notes"
              placeholder="Any additional details about this goal..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full">
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
