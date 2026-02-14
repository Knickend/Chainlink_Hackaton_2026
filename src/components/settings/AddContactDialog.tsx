import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { AddressBookEntry } from '@/hooks/useAddressBook';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255).or(z.literal('')).optional(),
  wallet_address: z
    .string()
    .trim()
    .refine((v) => !v || /^0x[a-fA-F0-9]{40}$/.test(v), 'Must be a valid 0x address (42 chars)')
    .optional(),
  label: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export type ContactFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ContactFormValues) => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<AddressBookEntry>;
}

export const AddContactDialog = ({ open, onOpenChange, onSubmit, isSubmitting, defaultValues }: Props) => {
  const isEdit = !!defaultValues?.id;

  const {
    register, handleSubmit, reset, setValue, watch, formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      wallet_address: '',
      label: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: defaultValues?.name ?? '',
        email: defaultValues?.email ?? '',
        wallet_address: defaultValues?.wallet_address ?? '',
        label: defaultValues?.label ?? '',
        notes: defaultValues?.notes ?? '',
      });
    }
  }, [open, defaultValues, reset]);

  const labelValue = watch('label');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update contact details.' : 'Save a new contact to your address book.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" placeholder="John Doe" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="john@example.com" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="wallet_address">Wallet Address</Label>
            <Input id="wallet_address" placeholder="0x..." className="font-mono text-sm" {...register('wallet_address')} />
            {errors.wallet_address && <p className="text-sm text-destructive">{errors.wallet_address.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Label</Label>
            <Select value={labelValue || ''} onValueChange={(v) => setValue('label', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="exchange">Exchange</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Optional notes..." rows={2} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
