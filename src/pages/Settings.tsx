import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { SubscriptionSection } from '@/components/settings/SubscriptionSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { ThemeToggle } from '@/components/ThemeToggle';

const Settings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient glow effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-glow-pulse" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/app')}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground text-sm">
                Manage your account and preferences
              </p>
            </div>
          </div>
          <ThemeToggle />
        </motion.header>

        {/* Settings Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <ProfileSection />
            </TabsContent>

            <TabsContent value="subscription" className="space-y-6">
              <SubscriptionSection />
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <SecuritySection />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
