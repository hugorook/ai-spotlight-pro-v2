import { Button } from "@/components/ui/button";
import { Brain, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/auth/UserMenu";

const Header = ({ onStartSetup }: { onStartSetup?: () => void }) => {
  const { user } = useAuth();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-ai rounded-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">AI Visibility Hub</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {user ? (
              <>
                <a href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </a>
                <a href="/analytics" className="text-muted-foreground hover:text-foreground transition-colors">
                  Analytics
                </a>
              </>
            ) : (
              <>
                <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </a>
                <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </a>
                <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </a>
              </>
            )}
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                  Dashboard
                </Button>
                <UserMenu />
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Button variant="ghost">Log In</Button>
                <Button variant="hero" onClick={onStartSetup}>
                  Start Free Trial
                </Button>
              </div>
            )}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;