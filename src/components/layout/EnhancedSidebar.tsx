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
    <div className="fixed left-0 top-0 h-screen w-64 z-[100] bg-transparent flex flex-col">
      {/* Logo */}
      <div className="p-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <span className="text-lg font-bold text-gray-900">Lex</span>
        </div>
      </div>

      {/* Run Health Check Button */}
      <div className="p-2">
        <button
          onClick={onRunHealthCheck || (() => navigate('/geo'))}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#5F209B] text-white rounded-md hover:opacity-90 transition-opacity font-semibold text-sm"
        >
          <Activity className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running Health Check...' : 'Run Health Check'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-1 overflow-y-auto">
        <div className="space-y-0">
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
                  "w-full flex items-center justify-between px-2 py-1 text-left transition-none group text-sm bg-transparent border-0",
                  isActive(item.path)
                    ? "text-gray-900"
                    : "text-gray-700 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0">{React.cloneElement(item.icon as React.ReactElement, { className: "w-4 h-4" })}</div>
                  <div>{item.label}</div>
                </div>
                {item.children && (
                  <div className="flex-shrink-0">
                    {(isHealthCheckExpanded && isActive(item.path)) ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                    }
                  </div>
                )}
              </button>

              {/* Health Check Sub-items - Traditional tree view */}
              {item.children && isActive(item.path) && isHealthCheckExpanded && (
                <div className="relative">
                  {/* Vertical connecting line */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
                  {item.children.map((child, index) => (
                    <div key={child.path} className="relative">
                      {/* Horizontal connecting line */}
                      <div className="absolute left-4 top-3 w-4 h-px bg-gray-200"></div>
                      <button
                        onClick={() => onHealthTabChange?.(child.path)}
                        className={cn(
                          "relative w-full flex items-center gap-2 pl-8 pr-2 py-1 text-left transition-none text-xs ml-0 bg-transparent border-0",
                          activeHealthTab === child.path
                            ? "text-gray-900"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                        style={{ maxWidth: 'calc(100% - 16px)' }}
                      >
                        <div className="flex-shrink-0">{React.cloneElement(child.icon as React.ReactElement, { className: "w-3 h-3" })}</div>
                        <div>{child.label}</div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* User Profile at Bottom */}
      <div className="p-2 space-y-1">
        {/* Settings */}
        <button
          onClick={() => navigate("/settings")}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1 text-left transition-none text-sm bg-transparent",
            isActive("/settings")
              ? "text-gray-900"
              : "text-gray-700 hover:text-gray-900"
          )}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>

        {/* User Avatar */}
        {user && (
          <div className="flex items-center gap-2 px-2">
            <button
              onClick={() => navigate('/settings')}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-medium transition-colors flex-shrink-0"
              title={user.email || 'User'}
            >
              {getUserInitials(user.email || 'User')}
            </button>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedSidebar;