import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TwoFactorSetup } from '@/components/security/TwoFactorSetup';

export function SecuritySection() {
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Manage your account security and authentication methods
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Two-Factor Authentication */}
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTwoFactorSetup(true)}
                  >
                    Enable 2FA
                  </Button>
                </div>
              </div>
            </div>

            {/* Additional security info */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Your account is protected with industry-standard encryption. 
                We recommend enabling two-factor authentication for additional security.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two-Factor Setup Dialog */}
      <TwoFactorSetup
        open={showTwoFactorSetup}
        onOpenChange={setShowTwoFactorSetup}
        onSuccess={() => setShowTwoFactorSetup(false)}
      />
    </>
  );
}
