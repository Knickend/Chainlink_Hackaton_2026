import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, Loader2, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TwoFactorSetup } from './TwoFactorSetup';

export function SecuritySettings() {
  const [open, setOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisabling, setIsDisabling] = useState(false);
  
  const { getMFAStatus, unenrollMFA } = useAuth();
  const { toast } = useToast();

  const checkMFAStatus = async () => {
    setIsLoading(true);
    try {
      const status = await getMFAStatus();
      setMfaEnabled(status.enabled);
      setFactorId(status.factorId || null);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      checkMFAStatus();
    }
  }, [open]);

  const handleToggle = async () => {
    if (mfaEnabled && factorId) {
      // Disable 2FA
      setIsDisabling(true);
      try {
        const { error } = await unenrollMFA(factorId);
        if (error) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not disable 2FA. Please try again.',
          });
        } else {
          setMfaEnabled(false);
          setFactorId(null);
          toast({
            title: '2FA Disabled',
            description: 'Two-factor authentication has been disabled.',
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'An unexpected error occurred.',
        });
      } finally {
        setIsDisabling(false);
      }
    } else {
      // Enable 2FA - open setup dialog
      setSetupOpen(true);
    }
  };

  const handleSetupSuccess = () => {
    setMfaEnabled(true);
    checkMFAStatus();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2" title="Security settings">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Security Settings
            </DialogTitle>
            <DialogDescription>
              Manage your account security options
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center gap-3">
                  {mfaEnabled ? (
                    <ShieldCheck className="w-5 h-5 text-success" />
                  ) : (
                    <ShieldOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <Label htmlFor="mfa-toggle" className="text-sm font-medium">
                      Two-Factor Authentication
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {mfaEnabled 
                        ? 'Your account is protected with 2FA' 
                        : 'Add an extra layer of security'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="mfa-toggle"
                  checked={mfaEnabled}
                  onCheckedChange={handleToggle}
                  disabled={isDisabling}
                />
              </div>
            )}

            {mfaEnabled && (
              <div className="p-4 rounded-lg border border-success/20 bg-success/5">
                <div className="flex items-center gap-2 text-success mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-sm font-medium">2FA is Active</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You'll be asked for a verification code from your authenticator app when signing in.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TwoFactorSetup
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onSuccess={handleSetupSuccess}
      />
    </>
  );
}
