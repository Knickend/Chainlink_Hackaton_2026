import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, Users, Mail, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddressBook, type AddressBookEntry } from '@/hooks/useAddressBook';
import { AddContactDialog, type ContactFormValues } from './AddContactDialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';

export const AddressBookSection = () => {
  const { contacts, isLoading, addContact, updateContact, deleteContact } = useAddressBook();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<AddressBookEntry | null>(null);

  const filtered = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.wallet_address?.toLowerCase().includes(q) ||
        c.label?.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const handleSubmit = (values: ContactFormValues) => {
    const payload = {
      name: values.name,
      email: values.email || null,
      wallet_address: values.wallet_address || null,
      label: values.label || null,
      notes: values.notes || null,
    };

    if (editingContact) {
      updateContact.mutate(
        { id: editingContact.id, ...payload },
        { onSuccess: () => { setDialogOpen(false); setEditingContact(null); } }
      );
    } else {
      addContact.mutate(payload, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const openEdit = (contact: AddressBookEntry) => {
    setEditingContact(contact);
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingContact(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader><CardTitle>Contacts</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Contacts
          </CardTitle>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add Contact
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {contacts.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {contacts.length === 0 ? (
                <>
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No contacts yet</p>
                  <p className="text-sm">Add people or companies to your address book.</p>
                </>
              ) : (
                <p>No contacts match your search.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((contact, i) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-accent/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{contact.name}</span>
                      {contact.label && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {contact.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                      {contact.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {contact.email}
                        </span>
                      )}
                      {contact.wallet_address && (
                        <span className="flex items-center gap-1 font-mono text-xs">
                          <Wallet className="w-3 h-3" />
                          {contact.wallet_address.slice(0, 6)}...{contact.wallet_address.slice(-4)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(contact)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <DeleteConfirmDialog
                      title="Delete Contact"
                      description={`Are you sure you want to delete "${contact.name}"? This cannot be undone.`}
                      onConfirm={() => deleteContact.mutate(contact.id)}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      }
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddContactDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingContact(null); }}
        onSubmit={handleSubmit}
        isSubmitting={addContact.isPending || updateContact.isPending}
        defaultValues={editingContact ?? undefined}
      />
    </>
  );
};
