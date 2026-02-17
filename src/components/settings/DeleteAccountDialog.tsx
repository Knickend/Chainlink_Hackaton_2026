import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, Loader2, Wallet } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentWallet } from '@/hooks/useAgentWallet';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function DeleteAccountDialog() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { status, sendUsdc, sendEth, isActing } = useAgentWallet();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'confirm' | 'drain' | 'deleting'>('confirm');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const hasBalance = status.connected && (
    (status.balance && Number(status.balance) > 0) ||
    (status.eth_balance && Number(status.eth_balance) > 0)
  );

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(destinationAddress);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setStep('deleting');
    try {
      const { data, error } = await supabase.functions.invoke('delete-account');
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Account Deleted', description: 'Your account has been permanently deleted.' });
      await signOut();
      navigate('/');
    } catch (err) {
      toast({
        title: 'Deletion Failed',
        description: err instanceof Error ? err.message : 'Failed to delete account',
        variant: 'destructive',
      });
      setStep('confirm');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDrainAndDelete = async () => {
    if (!isValidAddress) return;
    setIsDeleting(true);
    setStep('deleting');

    try {
      // Drain USDC first
      if (status.balance && Number(status.balance) > 0) {
        await sendUsdc(Number(status.balance), destinationAddress);
      }
      // Then drain ETH
      if (status.eth_balance && Number(status.eth_balance) > 0) {
        await sendEth(Number(status.eth_balance), destinationAddress);
      }

      // Now delete the account
      await handleDeleteAccount();
    } catch (err) {
      toast({
        title: 'Drain Failed',
        description: err instanceof Error ? err.message : 'Failed to drain wallet',
        variant: 'destructive',
      });
      setStep('drain');
      setIsDeleting(false);
    }
  };

  const handleProceed = () => {
    if (hasBalance) {
      setStep('drain');
    } else {
      handleDeleteAccount();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setStep('confirm');
      setDestinationAddress('');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full mt-4">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        {step === 'confirm' && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Delete Account
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>This action is <strong>permanent and irreversible</strong>. All your data will be deleted:</p>
                <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                  <li>Portfolio assets & transactions</li>
                  <li>Income, expenses & debts</li>
                  <li>Financial goals & snapshots</li>
                  <li>Agent wallet & action history</li>
                  <li>Chat memories & preferences</li>
                  <li>Subscription & profile data</li>
                </ul>
                {hasBalance && (
                  <div className="mt-3 p-3 rounded-lg border border-warning bg-warning/10">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Wallet className="w-4 h-4" />
                      You have funds in your wallet that must be transferred first
                    </div>
                    <div className="text-xs mt-1 text-muted-foreground">
                      USDC: ${status.balance} · ETH: {status.eth_balance}
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button variant="destructive" onClick={handleProceed}>
                {hasBalance ? 'Transfer Funds & Delete' : 'Delete My Account'}
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {step === 'drain' && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Transfer Wallet Funds
              </AlertDialogTitle>
              <AlertDialogDescription>
                Enter a wallet address to receive your remaining funds before account deletion.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-2">
              <div className="text-sm space-y-1">
                {Number(status.balance) > 0 && <p>USDC Balance: <strong>${status.balance}</strong></p>}
                {Number(status.eth_balance) > 0 && <p>ETH Balance: <strong>{status.eth_balance}</strong></p>}
              </div>
              <Input
                placeholder="0x... destination wallet address"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
              />
              {destinationAddress && !isValidAddress && (
                <p className="text-xs text-destructive">Invalid Ethereum address</p>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleDrainAndDelete}
                disabled={!isValidAddress || isActing || isDeleting}
              >
                {isActing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  'Drain & Delete'
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {step === 'deleting' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-destructive" />
            <p className="text-sm text-muted-foreground">Deleting your account...</p>
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
