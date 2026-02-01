import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
            <em>Effective: February 1, 2026</em>
          </p>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground">
              InControl.finance ("we") protects your privacy. Standalone portfolio tracker - <strong className="text-foreground">NO financial data stored on servers</strong>.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">2. Data We Collect</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
              <li><strong className="text-foreground">Account Information:</strong> Email address for authentication</li>
              <li><strong className="text-foreground">Portfolio Data:</strong> Assets, debts, income, and expenses <strong className="text-foreground">you manually enter</strong></li>
              <li><strong className="text-foreground">Usage Data:</strong> How you interact with the service (pages visited, features used)</li>
              <li><strong className="text-foreground">Payment Information:</strong> Processed securely by Stripe; we don't store card details</li>
            </ul>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
              <p className="text-foreground font-medium">• <strong>NO</strong> integrations with financial APIs, banks, or exchanges</p>
              <p className="text-foreground font-medium">• Data stored <strong>LOCALLY</strong> in browser/device only</p>
              <p className="text-foreground font-medium">• We <strong>NEVER</strong> receive your financial account information</p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">3. How We Use Data (GDPR Art. 5)</h2>
            <p className="text-muted-foreground mb-2">
              Provide service, process payments, improve product.
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Legal basis:</strong> Contract (Art. 6(1)(b)), Legitimate interest (Art. 6(1)(f)).
            </p>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">4. Data Storage & Security</h2>
            <p className="text-muted-foreground">
              EU servers (Supabase). TLS encrypted. Local portfolio data.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">5. Third Parties</h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Privacy Policy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Supabase</TableCell>
                    <TableCell className="text-muted-foreground">Auth/DB</TableCell>
                    <TableCell>
                      <a 
                        href="https://supabase.com/privacy" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        supabase.com/privacy
                      </a>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Stripe</TableCell>
                    <TableCell className="text-muted-foreground">Payments</TableCell>
                    <TableCell>
                      <a 
                        href="https://stripe.com/privacy" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        stripe.com/privacy
                      </a>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">CoinGecko</TableCell>
                    <TableCell className="text-muted-foreground">Prices</TableCell>
                    <TableCell>
                      <a 
                        href="https://www.coingecko.com/en/privacy" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        coingecko.com/privacy
                      </a>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">6. Your GDPR Rights</h2>
            <p className="text-muted-foreground">
              Access, rectification, erasure, portability, object. Contact:{' '}
              <a 
                href="mailto:InControl.Finance@proton.me" 
                className="text-primary hover:underline"
              >
                InControl.Finance@proton.me
              </a>
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">7. Cookies</h2>
            <p className="text-muted-foreground">
              Essential only (no consent required). Analytics opt-out available.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">8. Retention</h2>
            <p className="text-muted-foreground">
              Account active: Indefinite. Deletion: 30 days permanent.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">9. Data Controller</h2>
            <p className="text-muted-foreground">
              InControl.finance OÜ, Estonia e-Business Register
            </p>
            <p className="text-muted-foreground mt-2">
              Contact:{' '}
              <a 
                href="mailto:InControl.Finance@proton.me" 
                className="text-primary hover:underline"
              >
                InControl.Finance@proton.me
              </a>
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">10. Changes</h2>
            <p className="text-muted-foreground">
              30 days email notice.
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
