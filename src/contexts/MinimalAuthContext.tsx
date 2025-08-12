import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error?: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error?: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const MinimalAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('MinimalAuthProvider: Setting up auth listener');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('MinimalAuthProvider: Initial session:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('MinimalAuthProvider: Auth state change:', event, !!session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      console.log('MinimalAuthProvider: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      console.log('MinimalAuthProvider: Signing up user');
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('MinimalAuthProvider: Sign up error:', error);
        alert('Sign up failed: ' + error.message);
      } else {
        console.log('MinimalAuthProvider: Sign up successful');
        alert('Sign up successful! Please check your email to confirm your account.');
      }
      
      return { error };
    } catch (error) {
      console.error('MinimalAuthProvider: Sign up caught error:', error);
      const err = error as Error;
      alert('Sign up failed: ' + err.message);
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('MinimalAuthProvider: Signing in user');
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('MinimalAuthProvider: Sign in error:', error);
        alert('Sign in failed: ' + error.message);
      } else {
        console.log('MinimalAuthProvider: Sign in successful');
      }
      
      return { error };
    } catch (error) {
      console.error('MinimalAuthProvider: Sign in caught error:', error);
      const err = error as Error;
      alert('Sign in failed: ' + err.message);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      console.log('MinimalAuthProvider: Signing out user');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('MinimalAuthProvider: Sign out error:', error);
        alert('Sign out failed: ' + error.message);
      } else {
        console.log('MinimalAuthProvider: Sign out successful');
      }
    } catch (error) {
      console.error('MinimalAuthProvider: Sign out caught error:', error);
      alert('Sign out failed: ' + (error as Error).message);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('MinimalAuthProvider: Resetting password for:', email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`,
      });
      
      if (error) {
        console.error('MinimalAuthProvider: Reset password error:', error);
        alert('Reset password failed: ' + error.message);
      } else {
        console.log('MinimalAuthProvider: Reset password email sent');
        alert('Reset password email sent! Please check your inbox.');
      }
      
      return { error };
    } catch (error) {
      console.error('MinimalAuthProvider: Reset password caught error:', error);
      const err = error as Error;
      alert('Reset password failed: ' + err.message);
      return { error: err };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  console.log('MinimalAuthProvider: Rendering with state:', { 
    hasUser: !!user, 
    loading, 
    userEmail: user?.email 
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};