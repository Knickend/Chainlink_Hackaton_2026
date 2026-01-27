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
import { Income } from '@/lib/types';

const incomeSchema = z.object({
  source: z.string().min(1, 'Source is required').max(100),
  amount: z.number().min(0.01, 'Amount must be positive'),
  type: z.enum(['work', 'passive', 'investment'] as const),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface EditIncomeDialogProps {
  income: Income;
  onUpdate: (id: string, data: Partial<Omit<Income, 'id'>>) => void;
}

const incomeTypes = [
  { value: 'work', label: 'Work Income' },
  { value: 'passive', label: 'Passive Income' },
  { value: 'investment', label: 'Investment Income' },
];

export function EditIncomeDialog({ income, onUpdate }: EditIncomeDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      source: income.source,
      amount: income.amount,
      type: income.type,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        source: income.source,
        amount: income.amount,
        type: income.type,
      });
    }
  }, [open, income, form]);

  const onSubmit = (data: IncomeFormData) => {
    onUpdate(income.id, data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-success/20 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-success">Edit Income Source</DialogTitle>
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

            <Button type="submit" className="w-full bg-success hover:bg-success/90">
              Save Changes
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
