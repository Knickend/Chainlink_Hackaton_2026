import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  SUBSCRIPTION_PLANS, 
  BillingPeriod, 
  getFirstMonthPrice, 
  getMonthlyEquivalent 
} from '@/lib/subscription';

const freePlan = {
  name: 'Free',
  description: 'Perfect for getting started',
  features: [
    'Up to 10 assets',
    'Basic price tracking',
    'Portfolio overview',
    'Demo mode access',
  ],
  cta: 'Get Started',
};

export function PricingSection() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  const isAnnual = billingPeriod === 'annual';

  return (
    <section className="py-24 px-4" id="pricing">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Simple, Transparent{' '}
            <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
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
                "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                isAnnual
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Save 17%
              </Badge>
            </button>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-card rounded-2xl p-6 lg:p-8 border border-border/50 relative"
          >
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-1">{freePlan.name}</h3>
              <p className="text-sm text-muted-foreground">{freePlan.description}</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold">€0</span>
            </div>

            <ul className="space-y-3 mb-8">
              {freePlan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/auth?signup=true')}
            >
              {freePlan.cta}
            </Button>
          </motion.div>

          {/* Paid Plans */}
          {SUBSCRIPTION_PLANS.map((plan, index) => {
            const displayPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            const monthlyEquivalent = getMonthlyEquivalent(plan);
            const firstMonthPrice = getFirstMonthPrice(plan);

            return (
              <motion.div
                key={plan.tier}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (index + 1) * 0.1 }}
                className={cn(
                  'glass-card rounded-2xl p-6 lg:p-8 border relative',
                  plan.isPopular
                    ? 'border-primary gold-glow'
                    : 'border-border/50'
                )}
              >
                {/* Popular badge */}
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Discount badge */}
                <div className="absolute -top-3 right-4">
                  <Badge 
                    variant="secondary" 
                    className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-semibold"
                  >
                    {isAnnual ? '2 MONTHS FREE' : '50% OFF 1ST MONTH'}
                  </Badge>
                </div>

                <div className="mb-6 pt-2">
                  <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.tier === 'standard' ? 'For serious wealth builders' : 'Maximum control over your wealth'}
                  </p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    €{displayPrice.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">
                    {isAnnual ? '/year' : '/mo'}
                  </span>
                  
                  {/* Sub-price info */}
                  <div className="mt-1 text-sm text-muted-foreground">
                    {isAnnual ? (
                      <span>€{monthlyEquivalent.toFixed(2)}/mo</span>
                    ) : (
                      <span>First month: €{firstMonthPrice.toFixed(2)}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.isPopular ? 'default' : 'outline'}
                  className={cn('w-full', plan.isPopular && 'gold-glow')}
                  onClick={() => navigate('/auth?signup=true')}
                >
                  {plan.tier === 'standard' ? 'Start Standard' : 'Go Pro'}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Footer text */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          Cancel anytime • No hidden fees
        </motion.p>
      </div>
    </section>
  );
}
