import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface DeleteConfirmDialogProps {
  itemName?: string;
  itemType?: 'asset' | 'income' | 'expense' | 'debt';
  title?: string;
  description?: string;
  onConfirm: () => void;
  trigger?: React.ReactNode;
}

export function DeleteConfirmDialog({ 
  itemName, 
  itemType, 
  title,
  description,
  onConfirm,
  trigger,
}: DeleteConfirmDialogProps) {
  const dialogTitle = title || `Delete ${itemType}?`;
  const dialogDescription = description || `Are you sure you want to delete "${itemName}"? This action cannot be undone.`;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="glass-card border-destructive/20">
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {dialogDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
