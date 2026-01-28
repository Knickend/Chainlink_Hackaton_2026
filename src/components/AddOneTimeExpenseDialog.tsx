import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ProBadge } from './ProBadge';

const expenseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z.number().min(0.01, 'Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface AddOneTimeExpenseDialogProps {
  onAdd: (expense: ExpenseFormData & { is_recurring: false }) => void;
}

const expenseCategories = [
  'Emergency',
  'Medical',
  'Home Repair',
  'Car Repair',
  'Travel',
  'Electronics',
  'Gifts',
  'Legal',
  'Moving',
  'Other',
];

export function AddOneTimeExpenseDialog({ onAdd }: AddOneTimeExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: '',
      amount: 0,
      category: '',
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    onAdd({ ...data, is_recurring: false });
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-warning/30 hover:border-warning/50 text-warning">
          <Zap className="w-4 h-4" />
          One-Time
          <ProBadge className="ml-1" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-warning/20 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-warning flex items-center gap-2">
            Add One-Time Expense
            <ProBadge />
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Car Repair" {...field} className="bg-secondary/50" />
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
                  <FormLabel>Amount (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="500.00"
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-warning hover:bg-warning/90 text-warning-foreground">
              Add One-Time Expense
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
