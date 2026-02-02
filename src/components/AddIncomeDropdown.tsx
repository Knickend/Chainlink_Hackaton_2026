import { useState, useEffect } from 'react';
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
import { DisplayUnit, BANKING_CURRENCIES, BITCOIN_CURRENCIES, isBitcoinCurrency } from '@/lib/types';

// Recurring income schema
const recurringIncomeSchema = z.object({
  source: z.string().min(1, 'Source is required').max(100),
  amount: z.number().min(0.00000001, 'Amount must be positive'),
  type: z.enum(['work', 'passive', 'investment', 'mining', 'other'] as const),
  currency: z.string().min(1, 'Currency is required'),
});

// One-time income schema
const oneTimeIncomeSchema = z.object({
  source: z.string().min(1, 'Source is required').max(100),
  amount: z.number().min(0.00000001, 'Amount must be positive'),
  type: z.enum(['work', 'passive', 'investment', 'mining', 'other'] as const),
  currency: z.string().min(1, 'Currency is required'),
  income_date: z.date({
    required_error: 'Date is required',
  }),
});

type RecurringIncomeFormData = z.infer<typeof recurringIncomeSchema>;
type OneTimeIncomeFormData = z.infer<typeof oneTimeIncomeSchema>;

interface AddIncomeDropdownProps {
  onAddRecurring: (data: { source: string; amount: number; type: 'work' | 'passive' | 'investment' | 'mining' | 'other'; currency: string; is_recurring: true }) => void;
  onAddOneTime: (data: { source: string; amount: number; type: 'work' | 'passive' | 'investment' | 'mining' | 'other'; currency: string; is_recurring: false; income_date: string }) => void;
  displayUnit: DisplayUnit;
  isPro: boolean;
  onUpgrade?: () => void;
}

const incomeTypes = [
  { value: 'work', label: 'Work Income' },
  { value: 'passive', label: 'Passive Income' },
  { value: 'investment', label: 'Investment Income' },
  { value: 'mining', label: 'Bitcoin Mining' },
  { value: 'other', label: 'Other' },
];

const oneTimeIncomeTypes = [
  { value: 'work', label: 'Bonus / Commission' },
  { value: 'passive', label: 'One-time Dividend' },
  { value: 'investment', label: 'Capital Gain' },
  { value: 'mining', label: 'Mining Payout' },
  { value: 'other', label: 'Other' },
];

// Combine fiat and bitcoin currencies for the selector
const allCurrencies = [
  ...BITCOIN_CURRENCIES.map(c => ({ value: c.value, label: c.label, symbol: c.symbol })),
  ...BANKING_CURRENCIES.map(c => ({ value: c.value, label: c.label, symbol: c.symbol })),
];

