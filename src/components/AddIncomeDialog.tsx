import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DisplayUnit, UNIT_SYMBOLS } from '@/lib/types';

const incomeSchema = z.object({
  source: z.string().min(1, 'Source is required').max(100),
  amount: z.number().min(0.01, 'Amount must be positive'),
  type: z.enum(['work', 'passive', 'investment'] as const),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface AddIncomeDialogProps {
  onAdd: (income: IncomeFormData) => void;
  displayUnit: DisplayUnit;
}

const incomeTypes = [
  { value: 'work', label: 'Work Income' },
  { value: 'passive', label: 'Passive Income' },
  { value: 'investment', label: 'Investment Income' },
];

export function AddIncomeDialog({ onAdd, displayUnit }: AddIncomeDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      source: '',
      amount: undefined,
      type: 'work',
    },
  });

  const onSubmit = (data: IncomeFormData) => {
    onAdd(data);
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-success/30 hover:border-success/50 text-success">
          <Plus className="w-4 h-4" />
          Add Income
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-success/20 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-success">Add New Income Source</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Income Source</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Salary, Rental Income" {...field} className="bg-secondary/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Amount ({UNIT_SYMBOLS[displayUnit]})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="5000"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      className="bg-secondary/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Income Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {incomeTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-success hover:bg-success/90">
              Add Income
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
