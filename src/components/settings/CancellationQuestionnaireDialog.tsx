import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CancellationReason, CancellationSubmission } from '@/hooks/useCancellationFeedback';

interface CancellationQuestionnaireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: string;
  currentPeriodEnd: Date | null;
  onSubmit: (data: CancellationSubmission) => Promise<void>;
  isSubmitting: boolean;
}

const CANCELLATION_REASONS: { value: CancellationReason; label: string }[] = [
  { value: 'price', label: 'Too expensive' },
  { value: 'features', label: 'Missing features I need' },
  { value: 'competitor', label: 'Found a better alternative' },
  { value: 'usage', label: 'Not using it enough' },
  { value: 'technical', label: 'Technical issues / bugs' },
  { value: 'support', label: 'Poor customer support' },
  { value: 'trial', label: 'Just trying it out' },
  { value: 'other', label: 'Other' },
];

export function CancellationQuestionnaireDialog({
  open,
  onOpenChange,
  currentTier,
  currentPeriodEnd,
  onSubmit,
  isSubmitting,
}: CancellationQuestionnaireDialogProps) {
  const [step, setStep] = useState(1);
  const [primaryReason, setPrimaryReason] = useState<CancellationReason | ''>('');
  const [additionalFeedback, setAdditionalFeedback] = useState('');
  const [wouldReturn, setWouldReturn] = useState<'yes' | 'maybe' | 'no' | ''>('');

  const handleClose = () => {
    // Reset state when closing
    setStep(1);
    setPrimaryReason('');
    setAdditionalFeedback('');
    setWouldReturn('');
    onOpenChange(false);
  };

  const handleContinue = () => {
    if (primaryReason) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!primaryReason) return;

    await onSubmit({
      previousTier: currentTier,
      primaryReason,
      additionalFeedback: additionalFeedback.trim() || undefined,
      wouldReturn: wouldReturn || undefined,
    });

    handleClose();
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Why are you leaving?</DialogTitle>
              <DialogDescription>
                Step 1 of 2 — We'd love to know how we can improve.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <RadioGroup
                value={primaryReason}
                onValueChange={(value) => setPrimaryReason(value as CancellationReason)}
                className="space-y-3"
              >
                {CANCELLATION_REASONS.map((reason) => (
                  <div key={reason.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={reason.value} id={reason.value} />
                    <Label 
                      htmlFor={reason.value} 
                      className="cursor-pointer font-normal"
                    >
                      {reason.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Keep Subscription
              </Button>
              <Button 
                onClick={handleContinue} 
                disabled={!primaryReason}
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Help us improve</DialogTitle>
              <DialogDescription>
                Step 2 of 2 — Your feedback helps us get better.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="feedback">Additional feedback (optional)</Label>
                <Textarea
                  id="feedback"
                  placeholder="What could we have done better?"
                  value={additionalFeedback}
                  onChange={(e) => setAdditionalFeedback(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label>Would you consider returning if we addressed your concerns?</Label>
                <RadioGroup
                  value={wouldReturn}
                  onValueChange={(value) => setWouldReturn(value as 'yes' | 'maybe' | 'no')}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="return-yes" />
                    <Label htmlFor="return-yes" className="cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="maybe" id="return-maybe" />
                    <Label htmlFor="return-maybe" className="cursor-pointer font-normal">
                      Maybe
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="return-no" />
                    <Label htmlFor="return-no" className="cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {currentPeriodEnd && (
                <p className="text-sm text-muted-foreground">
                  Your subscription will remain active until{' '}
                  <span className="font-medium text-foreground">
                    {formatDate(currentPeriodEnd)}
                  </span>
                  . After that, you'll be downgraded to the Free plan.
                </p>
              )}
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button 
                variant="destructive"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancel Subscription
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
