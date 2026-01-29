import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DebtType, DEBT_TYPES, DisplayUnit, UNIT_SYMBOLS } from '@/lib/types';

const debtSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  debt_type: z.enum(['mortgage', 'credit_card', 'personal_loan', 'auto_loan', 'student_loan', 'other']),
  principal_amount: z.number().min(0.01, 'Amount must be greater than 0'),
  interest_rate: z.number().min(0, 'Interest rate must be 0 or greater').max(100, 'Interest rate cannot exceed 100%'),
  monthly_payment: z.number().min(0).optional(),
});

type DebtFormData = z.infer<typeof debtSchema>;

interface AddDebtDialogProps {
  onAdd: (data: DebtFormData) => void;
  displayUnit: DisplayUnit;
}

export function AddDebtDialog({ onAdd, displayUnit }: AddDebtDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<DebtFormData>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      name: '',
      debt_type: 'other',
      principal_amount: undefined as unknown as number,
      interest_rate: undefined as unknown as number,
      monthly_payment: undefined,
    },
  });

  const onSubmit = (data: DebtFormData) => {
    onAdd(data);
    form.reset({
      name: '',
      debt_type: 'other',
      principal_amount: undefined as unknown as number,
      interest_rate: undefined as unknown as number,
      monthly_payment: undefined,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Debt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Debt</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Home Mortgage, Chase Credit Card" {...field} className="bg-secondary/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="debt_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue placeholder="Select debt type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DEBT_TYPES.map((type) => (
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
              name="principal_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outstanding Balance ({UNIT_SYMBOLS[displayUnit]})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="250000.00"
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
              name="interest_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Interest Rate (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="6.5"
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
              name="monthly_payment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Payment ({UNIT_SYMBOLS[displayUnit]} - optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="1500.00"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="bg-secondary/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Debt</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
