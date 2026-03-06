import { motion } from 'framer-motion';
import { Wallet, TrendingUp, PieChart, CreditCard, Brain, Shield, Bot, RefreshCcw, Zap } from 'lucide-react';

const features = [
  {
    icon: Wallet,
    title: 'Multi-Asset Tracking',
    description: 'Track crypto, stocks, real estate, and precious metals in one unified dashboard.',
  },
  {
    icon: TrendingUp,
    title: 'Live Price Updates',
    description: 'Real-time prices for 50+ cryptocurrencies, stocks, gold, and silver.',
  },
  {
    icon: PieChart,
    title: 'Portfolio Allocation',
    description: 'Visual breakdown of your wealth distribution with interactive charts.',
  },
  {
    icon: Bot,
    title: 'Agentic Wallet',
    description: 'Connect an on-chain wallet to execute DeFi operations — send USDC, trade tokens, and manage funds directly from your dashboard on Base.',
  },
  {
    icon: RefreshCcw,
    title: 'Automated DCA',
    description: 'Set up dollar-cost averaging strategies powered by Chainlink CRE. Automated, consensus-verified trade execution on a schedule you define.',
  },
  {
    icon: Zap,
    title: 'x402 Agent APIs',
    description: 'Expose your financial data to autonomous AI agents via x402-monetized APIs. Pay-per-request access with confidential compute and on-chain verification.',
  },
  {
    icon: CreditCard,
    title: 'Debt Management',
    description: 'Track debts and calculate optimal payoff strategies with our smart tools.',
  },
  {
    icon: Brain,
    title: 'AI Financial Advisor',
    description: 'AI-powered allocation recommendations and financial insights based on your goals and portfolio.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data is encrypted and hosted on SOC 2 Type II compliant infrastructure. Never shared with third parties.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function FeaturesSection() {
  return (
    <section className="py-24 px-4" id="features">
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
            Everything You Need to{' '}
            <span className="gradient-text">Build Wealth</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful tools designed to help you track, analyze, and grow your portfolio
            across all asset classes.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="glass-card rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
