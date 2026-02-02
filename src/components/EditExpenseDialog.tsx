import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Expense, BANKING_CURRENCIES } from '@/lib/types';

const expenseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z.number().min(0.01, 'Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  currency: z.string().min(1, 'Currency is required'),
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
      currency: expense.currency || 'USD',
    },
  });

  const selectedCurrency = useWatch({ control: form.control, name: 'currency' });
  const currencySymbol = BANKING_CURRENCIES.find(c => c.value === selectedCurrency)?.symbol || '$';

  useEffect(() => {
    if (open) {
      form.reset({
        name: expense.name,
        amount: expense.amount,
        category: expense.category,
        currency: expense.currency || 'USD',
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
      <DialogContent className="glass-card border-danger/20 sm:max-w-[425px] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-danger">Edit Expense</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2">
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
                  <FormLabel>Monthly Amount ({currencySymbol})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="bg-secondary/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {BANKING_CURRENCIES.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.symbol} - {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

            </div>

            <div className="pt-4 flex-shrink-0">
              <Button type="submit" className="w-full bg-danger hover:bg-danger/90">
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
