import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

const adminAuthSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AdminAuthFormData = z.infer<typeof adminAuthSchema>;

const AdminLogin = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const { user, signIn, signOut } = useAuth();
  const { isAdmin, isLoading: isRoleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<AdminAuthFormData>({
    resolver: zodResolver(adminAuthSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handle redirect for authenticated admin users
  useEffect(() => {
    if (user && !isRoleLoading) {
      if (isAdmin) {
        navigate('/admin');
      } else if (!isSubmitting) {
        // User is logged in but not an admin - show access denied
        setAccessDenied(true);
      }
    }
  }, [user, isAdmin, isRoleLoading, navigate, isSubmitting]);

  const onSubmit = async (data: AdminAuthFormData) => {
    setIsSubmitting(true);
    setAccessDenied(false);
    
    try {
      const { error } = await signIn(data.email, data.password);

      if (error) {
        let message = error.message;
        if (error.message.includes('Invalid login credentials')) {
          message = 'Invalid email or password.';
        }
        toast({
          variant: 'destructive',
          title: 'Authentication failed',
          description: message,
        });
        setIsSubmitting(false);
      }
      // If successful, useEffect will handle the redirect or access denied state
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  const handleSignOutAndRetry = async () => {
    await signOut();
    setAccessDenied(false);
    form.reset();
  };

  // Show loading while checking role
  if (user && isRoleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Subtle ambient effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-destructive/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card p-8 rounded-2xl border border-border/50">
          {/* Admin branding */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Admin Portal</h1>
          </div>

          {accessDenied ? (
            // Access denied state
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-4"
            >
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                <h2 className="text-lg font-medium text-destructive">Access Denied</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your account does not have admin privileges.
                </p>
              </div>
              <Button
                onClick={handleSignOutAndRetry}
                variant="outline"
                className="w-full"
              >
                Sign out and try again
              </Button>
            </motion.div>
          ) : (
            // Login form
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="admin@example.com"
                            className="pl-10 bg-secondary/50"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="pl-10 bg-secondary/50"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>
            </Form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
