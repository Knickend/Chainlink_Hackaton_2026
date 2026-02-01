import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { Footer } from '@/components/landing/Footer';
import { SalesChatBot } from '@/components/landing/SalesChatBot';
import { BetaBanner } from '@/components/landing/BetaBanner';
const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Beta Banner */}
      <BetaBanner />

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-8 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xl font-bold tracking-tight">
              <span className="gradient-text">In</span>
              <span className="text-foreground">Control</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/auth')}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/auth?signup=true')}
              className="hidden sm:inline-flex gold-glow font-medium"
            >
              Get Started
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Main content */}
      <main className="pt-24">
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
      </main>

      <Footer />

      <SalesChatBot />
    </div>
  );
};

export default Landing;
