import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Brain, BarChart3, Activity, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    { 
      path: "/dashboard", 
      label: "Dashboard", 
      subtitle: "Overview & metrics",
      icon: <BarChart3 className="w-5 h-5" />
    },
    { 
      path: "/geo", 
      label: "AI Health Check", 
      subtitle: "Test your visibility",
      icon: <Activity className="w-5 h-5" />
    },
    { 
      path: "/content", 
      label: "Content Assistant", 
      subtitle: "Generate content",
      icon: <FileText className="w-5 h-5" />
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-64 h-screen bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-ai rounded-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-foreground">AI Visibility Hub</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                isActive(item.path)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {item.icon}
              <div>
                <div className="font-medium">{item.label}</div>
                <div className={cn(
                  "text-xs",
                  isActive(item.path) 
                    ? "text-primary-foreground/70" 
                    : "text-muted-foreground"
                )}>
                  {item.subtitle}
                </div>
              </div>
            </button>
          ))}
        </div>
      </nav>

      {/* Settings at bottom */}
      <div className="p-4 border-t border-border">
        <button
          onClick={() => navigate("/settings")}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
            isActive("/settings")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Settings className="w-5 h-5" />
          <div>
            <div className="font-medium">Settings</div>
            <div className={cn(
              "text-xs",
              isActive("/settings") 
                ? "text-primary-foreground/70" 
                : "text-muted-foreground"
            )}>
              Account & preferences
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;