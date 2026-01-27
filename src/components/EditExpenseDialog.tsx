import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Expense } from '@/lib/types';

const expenseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z.number().min(0.01, 'Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface EditExpenseDialogProps {
  expense: Expense;
  onUpdate: (id: string, data: Partial<Omit<Expense, 'id'>>) => void;
}

const expenseCategories = [
  'Housing',
  'Food',
  'Transportation',
  'Insurance',
  'Lifestyle',
  'Healthcare',
  'Education',
  'Utilities',
  'Debt',
  'Savings',
  'Other',
];

export function EditExpenseDialog({ expense, onUpdate }: EditExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: expense.name,
      amount: expense.amount,
      category: expense.category,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: expense.name,
        amount: expense.amount,
        category: expense.category,
      });
    }
  }, [open, expense, form]);

  const onSubmit = (data: ExpenseFormData) => {
    onUpdate(expense.id, data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-danger/20 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-danger">Edit Expense</DialogTitle>
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
                    <Input placeholder="e.g., Netflix Subscription" {...field} className="bg-secondary/50" />
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
                  <FormLabel>Monthly Amount (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
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
                  <Select onValueChange={field.onChange} value={field.value}>
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

            <Button type="submit" className="w-full bg-danger hover:bg-danger/90">
              Save Changes
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
