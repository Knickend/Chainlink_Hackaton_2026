import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Crown, Calendar, AlertCircle, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionDialog } from '@/components/SubscriptionDialog';
import { getPlanByTier, SubscriptionTier } from '@/lib/subscription';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function SubscriptionSection() {
  const {
    tier,
    isLoading,
    isPro,
    isSubscribed,
    billingPeriod,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    upgradeTo,
    cancelSubscription,
    resumeSubscription,
  } = useSubscription();

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const currentPlan = getPlanByTier(tier);

  // Fallback plan info for free tier
  const planInfo = currentPlan || {
    name: 'Free',
    features: ['Up to 10 assets', 'Basic tracking', 'Community support'],
    monthlyPrice: 0,
    annualPrice: 0,
  };

  const getTierBadgeVariant = (t: SubscriptionTier) => {
    switch (t) {
      case 'pro':
        return 'default';
      case 'standard':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Subscription
            </CardTitle>
            <CardDescription>
              Manage your subscription plan and billing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Plan Card */}
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {isPro && <Crown className="w-6 h-6 text-yellow-500" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{planInfo.name}</h3>
                      <Badge variant={getTierBadgeVariant(tier)}>
                        {tier.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isSubscribed ? (
                        <>€{billingPeriod === 'monthly' ? planInfo.monthlyPrice : planInfo.annualPrice}/{billingPeriod === 'monthly' ? 'month' : 'year'}</>
                      ) : (
                        'Free forever'
                      )}
                    </p>
                  </div>
                </div>
                {cancelAtPeriodEnd && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Canceling
                  </Badge>
                )}
              </div>

              {/* Plan Features */}
              <div className="mt-4 space-y-2">
                {planInfo.features.slice(0, 3).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Billing Period */}
            {isSubscribed && currentPeriodEnd && (
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {cancelAtPeriodEnd ? 'Access Until' : 'Next Billing Date'}
                  </p>
                  <p className="text-foreground">{format(currentPeriodEnd, 'MMMM d, yyyy')}</p>
                  {cancelAtPeriodEnd && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Your plan will downgrade to Free after this date
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
              <Button onClick={() => setShowUpgradeDialog(true)}>
                {isSubscribed ? 'Change Plan' : 'Upgrade'}
              </Button>
              {isSubscribed && !cancelAtPeriodEnd && (
                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancel Subscription
                </Button>
              )}
              {cancelAtPeriodEnd && (
                <Button variant="outline" onClick={resumeSubscription}>
                  Resume Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upgrade Dialog */}
      <SubscriptionDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        onSubscribe={(newTier, period) => {
          upgradeTo(newTier, period || 'monthly');
          setShowUpgradeDialog(false);
        }}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of your current billing period
              {currentPeriodEnd && ` (${format(currentPeriodEnd, 'MMMM d, yyyy')})`}. 
              After that, you'll be downgraded to the Free plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                cancelSubscription();
                setShowCancelDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
