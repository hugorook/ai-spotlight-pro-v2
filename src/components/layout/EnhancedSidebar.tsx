import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Brain, BarChart3, User, Settings, MessageSquare, ChevronDown, ChevronRight, Activity, Globe, TrendingUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

interface EnhancedSidebarProps {
  activeHealthTab?: string;
  onHealthTabChange?: (tabId: string) => void;
  onRunHealthCheck?: () => void;
  isRunning?: boolean;
}

const EnhancedSidebar: React.FC<EnhancedSidebarProps> = ({ 
  activeHealthTab, 
  onHealthTabChange, 
  onRunHealthCheck, 
  isRunning 
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isHealthCheckExpanded, setIsHealthCheckExpanded] = useState(location.pathname === '/geo');

  const getUserInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const navItems: NavItem[] = [
    { 
      path: "/geo", 
      label: "AI Health Check", 
      icon: <Brain className="w-5 h-5" />,
      children: [
        { path: "results", label: "Results", icon: <Activity className="w-4 h-4" /> },
        { path: "website", label: "Website Analysis", icon: <Globe className="w-4 h-4" /> },
        { path: "benchmark", label: "Benchmarking", icon: <BarChart3 className="w-4 h-4" /> },
        { path: "authority", label: "Authority", icon: <Award className="w-4 h-4" /> },
        { path: "trending", label: "Trending", icon: <TrendingUp className="w-4 h-4" /> },
      ]
    },
    { 
      path: "/dashboard", 
      label: "Results Dashboard", 
      icon: <BarChart3 className="w-5 h-5" />
    },
    { 
      path: "/prompts", 
      label: "Test Prompts", 
      icon: <MessageSquare className="w-5 h-5" />
    },
    { 
      path: "/content", 
      label: "Company Profile", 
      icon: <User className="w-5 h-5" />
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleHealthCheckClick = () => {
    navigate('/geo');
    setIsHealthCheckExpanded(true);
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-64 z-[100] glass-strong backdrop-blur-xl border-r border-black/20 flex flex-col">
      {/* Run Health Check Button */}
      <div className="p-4 border-b border-black/10">
        <button
          onClick={onRunHealthCheck || (() => navigate('/geo'))}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#5F209B] text-white rounded-lg hover:opacity-90 transition-opacity font-semibold"
        >
          <Activity className={`w-5 h-5 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running Health Check...' : 'Run Health Check'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => (
            <div key={item.path}>
              <button
                onClick={() => {
                  if (item.children) {
                    handleHealthCheckClick();
                  } else {
                    navigate(item.path);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-none group",
                  isActive(item.path)
                    ? "bg-[#5F209B] text-white"
                    : "text-foreground hover:text-white hover:bg-[#5F209B]"
                )}
              >
                <div className="flex-shrink-0">{item.icon}</div>
                <div className="flex-1 font-medium">{item.label}</div>
                {item.children && (
                  <div className="flex-shrink-0">
                    {(isHealthCheckExpanded && isActive(item.path)) ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                    }
                  </div>
                )}
              </button>

              {/* Health Check Sub-items */}
              {item.children && isActive(item.path) && isHealthCheckExpanded && (
                <div className="mt-1 ml-4 space-y-1">
                  {item.children.map((child) => (
                    <button
                      key={child.path}
                      onClick={() => onHealthTabChange?.(child.path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-none text-sm",
                        activeHealthTab === child.path
                          ? "bg-[#5F209B]/20 text-[#5F209B] font-medium"
                          : "text-foreground/70 hover:text-foreground hover:bg-[#5F209B]/10"
                      )}
                    >
                      <div className="flex-shrink-0">{child.icon}</div>
                      <div>{child.label}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* User Profile at Bottom */}
      <div className="p-4 border-t border-black/10 space-y-3">
        {/* Settings */}
        <button
          onClick={() => navigate("/settings")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-none",
            isActive("/settings")
              ? "bg-[#5F209B] text-white"
              : "text-foreground hover:text-white hover:bg-[#5F209B]"
          )}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>

        {/* User Avatar */}
        {user && (
          <div className="flex items-center gap-3 px-3">
            <button
              onClick={() => navigate('/settings')}
              className="w-10 h-10 rounded-full bg-[#E7F0F6] hover:bg-[#5F209B] text-foreground hover:text-white flex items-center justify-center text-sm font-medium transition-colors"
              title={user.email || 'User'}
            >
              {getUserInitials(user.email || 'User')}
            </button>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedSidebar;