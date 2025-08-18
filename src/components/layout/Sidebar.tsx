import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Brain, BarChart3, Activity, User, Settings, MessageSquare } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems: NavItem[] = [
    { 
      path: "/geo", 
      label: "AI Health Check", 
      subtitle: "Test your visibility",
      icon: <Activity className="w-5 h-5" />
    },
    { 
      path: "/dashboard", 
      label: "Results Dashboard", 
      subtitle: "Overview & metrics",
      icon: <BarChart3 className="w-5 h-5" />
    },
    { 
      path: "/prompts", 
      label: "Test Prompts", 
      subtitle: "Manage search queries",
      icon: <MessageSquare className="w-5 h-5" />
    },
    { 
      path: "/content", 
      label: "Company Profile", 
      subtitle: "Edit company info",
      icon: <User className="w-5 h-5" />
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div 
      className={cn(
        "fixed left-0 top-0 h-screen z-50 transition-all duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="h-full glass-strong backdrop-blur-xl border-r border-white/20 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#111E63] rounded-lg">
              <svg 
                className="w-6 h-6 text-white" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M12 2C10.89 2 10 2.89 10 4V6C8.89 6 8 6.89 8 8V14C8 15.11 8.89 16 10 16H14C15.11 16 16 15.11 16 14V8C16 6.89 15.11 6 14 6V4C14 2.89 13.11 2 12 2ZM12 4C12 4 12 4 12 4V6H12C12 6 12 6 12 6V4ZM10 8H14V14H10V8ZM6 18C6 19.11 6.89 20 8 20H16C17.11 20 18 19.11 18 18V17H16V18H8V17H6V18ZM4 21C4 21.55 4.45 22 5 22H19C19.55 22 20 21.55 20 21C20 20.45 19.55 20 19 20H5C4.45 20 4 20.45 4 21Z"/>
              </svg>
            </div>
            {isExpanded && (
              <div className="overflow-hidden">
                <span className="text-lg font-bold text-foreground whitespace-nowrap">
                  AI Visibility Hub
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-none group",
                  isActive(item.path)
                    ? "bg-[#111E63] text-white"
                    : "text-foreground hover:text-white hover:bg-[#111E63]"
                )}
              >
                <div className="flex-shrink-0">
                  {item.icon}
                </div>
                {isExpanded && (
                  <div className="overflow-hidden">
                    <div className="font-medium group-hover:text-white whitespace-nowrap">
                      {item.label}
                    </div>
                    <div className={cn(
                      "text-xs group-hover:text-white whitespace-nowrap",
                      isActive(item.path) 
                        ? "text-white/80" 
                        : "text-muted-foreground"
                    )}>
                      {item.subtitle}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Settings at bottom */}
        <div className="p-2 border-t border-white/10">
          <button
            onClick={() => navigate("/settings")}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-none group",
              isActive("/settings")
                ? "bg-[#111E63] text-white"
                : "text-foreground hover:text-white hover:bg-[#111E63]"
            )}
          >
            <div className="flex-shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            {isExpanded && (
              <div className="overflow-hidden">
                <div className="font-medium group-hover:text-white whitespace-nowrap">
                  Settings
                </div>
                <div className={cn(
                  "text-xs group-hover:text-white whitespace-nowrap",
                  isActive("/settings") 
                    ? "text-white/80" 
                    : "text-muted-foreground"
                )}>
                  Account & preferences
                </div>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;