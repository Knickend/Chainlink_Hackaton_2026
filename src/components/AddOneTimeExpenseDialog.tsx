import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Zap, CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ProBadge } from './ProBadge';
import { cn } from '@/lib/utils';

const expenseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z.number().min(0.01, 'Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  expense_date: z.date({
    required_error: 'Date is required',
  }),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface AddOneTimeExpenseDialogProps {
  onAdd: (expense: { name: string; amount: number; category: string; is_recurring: false; expense_date: string }) => void;
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
      expense_date: new Date(),
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    onAdd({ 
      name: data.name,
      amount: data.amount,
      category: data.category,
      is_recurring: false,
      expense_date: format(data.expense_date, 'yyyy-MM-dd'),
    });
    form.reset({
      name: '',
      amount: 0,
      category: '',
      expense_date: new Date(),
    });
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
              name="expense_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal bg-secondary/50",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
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
