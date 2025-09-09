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
  const getUserInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const navItems: NavItem[] = [
    { 
      path: "/dashboard", 
      label: "Dashboard", 
      icon: <BarChart3 className="w-5 h-5" />
    },
    { 
      path: "/site-connection", 
      label: "Site Connection", 
      icon: <Globe className="w-5 h-5" />
    },
    { 
      path: "/analytics", 
      label: "Analytics Hub", 
      icon: <Brain className="w-5 h-5" />
    },
    { 
      path: "/prompts", 
      label: "Prompts", 
      icon: <MessageSquare className="w-5 h-5" />
    },
    { 
      path: "/settings", 
      label: "Settings", 
      icon: <Settings className="w-5 h-5" />
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed left-0 top-0 bottom-0 w-60 z-[100] flex flex-col pointer-events-none">
      {/* Landing-style Sidebar Box */}
      <div className="flex-1 mx-6 my-6 bg-white rounded-2xl border border-[#d9d9d9] shadow-sm flex flex-col gap-3 pointer-events-auto">
        {/* Logo */}
        <div className="px-3 pt-3 pb-2 text-[14px] text-[#282823] font-corben" style={{fontWeight: 400}}>Dexter</div>

        {/* Navigation */}
        <nav className="px-2 space-y-1 flex-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-[13px]",
                isActive(item.path)
                  ? "bg-[#e7f8be] text-[#282823]"
                  : "text-[#282823b3] hover:bg-[#e7f8be] hover:text-[#282823]"
              )}
            >
              <span className="flex items-center gap-2">
                {React.cloneElement(item.icon as React.ReactElement, { className: "w-3.5 h-3.5" })}
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Settings pinned bottom inside box */}
        <div className="px-2 pb-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-[13px] text-[#282823b3] hover:bg-[#e7f8be] hover:text-[#282823]"
          >
            <span className="flex items-center gap-2"><Settings className="w-3.5 h-3.5" /> Settings</span>
          </button>
        </div>
      </div>

      {/* Login box below or user */}
      <div className="mx-6 mb-6 bg-white rounded-2xl border border-[#d9d9d9] shadow-sm p-2 pointer-events-auto">
        {user ? (
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
        ) : (
          <button
            onClick={() => navigate('/auth')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-[13px] text-[#282823b3] hover:bg-[#e7f8be] hover:text-[#282823]"
          >
            <span>Log in</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default EnhancedSidebar;