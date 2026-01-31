import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, Factor, AuthMFAEnrollResponse } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface MFAEnrollResult {
  qrCode: string;
  secret: string;
  factorId: string;
}

interface MFAStatus {
  enabled: boolean;
  factorId?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  // Password reset functions
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  // MFA functions
  enrollMFA: () => Promise<MFAEnrollResult | null>;
  verifyMFAEnrollment: (factorId: string, code: string) => Promise<{ error: Error | null }>;
  unenrollMFA: (factorId: string) => Promise<{ error: Error | null }>;
  verifyMFA: (factorId: string, code: string) => Promise<{ error: Error | null }>;
  getMFAStatus: () => Promise<MFAStatus>;
  mfaFactorId: string | null;
  requiresMFA: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check for MFA requirement after sign in
        if (event === 'SIGNED_IN' && session) {
          // Defer MFA check to avoid deadlock
          setTimeout(() => {
            checkMFARequirement();
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkMFARequirement = async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel === 'aal1' && data?.nextLevel === 'aal2') {
      // User has MFA enrolled but needs to verify
      const factors = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factors.data?.totp?.find(f => f.status === 'verified');
      if (verifiedFactor) {
        setMfaFactorId(verifiedFactor.id);
      }
    }
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      return { error };
    }

    // Send custom confirmation email via Resend
    if (data.user && !data.user.email_confirmed_at) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        
        // Note: Supabase sends its own confirmation email by default.
        // We call our custom edge function to send a branded email as well.
        // The confirmation link in the branded email uses Supabase's built-in verify endpoint.
        const { error: emailError } = await supabase.functions.invoke('send-confirmation-email', {
          body: {
            email,
            confirmationUrl: `${supabaseUrl}/auth/v1/verify?type=signup&redirect_to=${encodeURIComponent(redirectUrl)}`
          }
        });
        
        if (emailError) {
          console.error('Failed to send confirmation email:', emailError);
          // Don't return error - user is still created, they can use Supabase's default email
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
      }
    }
    
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { error };
    }
    
    // Check if MFA is required
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    
    if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
      // User has MFA enrolled, needs to verify
      const factors = await supabase.auth.mfa.listFactors();
      const totpFactor = factors.data?.totp?.find(f => f.status === 'verified');
      
      if (totpFactor) {
        setRequiresMFA(true);
        setMfaFactorId(totpFactor.id);
      }
    }
    
    return { error: null };
  };

  const signOut = async () => {
    setRequiresMFA(false);
    setMfaFactorId(null);
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?mode=reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  const enrollMFA = async (): Promise<MFAEnrollResult | null> => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App'
    });
    
    if (error || !data) {
      console.error('MFA enrollment error:', error);
      return null;
    }
    
    return {
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      factorId: data.id
    };
  };

  const verifyMFAEnrollment = async (factorId: string, code: string) => {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId
    });
    
    if (challengeError) {
      return { error: challengeError };
    }
    
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code
    });
    
    if (!error) {
      setMfaFactorId(factorId);
    }
    
    return { error };
  };

  const unenrollMFA = async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({
      factorId
    });
    
    if (!error) {
      setMfaFactorId(null);
    }
    
    return { error };
  };

  const verifyMFA = async (factorId: string, code: string) => {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId
    });
    
    if (challengeError) {
      return { error: challengeError };
    }
    
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code
    });
    
    if (!error) {
      setRequiresMFA(false);
    }
    
    return { error };
  };

  const getMFAStatus = async (): Promise<MFAStatus> => {
    const { data } = await supabase.auth.mfa.listFactors();
    const verifiedFactor = data?.totp?.find(f => f.status === 'verified');
    
    return {
      enabled: !!verifiedFactor,
      factorId: verifiedFactor?.id
    };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signUp, 
      signIn, 
      signOut,
      resetPassword,
      updatePassword,
      enrollMFA,
      verifyMFAEnrollment,
      unenrollMFA,
      verifyMFA,
      getMFAStatus,
      mfaFactorId,
      requiresMFA
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
