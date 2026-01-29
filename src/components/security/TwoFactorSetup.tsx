import { useState } from 'react';
import { Loader2, Shield, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'intro' | 'qr' | 'verify' | 'success';

export function TwoFactorSetup({ open, onOpenChange, onSuccess }: TwoFactorSetupProps) {
  const [step, setStep] = useState<Step>('intro');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { enrollMFA, verifyMFAEnrollment } = useAuth();
  const { toast } = useToast();

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const result = await enrollMFA();
      if (result) {
        setQrCode(result.qrCode);
        setSecret(result.secret);
        setFactorId(result.factorId);
        setStep('qr');
      } else {
        toast({
          variant: 'destructive',
          title: 'Setup failed',
          description: 'Could not start 2FA enrollment. Please try again.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    
    setIsLoading(true);
    try {
      const { error } = await verifyMFAEnrollment(factorId, code);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Verification failed',
          description: 'Invalid code. Please try again.',
        });
        setCode('');
      } else {
        setStep('success');
        toast({
          title: '2FA Enabled!',
          description: 'Two-factor authentication is now active on your account.',
        });
        onSuccess?.();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStep('intro');
    setCode('');
    setQrCode('');
    setSecret('');
    setFactorId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {step === 'success' ? '2FA Enabled!' : 'Enable Two-Factor Authentication'}
          </DialogTitle>
          <DialogDescription>
            {step === 'intro' && 'Add an extra layer of security to your account.'}
            {step === 'qr' && 'Scan this QR code with your authenticator app.'}
            {step === 'verify' && 'Enter the 6-digit code from your authenticator app.'}
            {step === 'success' && 'Your account is now protected with 2FA.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step === 'intro' && (
            <>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Two-factor authentication adds an extra layer of security by requiring a code from your phone in addition to your password.</p>
                <p>You'll need an authenticator app like:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Google Authenticator</li>
                  <li>Authy</li>
                  <li>1Password</li>
                </ul>
              </div>
              <Button onClick={handleStart} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Get Started'
                )}
              </Button>
            </>
          )}

          {step === 'qr' && (
            <>
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <img src={qrCode} alt="QR Code for authenticator app" className="w-48 h-48" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Can't scan? Enter this code manually:
                </p>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <code className="flex-1 text-xs font-mono break-all">{secret}</code>
                  <Button variant="ghost" size="icon" onClick={copySecret}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button onClick={() => setStep('verify')} className="w-full">
                I've scanned the code
              </Button>
            </>
          )}

          {step === 'verify' && (
            <>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  onComplete={handleVerify}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('qr')} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleVerify} 
                  disabled={code.length !== 6 || isLoading} 
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 'success' && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-success" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                From now on, you'll need to enter a code from your authenticator app when signing in.
              </p>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
