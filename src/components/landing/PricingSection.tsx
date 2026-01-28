import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    features: [
      'Up to 10 assets',
      'Basic price tracking',
      'Portfolio overview',
      'Demo mode access',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Standard',
    price: 4.99,
    description: 'For serious wealth builders',
    features: [
      'Unlimited asset tracking',
      'Real-time price updates',
      'Income & expense tracking',
      'Asset allocation charts',
      'Email support',
    ],
    cta: 'Start Standard',
    popular: false,
  },
  {
    name: 'Pro',
    price: 9.99,
    description: 'Maximum control over your wealth',
    features: [
      'Everything in Standard',
      'Monthly performance tracking',
      'YTD overview & analytics',
      'One-time expense tracking',
      'Debt payoff calculator',
      'Investment strategy advisor',
      'Priority support',
      'Early access to features',
    ],
    cta: 'Go Pro',
    popular: true,
  },
];

export function PricingSection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 px-4" id="pricing">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Simple, Transparent{' '}
            <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                'glass-card rounded-2xl p-6 lg:p-8 border relative',
                plan.popular
                  ? 'border-primary gold-glow'
                  : 'border-border/50'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">
                  ${plan.price}
                </span>
                {plan.price > 0 && (
                  <span className="text-muted-foreground">/month</span>
                )}
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
                variant={plan.popular ? 'default' : 'outline'}
                className={cn('w-full', plan.popular && 'gold-glow')}
                onClick={() => navigate('/auth?signup=true')}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Money-back guarantee */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          30-day money-back guarantee • Cancel anytime • No hidden fees
        </motion.p>
      </div>
    </section>
  );
}
