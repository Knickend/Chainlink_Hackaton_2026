import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">
              <span className="gradient-text">In</span>
              <span className="text-foreground">Control</span>
            </span>
            <span className="text-muted-foreground text-sm">.finance</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none"
        >
          <h1 className="text-3xl font-bold mb-2">Terms of Service - InControl.finance</h1>
          <p className="text-muted-foreground mb-8">
            <em>Effective: January 30, 2026</em>
          </p>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing InControl.finance ("Service"), you agree to these Terms.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">2. Service Description</h2>
            <p className="text-muted-foreground">
              InControl.finance provides portfolio tracking tools for personal use.
            </p>
          </section>

          {/* Section 3 - Critical Disclaimer */}
          <section className="mb-8">
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="text-lg font-bold">
                3. NOT FINANCIAL ADVICE - CRITICAL DISCLAIMER
              </AlertTitle>
              <AlertDescription className="mt-3 space-y-3 text-sm">
                <p className="font-semibold text-foreground">
                  InControl.finance IS NOT a financial advisor or investment recommendation service:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Tracks data from third-party APIs (exchanges, price feeds)</li>
                  <li><strong className="text-foreground">Does NOT provide investment advice or recommendations</strong></li>
                  <li><strong className="text-foreground">Past performance does not predict future results</strong></li>
                  <li><strong className="text-foreground">All investment decisions are YOUR responsibility</strong></li>
                  <li><strong className="text-foreground">Consult licensed financial professionals for advice</strong></li>
                </ul>
              </AlertDescription>
            </Alert>
          </section>

          {/* Section 4 - Limitation of Liability */}
          <section className="mb-8">
            <Alert className="border-border bg-muted/50">
              <Shield className="h-5 w-5" />
              <AlertTitle className="text-lg font-bold">
                4. Limitation of Liability (Maximum Protection)
              </AlertTitle>
              <AlertDescription className="mt-3 space-y-3 text-sm">
                <p className="font-semibold text-foreground">
                  To the fullest extent permitted by EU law:
                </p>
                <p className="text-muted-foreground">
                  InControl.finance, its owners, and affiliates are <strong className="text-foreground">NOT liable</strong> for:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Any financial losses or investment decisions</li>
                  <li>Inaccurate data from third-party APIs</li>
                  <li>Service interruptions or downtime</li>
                  <li>Indirect, consequential, or punitive damages</li>
                </ul>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Maximum liability capped at:</strong> Fees paid in preceding 12 months
                </p>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Non-excludable (EU consumer law):</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Death or personal injury from negligence</li>
                  <li>Fraud or willful misconduct</li>
                </ul>
              </AlertDescription>
            </Alert>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">5. Subscriptions & Payments</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Standard:</strong> €4.99/month (Stripe processed)</li>
              <li><strong className="text-foreground">Pro:</strong> €9.99/month (Stripe processed)</li>
              <li>Cancel anytime via Stripe Customer Portal</li>
              <li>No refunds for digital subscriptions</li>
              <li>EU VAT included where applicable</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">6. User Obligations</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Provide accurate information</li>
              <li>Comply with all applicable laws</li>
              <li>No reverse engineering or scraping</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">7. Account Termination</h2>
            <p className="text-muted-foreground">
              We may suspend/terminate for violations. You may cancel anytime.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">8. Data Accuracy</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Price data from third-party APIs "as-is"</li>
              <li>No guarantee of real-time accuracy</li>
              <li>Users verify critical financial data</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">9. Governing Law</h2>
            <p className="text-muted-foreground">
              Republic of Estonia. Harju County Court has exclusive jurisdiction.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">10. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update Terms with 30 days email notice.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">11. Contact</h2>
            <p className="text-muted-foreground">
              <a 
                href="mailto:InControl.Finance@proton.me" 
                className="text-primary hover:underline"
              >
                InControl.Finance@proton.me
              </a>
            </p>
          </section>
        </motion.article>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} InControl. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
