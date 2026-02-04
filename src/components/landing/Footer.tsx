import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="py-12 px-4 border-t border-border/50"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">
              <span className="gradient-text">In</span>
              <span className="text-foreground">Control</span>
            </span>
            <span className="text-muted-foreground text-sm">.finance</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              to="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <a
              href="mailto:InControl.Finance@proton.me"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </a>
            <Link
              to="/api-docs"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              API Docs
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {currentYear} InControl. All rights reserved.
          </p>
        </div>
      </div>
    </motion.footer>
  );
}
