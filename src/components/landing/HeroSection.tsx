import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 pt-16 overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-primary/5 border border-primary/30 backdrop-blur-sm shadow-sm mb-8">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
            <span className="text-sm text-primary/90 font-medium tracking-wide">Track All Your Assets in One Place</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="text-foreground">Take Control of Your</span>
            <br />
            <span className="gradient-text">Financial Future</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Track assets, manage debt, and build wealth across crypto, stocks, ETFs, 
            commodities, and precious metals — all in one beautiful dashboard.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate('/auth?signup=true')}
              className="gap-2 px-8 py-6 text-lg gold-glow"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/app')}
              className="gap-2 px-8 py-6 text-lg"
            >
              <Play className="w-5 h-5" />
              View Demo
            </Button>
          </div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full" />
              Free tier available
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full" />
              SOC 2 Type II compliant
            </div>
          </motion.div>
        </motion.div>

        {/* Dashboard preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-16 relative"
        >
          <div className="glass-card rounded-2xl p-4 border border-border/50 shadow-2xl">
            <div className="bg-secondary/50 rounded-xl p-6 aspect-video flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-bold gradient-text mb-2">$247,850</div>
                <p className="text-muted-foreground">Total Net Worth</p>
                <div className="mt-4 flex justify-center gap-4 text-sm">
                  <span className="text-success">+14.5% this month</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">5 asset categories</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating accent elements */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
        </motion.div>
      </div>
    </section>
  );
}
