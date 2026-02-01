import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Loader2, ExternalLink, Scale } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface TermsAgreementDialogProps {
  open: boolean;
  onAccept: () => Promise<void>;
}

export function TermsAgreementDialog({ open, onAccept }: TermsAgreementDialogProps) {
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!agreed) return;
    
    setIsSubmitting(true);
    try {
      await onAccept();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-lg sm:rounded-xl border-border/50 bg-background/95 backdrop-blur-xl">
        <AlertDialogHeader className="space-y-4">
          <div className="flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <Scale className="w-7 h-7 text-primary" />
            </motion.div>
          </div>
          
          <AlertDialogTitle className="text-xl font-semibold text-center">
            Terms of Service Agreement
          </AlertDialogTitle>
          
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                Before you continue, please review and accept our terms.
              </p>
              
              {/* Important Disclaimer */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-lg border border-warning/30 bg-warning/10 p-4"
              >
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-warning">Not Financial Advice</p>
                    <p className="text-sm text-muted-foreground">
                      InControl is a personal finance tracking tool. It does not provide financial, 
                      investment, tax, or legal advice. Always consult qualified professionals before 
                      making financial decisions.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Links to full terms */}
              <div className="flex flex-col sm:flex-row gap-2 justify-center text-sm">
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  Terms of Service
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <span className="hidden sm:inline text-muted-foreground">•</span>
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  Privacy Policy
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Checkbox Agreement */}
        <div className="flex items-start gap-3 py-4 border-t border-border/50">
          <Checkbox
            id="terms-agreement"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            disabled={isSubmitting}
            className="mt-0.5"
          />
          <Label 
            htmlFor="terms-agreement" 
            className="text-sm leading-relaxed cursor-pointer"
          >
            I have read and agree to the{' '}
            <span className="text-primary font-medium">Terms of Service</span> and{' '}
            <span className="text-primary font-medium">Privacy Policy</span>
          </Label>
        </div>

        <AlertDialogFooter>
          <Button
            onClick={handleAccept}
            disabled={!agreed || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept & Continue'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
