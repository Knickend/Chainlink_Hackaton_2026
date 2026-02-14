import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface AddressBookEntry {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  wallet_address: string | null;
  label: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type AddressBookInsert = Omit<AddressBookEntry, 'id' | 'created_at' | 'updated_at'>;
export type AddressBookUpdate = Partial<Omit<AddressBookEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export const useAddressBook = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['address_book', user?.id];

  const { data: contacts = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('address_book')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as AddressBookEntry[];
    },
    enabled: !!user,
  });

  const addContact = useMutation({
    mutationFn: async (contact: Omit<AddressBookInsert, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('address_book')
        .insert({ ...contact, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Contact added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add contact', description: error.message, variant: 'destructive' });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...updates }: AddressBookUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('address_book')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Contact updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update contact', description: error.message, variant: 'destructive' });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('address_book')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Contact deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete contact', description: error.message, variant: 'destructive' });
    },
  });

  return { contacts, isLoading, addContact, updateContact, deleteContact };
};
