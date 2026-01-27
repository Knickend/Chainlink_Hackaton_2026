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
import { Asset, AssetCategory } from '@/lib/types';

const assetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.enum(['banking', 'crypto', 'stocks', 'metals'] as const),
  value: z.number().min(0, 'Value must be positive'),
  quantity: z.number().optional(),
  symbol: z.string().optional(),
  yield: z.number().min(0).max(100).optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

interface EditAssetDialogProps {
  asset: Asset;
  onUpdate: (id: string, data: Partial<Omit<Asset, 'id'>>) => void;
}

const categories: { value: AssetCategory; label: string }[] = [
  { value: 'banking', label: 'Banking' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'stocks', label: 'Stocks' },
  { value: 'metals', label: 'Precious Metals' },
];

export function EditAssetDialog({ asset, onUpdate }: EditAssetDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: asset.name,
      category: asset.category,
      value: asset.value,
      quantity: asset.quantity,
      symbol: asset.symbol,
      yield: asset.yield,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: asset.name,
        category: asset.category,
        value: asset.value,
        quantity: asset.quantity,
        symbol: asset.symbol,
        yield: asset.yield,
      });
    }
  }, [open, asset, form]);

  const onSubmit = (data: AssetFormData) => {
    onUpdate(asset.id, data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Asset</DialogTitle>
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
                    <Input placeholder="e.g., Bitcoin Holdings" {...field} className="bg-secondary/50" />
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
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
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
                  <FormLabel>Current Value (USD)</FormLabel>
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
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symbol (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., BTC" {...field} className="bg-secondary/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="yield"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Yield % (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="5.0"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="bg-secondary/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Save Changes
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
