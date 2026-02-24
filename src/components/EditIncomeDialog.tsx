import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Income, DisplayUnit, BANKING_CURRENCIES, BITCOIN_CURRENCIES, isBitcoinCurrency } from '@/lib/types';
import { cn } from '@/lib/utils';

const incomeSchema = z.object({
  source: z.string().min(1, 'Source is required').max(100),
  amount: z.number().min(0.00000001, 'Amount must be positive'),
  type: z.enum(['work', 'passive', 'investment', 'mining', 'other'] as const),
  currency: z.string().min(1, 'Currency is required'),
  income_date: z.date().optional(),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface EditIncomeDialogProps {
  income: Income;
  onUpdate: (id: string, data: Partial<Omit<Income, 'id'>>) => void;
  displayUnit: DisplayUnit;
}

const incomeTypes = [
  { value: 'work', label: 'Work Income' },
  { value: 'passive', label: 'Passive Income' },
  { value: 'investment', label: 'Investment Income' },
  { value: 'mining', label: 'Bitcoin Mining' },
  { value: 'other', label: 'Other' },
];

// Combine fiat and bitcoin currencies for the selector
const allCurrencies = [
  ...BITCOIN_CURRENCIES.map(c => ({ value: c.value, label: c.label, symbol: c.symbol })),
  ...BANKING_CURRENCIES.map(c => ({ value: c.value, label: c.label, symbol: c.symbol })),
];

export function EditIncomeDialog({ income, onUpdate, displayUnit }: EditIncomeDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      source: income.source,
      amount: income.amount,
      type: income.type,
      currency: income.currency || 'USD',
      income_date: income.income_date ? new Date(income.income_date) : undefined,
    },
  });

  // Watch the currency field to react to changes
  const selectedType = useWatch({ control: form.control, name: 'type' });
  const selectedCurrency = useWatch({ control: form.control, name: 'currency' });

  const currencySymbol = allCurrencies.find(c => c.value === selectedCurrency)?.symbol || selectedCurrency;

  // Get appropriate step and placeholder based on currency
  const getInputStep = () => {
    if (selectedCurrency === 'BTC') return '0.00000001';
    if (selectedCurrency === 'SATS') return '1';
    return '0.01';
  };

  const isOneTime = income.is_recurring === false;

  useEffect(() => {
    if (open) {
      form.reset({
        source: income.source,
        amount: income.amount,
        type: income.type,
        currency: income.currency || 'USD',
        income_date: income.income_date ? new Date(income.income_date) : undefined,
      });
    }
  }, [open, income, form]);

  const onSubmit = (data: IncomeFormData) => {
    onUpdate(income.id, {
      ...data,
      ...(data.income_date ? { income_date: format(data.income_date, 'yyyy-MM-dd') } : {}),
    } as Partial<Omit<Income, 'id'>>);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-success/20 sm:max-w-[425px] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-success">Edit Income Source</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Income Source</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={selectedType === 'mining' ? 'e.g., Bitcoin Mining Pool' : 'e.g., Salary, Rental Income'} 
                      {...field} 
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                      {selectedType === 'mining' && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Bitcoin</div>
                          {BITCOIN_CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.symbol} - {currency.label}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Fiat Currencies</div>
                        </>
                      )}
                      {BANKING_CURRENCIES.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.symbol} - {currency.label}
                        </SelectItem>
                      ))}
                      {selectedType !== 'mining' && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Bitcoin</div>
                          {BITCOIN_CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.symbol} - {currency.label}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isOneTime ? 'Amount' : 'Monthly Amount'} ({currencySymbol})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step={getInputStep()}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      className="bg-secondary/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isOneTime && (
              <FormField
                control={form.control}
                name="income_date"
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
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            </div>

            <div className="pt-4 flex-shrink-0">
              <Button type="submit" className="w-full bg-success hover:bg-success/90">
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
