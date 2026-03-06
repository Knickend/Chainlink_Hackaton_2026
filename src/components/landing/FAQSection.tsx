import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'What assets can I track with InControl?',
    answer:
      'You can track a wide variety of assets including cash accounts, stablecoins, real estate properties, cryptocurrencies (Bitcoin, Ethereum, and 50+ others), stocks, bonds, ETFs, precious metals (gold, silver), and other commodities—all in one unified dashboard.',
  },
  {
    question: 'Is my financial data secure?',
    answer:
      'Absolutely. Your data is encrypted and hosted on SOC 2 Type II compliant infrastructure. We never share your information with third parties, and you maintain complete control over your financial data at all times.',
  },
  {
    question: 'Can I try InControl before subscribing?',
    answer:
      'Yes! We offer a free tier that lets you explore the platform with limited features. You can also use our demo mode to see how InControl works with sample data before committing to a subscription.',
  },
  {
    question: 'How do the live price updates work?',
    answer:
      'We fetch real-time prices for 50+ cryptocurrencies, major stocks, bonds, ETFs, gold, silver, and other commodities. Prices are updated automatically so your portfolio value always reflects current market conditions.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer:
      'Yes, you can cancel your subscription at any time with no hidden fees or long-term commitments. Your access continues until the end of your current billing period.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards through our secure payment processing system. Your payment information is handled securely and never stored on our servers.',
  },
  {
    question: 'What is the Agentic Wallet?',
    answer:
      'The Agentic Wallet is a Pro feature that connects an on-chain wallet on Base to your dashboard. It enables DeFi skills like sending USDC, trading tokens, and funding your wallet — all executed directly from InControl without switching apps.',
  },
  {
    question: 'Can AI agents access InControl data?',
    answer:
      'Yes. InControl exposes financial data APIs via the x402 protocol, allowing autonomous AI agents to pay per request using USDC on Base. Agents can discover available tools through our MCP server and access portfolio summaries, price feeds, and more — all with confidential compute and on-chain verification via Chainlink CRE.',
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

export function FAQSection() {
  return (
    <section className="py-24 px-4" id="faq">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Frequently Asked{' '}
            <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about InControl and managing your wealth.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div key={index} variants={itemVariants}>
                <AccordionItem
                  value={`item-${index}`}
                  className="glass-card rounded-xl px-6 border-border/50 hover:border-primary/30 transition-colors duration-300"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-5 text-base font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
