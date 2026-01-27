import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AssetCategory } from '@/lib/types';

const assetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.enum(['banking', 'crypto', 'stocks', 'metals'] as const),
  value: z.number().min(0, 'Value must be positive'),
  quantity: z.number().optional(),
  symbol: z.string().max(10).optional(),
  yield: z.number().min(0).max(100).optional(),
  stakingRate: z.number().min(0).max(100).optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

interface AddAssetDialogProps {
  onAdd: (asset: AssetFormData) => void;
}

const categoryOptions: { value: AssetCategory; label: string }[] = [
  { value: 'banking', label: 'Banking' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'stocks', label: 'Stocks & ETFs' },
  { value: 'metals', label: 'Precious Metals' },
];

export function AddAssetDialog({ onAdd }: AddAssetDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: '',
      category: 'banking',
      value: 0,
      quantity: undefined,
      symbol: '',
      yield: undefined,
      stakingRate: undefined,
    },
  });

  const selectedCategory = form.watch('category');

  const onSubmit = (data: AssetFormData) => {
    onAdd(data);
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 glass-card border-primary/30 hover:border-primary/50">
          <Plus className="w-4 h-4" />
          Add Asset
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="gradient-text">Add New Asset</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Chase Savings" {...field} className="bg-secondary/50" />
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
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="10000"
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
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symbol (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., BTC, AAPL" {...field} className="bg-secondary/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCategory === 'crypto' && (
              <>
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.000001"
                          placeholder="0.5"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          className="bg-secondary/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stakingRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staking Yield (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="4.5"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          className="bg-secondary/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {(selectedCategory === 'banking' || selectedCategory === 'stocks') && (
              <FormField
                control={form.control}
                name="yield"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedCategory === 'banking' ? 'Interest Rate (%)' : 'Dividend Yield (%)'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="4.5"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        className="bg-secondary/50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedCategory === 'metals' && (
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity (oz)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="10"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        className="bg-secondary/50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedCategory === 'stocks' && (
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shares</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="100"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        className="bg-secondary/50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Add Asset
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
