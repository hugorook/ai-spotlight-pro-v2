import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";

const CleanAuthPage = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setEmail("");
    setPassword("");
  };

  const handleBackToHome = () => {
    window.location.href = '/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    
    setLoading(true);
    
    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        
        if (error) {
          console.error('Login error:', error);
          alert('Login failed: ' + error.message);
        } else {
          console.log('Login successful');
          window.location.href = '/dashboard';
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        
        if (error) {
          console.error('Signup error:', error);
          alert('Signup failed: ' + error.message);
        } else {
          console.log('Signup successful');
          alert('Account created! Please check your email to verify your account.');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 p-3 bg-gradient-ai rounded-lg w-fit text-white text-2xl">
              {isLoginMode ? '🔐' : '✨'}
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {isLoginMode ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLoginMode
                ? 'Sign in to your AI Spotlight Pro account'
                : 'Join AI Spotlight Pro to optimize your AI visibility'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Enter your password"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (isLoginMode ? 'Signing In…' : 'Creating Account…') : (isLoginMode ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">
              {isLoginMode ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button
              onClick={toggleMode}
              className="text-sm font-medium text-primary hover:underline"
            >
              {isLoginMode ? 'Create a new account' : 'Sign in to existing account'}
            </button>
          </div>
        </div>
      </div>

      <footer className="p-4 text-center text-xs text-muted-foreground border-t border-border">
        © 2024 AI Spotlight Pro. All rights reserved.
      </footer>
    </div>
  );
};

export default CleanAuthPage;