export function AddIncomeDropdown({ 
  onAddRecurring, 
  onAddOneTime, 
  displayUnit,
  isPro, 
  onUpgrade 
}: AddIncomeDropdownProps) {
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [oneTimeOpen, setOneTimeOpen] = useState(false);

  const recurringForm = useForm<RecurringIncomeFormData>({
    resolver: zodResolver(recurringIncomeSchema),
    defaultValues: {
      source: '',
      amount: undefined as unknown as number,
      type: 'work',
      currency: 'USD',
    },
  });

  const oneTimeForm = useForm<OneTimeIncomeFormData>({
    resolver: zodResolver(oneTimeIncomeSchema),
    defaultValues: {
      source: '',
      amount: undefined as unknown as number,
      type: 'work',
      currency: 'USD',
      income_date: new Date(),
    },
  });

  const recurringType = useWatch({ control: recurringForm.control, name: 'type' });
  const recurringCurrency = useWatch({ control: recurringForm.control, name: 'currency' });
  const recurringCurrencySymbol = allCurrencies.find(c => c.value === recurringCurrency)?.symbol || '$';
  
  const oneTimeType = useWatch({ control: oneTimeForm.control, name: 'type' });
  const oneTimeCurrency = useWatch({ control: oneTimeForm.control, name: 'currency' });
  const oneTimeCurrencySymbol = allCurrencies.find(c => c.value === oneTimeCurrency)?.symbol || '$';

  // Auto-switch to SATS when Mining is selected
  useEffect(() => {
    if (recurringType === 'mining' && !isBitcoinCurrency(recurringCurrency)) {
      recurringForm.setValue('currency', 'SATS', { shouldValidate: true, shouldDirty: true });
    }
  }, [recurringType, recurringCurrency, recurringForm]);

  useEffect(() => {
    if (oneTimeType === 'mining' && !isBitcoinCurrency(oneTimeCurrency)) {
      oneTimeForm.setValue('currency', 'SATS', { shouldValidate: true, shouldDirty: true });
    }
  }, [oneTimeType, oneTimeCurrency, oneTimeForm]);

  // Get appropriate step and placeholder based on currency
  const getInputStep = (currency: string) => {
    if (currency === 'BTC') return '0.00000001';
    if (currency === 'SATS') return '1';
    return '0.01';
  };

  const getPlaceholder = (currency: string) => {
    if (currency === 'BTC') return '0.00150000';
    if (currency === 'SATS') return '150000';
    return '5000';
  };

  const handleRecurringSubmit = (data: RecurringIncomeFormData) => {
    onAddRecurring({
      source: data.source,
      amount: data.amount,
      type: data.type,
      currency: data.currency,
      is_recurring: true,
    });
    recurringForm.reset({
      source: '',
      amount: undefined as unknown as number,
      type: 'work',
      currency: 'USD',
    });
    setRecurringOpen(false);
  };

  const handleOneTimeSubmit = (data: OneTimeIncomeFormData) => {
    onAddOneTime({
      source: data.source,
      amount: data.amount,
      type: data.type,
      currency: data.currency,
      is_recurring: false,
      income_date: format(data.income_date, 'yyyy-MM-dd'),
    });
    oneTimeForm.reset({
      source: '',
      amount: undefined as unknown as number,
      type: 'work',
      currency: 'USD',
      income_date: new Date(),
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

  const renderCurrencySelect = (form: typeof recurringForm | typeof oneTimeForm, selectedType: string) => (
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
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 border-success/30 hover:border-success/50 text-success">
            <Plus className="w-4 h-4" />
            Add Income
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

      {/* Recurring Income Dialog */}
      <Dialog open={recurringOpen} onOpenChange={setRecurringOpen}>
        <DialogContent className="glass-card border-success/20 sm:max-w-[425px] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-success">Add Recurring Income</DialogTitle>
          </DialogHeader>
          <Form {...recurringForm}>
            <form onSubmit={recurringForm.handleSubmit(handleRecurringSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2">
                <FormField
                  control={recurringForm.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Income Source</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={recurringType === 'mining' ? 'e.g., Bitcoin Mining Pool' : 'e.g., Salary, Rental Income'} 
                          {...field} 
                          className="bg-secondary/50" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={recurringForm.control}
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

                {renderCurrencySelect(recurringForm, recurringType)}

                <FormField
                  control={recurringForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Amount ({recurringCurrencySymbol})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step={getInputStep(recurringCurrency)}
                          placeholder={getPlaceholder(recurringCurrency)}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="bg-secondary/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 flex-shrink-0">
                <Button type="submit" className="w-full bg-success hover:bg-success/90">
                  Add Recurring Income
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* One-Time Income Dialog */}
      <Dialog open={oneTimeOpen} onOpenChange={setOneTimeOpen}>
        <DialogContent className="glass-card border-primary/20 sm:max-w-[425px] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-primary flex items-center gap-2">
              Add Non-Recurring Income
              <ProBadge />
            </DialogTitle>
          </DialogHeader>
          <Form {...oneTimeForm}>
            <form onSubmit={oneTimeForm.handleSubmit(handleOneTimeSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2">
                <FormField
                  control={oneTimeForm.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Income Source</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Year-end Bonus, Stock Sale" {...field} className="bg-secondary/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={oneTimeForm.control}
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
                          {oneTimeIncomeTypes.map((type) => (
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

                {renderCurrencySelect(oneTimeForm, oneTimeType)}

                <FormField
                  control={oneTimeForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ({oneTimeCurrencySymbol})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step={getInputStep(oneTimeCurrency)}
                          placeholder={getPlaceholder(oneTimeCurrency)}
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
                  name="income_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date Received</FormLabel>
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
              </div>

              <div className="pt-4 flex-shrink-0">
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                  Add Non-Recurring Income
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}