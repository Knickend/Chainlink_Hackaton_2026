import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, CreditCard, Shield, Zap, Loader2, Sparkles, Calculator, Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  SubscriptionTier, 
  BillingPeriod,
  SUBSCRIPTION_PLANS, 
  getFirstMonthPrice, 
  getMonthlyEquivalent,
  getAnnualSavings 
} from '@/lib/subscription';

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribe: (tier: SubscriptionTier) => void;
}

const tierIcons: Record<SubscriptionTier, typeof Crown> = {
  free: Zap,
  standard: Shield,
  pro: Crown,
};

export function SubscriptionDialog({ open, onOpenChange, onSubscribe }: SubscriptionDialogProps) {
  const [step, setStep] = useState<'pricing' | 'payment' | 'success'>('pricing');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('standard');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.tier === selectedTier);
  const isAnnual = billingPeriod === 'annual';

  const handlePayment = async () => {
    if (!cardNumber || !expiry || !cvc) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all card details',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setStep('success');
    
    // After showing success, close dialog and update state
    setTimeout(() => {
      onSubscribe(selectedTier);
      onOpenChange(false);
      setStep('pricing');
      setCardNumber('');
      setExpiry('');
      setCvc('');
      setBillingPeriod('monthly');
    }, 2000);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setStep('pricing');
      setSelectedTier('standard');
      setBillingPeriod('monthly');
    }
    onOpenChange(isOpen);
  };

  const getTodayTotal = () => {
    if (!selectedPlan) return 0;
    if (isAnnual) {
      return selectedPlan.annualPrice;
    }
    return getFirstMonthPrice(selectedPlan);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === 'pricing' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="w-5 h-5 text-primary" />
                Choose Your Plan
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Billing Toggle */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full">
                  <button
                    onClick={() => setBillingPeriod('monthly')}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                      !isAnnual
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingPeriod('annual')}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                      isAnnual
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Annual
                  </button>
                </div>
              </div>

              {/* Plan Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUBSCRIPTION_PLANS.map((plan, index) => {
                  const Icon = tierIcons[plan.tier];
                  const isSelected = selectedTier === plan.tier;
                  const displayPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;
                  const firstMonthPrice = getFirstMonthPrice(plan);
                  const monthlyEquivalent = getMonthlyEquivalent(plan);
                  
                  return (
                    <motion.button
                      key={plan.tier}
                      type="button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedTier(plan.tier)}
                      className={cn(
                        "relative p-4 rounded-xl border-2 text-left transition-all",
                        isSelected 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50",
                        plan.isPopular && "ring-2 ring-primary/20"
                      )}
                    >
                      {plan.isPopular && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground rounded-full">
                            POPULAR
                          </span>
                        </div>
                      )}

                      {/* Discount badge */}
                      <div className="absolute -top-2.5 right-2">
                        <Badge 
                          variant="secondary" 
                          className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] font-semibold px-1.5"
                        >
                          {isAnnual ? '2 MO FREE' : '50% OFF'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2 pt-1">
                        <Icon className={cn(
                          "w-5 h-5",
                          plan.tier === 'pro' ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className="font-semibold">{plan.name}</span>
                      </div>
                      
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-2xl font-bold">€{displayPrice.toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground">
                          {isAnnual ? '/yr' : '/mo'}
                        </span>
                      </div>

                      {/* Sub-price info */}
                      <div className="text-xs text-muted-foreground mb-3">
                        {isAnnual ? (
                          <span>€{monthlyEquivalent.toFixed(2)}/mo</span>
                        ) : (
                          <span>First month: €{firstMonthPrice.toFixed(2)}</span>
                        )}
                      </div>
                      
                      <ul className="space-y-1.5">
                        {plan.features.slice(0, 4).map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <Check className={cn(
                              "w-3 h-3 mt-0.5 flex-shrink-0",
                              isSelected ? "text-primary" : "text-muted-foreground"
                            )} />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                        {plan.features.length > 4 && (
                          <li className="text-xs text-muted-foreground pl-5">
                            +{plan.features.length - 4} more
                          </li>
                        )}
                      </ul>
                      
                      {isSelected && (
                        <motion.div
                          layoutId="selected-indicator"
                          className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Pro Features Highlight */}
              {selectedTier === 'pro' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 rounded-lg bg-primary/5 border border-primary/20"
                >
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-primary" />
                    Pro Exclusive Features
                  </h4>
                  <ul className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <Calculator className="w-3 h-3 text-primary" />
                      Debt payoff calculator
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Target className="w-3 h-3 text-primary" />
                      Investment strategy
                    </li>
                  </ul>
                </motion.div>
              )}

              <Button
                onClick={() => setStep('payment')}
                className="w-full gap-2"
                size="lg"
              >
                <CreditCard className="w-4 h-4" />
                Continue with {selectedPlan?.name} {isAnnual ? 'Annual' : 'Monthly'}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Secure payment • Cancel anytime
              </p>
            </div>
          </>
        )}

        {step === 'payment' && selectedPlan && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Payment Summary */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedTier === 'pro' ? (
                      <Crown className="w-4 h-4 text-primary" />
                    ) : (
                      <Shield className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">
                      {selectedPlan.name} {isAnnual ? 'Annual' : 'Monthly'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-2 space-y-1 text-sm">
                  {isAnnual ? (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Annual plan (€{getMonthlyEquivalent(selectedPlan).toFixed(2)}/mo)</span>
                        <span>€{selectedPlan.annualPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Savings (2 months free)</span>
                        <span>-€{getAnnualSavings(selectedPlan).toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>First month (50% off)</span>
                        <span>€{getFirstMonthPrice(selectedPlan).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Then monthly</span>
                        <span>€{selectedPlan.monthlyPrice.toFixed(2)}/mo</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>Total today</span>
                  <span>€{getTodayTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="card">Card Number</Label>
                  <Input
                    id="card"
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvc">CVC</Label>
                    <Input
                      id="cvc"
                      placeholder="123"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      maxLength={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('pricing')}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Back
                </Button>
                <Button
                  onClick={handlePayment}
                  className="flex-1 gap-2"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Pay €{getTodayTotal().toFixed(2)}
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" />
                Your payment is secure and encrypted
              </p>
            </div>
          </>
        )}

        {step === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center space-y-4"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                Welcome to {selectedPlan?.name}!
              </h3>
              <p className="text-muted-foreground mt-1">
                Your subscription is now active
              </p>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
