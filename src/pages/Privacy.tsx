import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Privacy() {
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
          <h1 className="text-3xl font-bold mb-2">Privacy Policy - InControl.finance</h1>
          <p className="text-muted-foreground mb-8">
            <em>Effective: January 30, 2026</em>
          </p>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground">
              InControl.finance ("we", "our", "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, and safeguard your information 
              when you use our portfolio tracking service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">2. Data We Collect</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Account Information:</strong> Email address for authentication</li>
              <li><strong className="text-foreground">Portfolio Data:</strong> Assets, debts, income, and expenses you enter</li>
              <li><strong className="text-foreground">Usage Data:</strong> How you interact with the service (pages visited, features used)</li>
              <li><strong className="text-foreground">Payment Information:</strong> Processed securely by Stripe; we don't store card details</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Provide and maintain the portfolio tracking service</li>
              <li>Process subscription payments</li>
              <li>Send essential service communications</li>
              <li>Improve our service based on usage patterns</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">4. Data Storage & Security</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Data stored securely on EU-based servers</li>
              <li>Encrypted in transit (TLS) and at rest</li>
              <li>Access restricted to essential personnel only</li>
              <li>Regular security audits and updates</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">5. Third-Party Services</h2>
            <p className="text-muted-foreground mb-3">
              We use the following third-party services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Supabase:</strong> Database and authentication</li>
              <li><strong className="text-foreground">Stripe:</strong> Payment processing</li>
              <li><strong className="text-foreground">Price APIs:</strong> Real-time asset pricing</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Each service has its own privacy policy governing their use of data.
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">6. Your Rights (GDPR)</h2>
            <p className="text-muted-foreground mb-3">
              Under the General Data Protection Regulation (GDPR), you have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Access:</strong> Request a copy of your personal data</li>
              <li><strong className="text-foreground">Rectification:</strong> Correct inaccurate data</li>
              <li><strong className="text-foreground">Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong className="text-foreground">Portability:</strong> Receive your data in a portable format</li>
              <li><strong className="text-foreground">Object:</strong> Object to certain types of processing</li>
              <li><strong className="text-foreground">Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              To exercise these rights, contact us at the email below.
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">7. Cookies</h2>
            <p className="text-muted-foreground">
              We use essential cookies for authentication and session management. 
              We do not use tracking or advertising cookies.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">8. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data for as long as your account is active. 
              Upon account deletion, your data is permanently removed within 30 days, 
              except where retention is required by law.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy. We will notify you of significant changes 
              via email at least 30 days before they take effect.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
            <p className="text-muted-foreground">
              For privacy-related inquiries, contact us at:{' '}
              <a 
                href="mailto:InControl.Finance@proton.me" 
                className="text-primary hover:underline"
              >
                InControl.Finance@proton.me
              </a>
            </p>
          </section>

          {/* Data Controller */}
          <section className="mb-8 p-4 rounded-lg bg-muted/50 border border-border">
            <h2 className="text-lg font-semibold mb-2">Data Controller</h2>
            <p className="text-muted-foreground text-sm">
              InControl.finance<br />
              Madrid, Spain<br />
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
