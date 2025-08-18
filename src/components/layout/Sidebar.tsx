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
                <path d="M12 2C7.037 2 3 6.037 3 11c0 2.05.68 3.936 1.827 5.451L12 22l7.173-5.549C20.32 14.936 21 13.05 21 11c0-4.963-4.037-9-9-9zm-3 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                <circle fill="white" cx="9" cy="9.5" r="0.5"/>
                <circle fill="white" cx="15" cy="9.5" r="0.5"/>
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
          <div className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-lg text-left transition-none group",
                  isActive(item.path)
                    ? "bg-[#111E63] text-white"
                    : "text-foreground hover:text-white hover:bg-[#111E63]"
                )}
              >
                <div className="flex-shrink-0 sidebar-icon group-hover:text-white">
                  {item.icon}
                </div>
                {isExpanded && (
                  <div className="overflow-hidden">
                    <div className="font-medium group-hover:text-white whitespace-nowrap">
                      {item.label}
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
              "w-full flex items-center gap-3 p-4 rounded-lg text-left transition-none group",
              isActive("/settings")
                ? "bg-[#111E63] text-white"
                : "text-foreground hover:text-white hover:bg-[#111E63]"
            )}
          >
            <div className="flex-shrink-0 sidebar-icon group-hover:text-white">
              <Settings className="w-5 h-5" />
            </div>
            {isExpanded && (
              <div className="overflow-hidden">
                <div className="font-medium group-hover:text-white whitespace-nowrap">
                  Settings
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