import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Plus, ChevronDown, Repeat, Zap, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProBadge } from './ProBadge';
import { cn } from '@/lib/utils';
import { BANKING_CURRENCIES } from '@/lib/types';

// Recurring expense schema
const recurringExpenseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z.number().min(0.01, 'Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  currency: z.string().min(1, 'Currency is required'),
});

// One-time expense schema
const oneTimeExpenseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z.number().min(0.01, 'Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  currency: z.string().min(1, 'Currency is required'),
  expense_date: z.date({
    required_error: 'Date is required',
  }),
});

type RecurringExpenseFormData = z.infer<typeof recurringExpenseSchema>;
type OneTimeExpenseFormData = z.infer<typeof oneTimeExpenseSchema>;

interface AddExpenseDropdownProps {
  onAddRecurring: (data: { name: string; amount: number; category: string; currency: string }) => void;
  onAddOneTime: (data: { name: string; amount: number; category: string; currency: string; is_recurring: false; expense_date: string }) => void;
  isPro: boolean;
  onUpgrade?: () => void;
}

const recurringCategories = [
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

const oneTimeCategories = [
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

export function AddExpenseDropdown({ 
  onAddRecurring, 
  onAddOneTime, 
  isPro, 
  onUpgrade 
}: AddExpenseDropdownProps) {
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [oneTimeOpen, setOneTimeOpen] = useState(false);

  const recurringForm = useForm<RecurringExpenseFormData>({
    resolver: zodResolver(recurringExpenseSchema),
    defaultValues: {
      name: '',
      amount: undefined as unknown as number,
      category: '',
      currency: 'USD',
    },
  });

  const oneTimeForm = useForm<OneTimeExpenseFormData>({
    resolver: zodResolver(oneTimeExpenseSchema),
    defaultValues: {
      name: '',
      amount: undefined as unknown as number,
      category: '',
      currency: 'USD',
      expense_date: new Date(),
    },
  });

  const recurringCurrency = useWatch({ control: recurringForm.control, name: 'currency' });
  const recurringCurrencySymbol = BANKING_CURRENCIES.find(c => c.value === recurringCurrency)?.symbol || '$';
  
  const oneTimeCurrency = useWatch({ control: oneTimeForm.control, name: 'currency' });
  const oneTimeCurrencySymbol = BANKING_CURRENCIES.find(c => c.value === oneTimeCurrency)?.symbol || '$';

  const handleRecurringSubmit = (data: RecurringExpenseFormData) => {
    onAddRecurring({
      name: data.name,
      amount: data.amount,
      category: data.category,
      currency: data.currency,
    });
    recurringForm.reset({
      name: '',
      amount: undefined as unknown as number,
      category: '',
      currency: 'USD',
    });
    setRecurringOpen(false);
  };

  const handleOneTimeSubmit = (data: OneTimeExpenseFormData) => {
    onAddOneTime({
      name: data.name,
      amount: data.amount,
      category: data.category,
      currency: data.currency,
      is_recurring: false,
      expense_date: format(data.expense_date, 'yyyy-MM-dd'),
    });
    oneTimeForm.reset({
      name: '',
      amount: undefined as unknown as number,
      category: '',
      currency: 'USD',
      expense_date: new Date(),
    });
    setOneTimeOpen(false);
  };

  const handleOneTimeClick = () => {
    if (isPro) {
      setOneTimeOpen(true);
    } else {
      onUpgrade?.();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 border-danger/30 hover:border-danger/50 text-danger">
            <Plus className="w-4 h-4" />
            Add Expense
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setRecurringOpen(true)} className="cursor-pointer">
            <Repeat className="w-4 h-4 mr-2" />
            Recurring
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOneTimeClick} className="cursor-pointer">
            <Zap className="w-4 h-4 mr-2" />
            Non-Recurring
            {!isPro && <ProBadge className="ml-auto" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Recurring Expense Dialog */}
      <Dialog open={recurringOpen} onOpenChange={setRecurringOpen}>
        <DialogContent className="glass-card border-danger/20 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-danger">Add Recurring Expense</DialogTitle>
          </DialogHeader>
          <Form {...recurringForm}>
            <form onSubmit={recurringForm.handleSubmit(handleRecurringSubmit)} className="space-y-4">
              <FormField
                control={recurringForm.control}
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
                control={recurringForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Amount ({recurringCurrencySymbol})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="15.99"
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
                control={recurringForm.control}
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
                control={recurringForm.control}
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
                        {recurringCategories.map((category) => (
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
                Add Recurring Expense
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* One-Time Expense Dialog */}
      <Dialog open={oneTimeOpen} onOpenChange={setOneTimeOpen}>
        <DialogContent className="glass-card border-warning/20 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-warning flex items-center gap-2">
              Add Non-Recurring Expense
              <ProBadge />
            </DialogTitle>
          </DialogHeader>
          <Form {...oneTimeForm}>
            <form onSubmit={oneTimeForm.handleSubmit(handleOneTimeSubmit)} className="space-y-4">
              <FormField
                control={oneTimeForm.control}
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
                control={oneTimeForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ({oneTimeCurrencySymbol})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="500.00"
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
                control={oneTimeForm.control}
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
                control={oneTimeForm.control}
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
                control={oneTimeForm.control}
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
                        {oneTimeCategories.map((category) => (
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
                Add Non-Recurring Expense
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
