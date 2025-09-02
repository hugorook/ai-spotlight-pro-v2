import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Brain, BarChart3, MessageSquare, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const TopNavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const getUserInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const navItems: NavItem[] = [
    { 
      path: "/geo", 
      label: "AI Health Check", 
      icon: <Brain className="w-4 h-4" />
    },
    { 
      path: "/dashboard", 
      label: "Results Dashboard", 
      icon: <BarChart3 className="w-4 h-4" />
    },
    { 
      path: "/prompts", 
      label: "Test Prompts", 
      icon: <MessageSquare className="w-4 h-4" />
    },
    { 
      path: "/content", 
      label: "Company Profile", 
      icon: <User className="w-4 h-4" />
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed top-0 left-0 right-0 z-[110] glass-strong backdrop-blur-xl top-nav-border">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left Side: Logo and Navigation */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg 
                className="w-6 h-6 text-[#5F209B]" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M12 2C7.037 2 3 6.037 3 11c0 2.05.68 3.936 1.827 5.451L12 22l7.173-5.549C20.32 14.936 21 13.05 21 11c0-4.963-4.037-9-9-9zm-3 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                <circle fill="white" cx="9" cy="9.5" r="0.5"/>
                <circle fill="white" cx="15" cy="9.5" r="0.5"/>
              </svg>
            </div>
            <span className="h3">
              Ghost AI
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "nav-button nav-text flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive(item.path)
                    ? "bg-[#E7F0F6] text-foreground"
                    : "text-foreground hover:text-white hover:bg-[#5F209B]"
                )}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right Side: Profile Circle */}
        <div className="flex items-center">
          {user && (
            <button
              onClick={() => navigate('/settings')}
              className="w-8 h-8 rounded-full bg-[#E7F0F6] hover:bg-[#5F209B] text-foreground hover:text-white flex items-center justify-center text-sm font-medium transition-colors"
              title="Settings"
            >
              {getUserInitials(user.email || 'User')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopNavBar;