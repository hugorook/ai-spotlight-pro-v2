import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TrendingUp, BarChart3, FileText, Settings, Building2, LogIn as LogInIcon } from 'lucide-react';
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
      icon: <TrendingUp className="w-5 h-5" />
    },
    { 
      path: "/site-connection", 
      label: "Site Connection", 
      icon: <Building2 className="w-5 h-5" />
    },
    { 
      path: "/analytics", 
      label: "Analytics Hub", 
      icon: <BarChart3 className="w-5 h-5" />
    },
    { 
      path: "/prompts", 
      label: "Prompts", 
      icon: <FileText className="w-5 h-5" />
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="hidden lg:block fixed top-6 bottom-6 left-6 z-50">
      <div className="h-full w-44 flex flex-col gap-3">
        {/* Nav box */}
        <div className="flex-1 bg-white rounded-2xl border border-[#d9d9d9] shadow-sm overflow-hidden flex flex-col">
          <div className="pl-3.5 pr-3 py-2 text-left text-[16px] md:text-[18px] text-[#282823] font-corben" style={{fontWeight: 400}}>
            Dexter
          </div>

          {/* Main Navigation */}
          <nav className="px-2 space-y-1 flex-1 mt-3">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors",
                  isActive(item.path)
                    ? "bg-[#ddff89] text-[#282823]"
                    : "text-[#282823b3] hover:bg-[#e7f8be] hover:text-[#282823]"
                )}
              >
                <span className="text-[13px] font-normal">{item.label}</span>
                {React.cloneElement(item.icon as React.ReactElement, { className: "w-3.5 h-3.5" })}
              </button>
            ))}
          </nav>

          {/* Settings Navigation (stuck to bottom of white box) */}
          <nav className="px-2 pb-3 space-y-1 mt-auto">
            <button
              onClick={() => navigate('/settings')}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors",
                isActive('/settings')
                  ? "bg-[#ddff89] text-[#282823]"
                  : "text-[#282823b3] hover:bg-[#e7f8be] hover:text-[#282823]"
              )}
            >
              <span className="text-[13px] font-normal">Settings</span>
              <Settings className="w-3.5 h-3.5" />
            </button>
          </nav>
        </div>

        {/* Login box (same style) or User info */}
        <div className="bg-white rounded-2xl border border-[#d9d9d9] shadow-sm p-2">
          {user ? (
            <div className="flex items-center gap-2 px-1 py-1">
              <button
                onClick={() => navigate('/settings')}
                className="w-8 h-8 rounded-full bg-[#ddff89] hover:bg-[#c4ee60] text-[#282823] flex items-center justify-center text-xs font-medium transition-colors flex-shrink-0"
                title={user.email || 'User'}
              >
                {getUserInitials(user.email || 'User')}
              </button>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs text-[#282823] truncate">{user.email}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors text-[#282823b3] hover:bg-[#e7f8be] hover:text-[#282823]"
            >
              <span className="text-[13px] font-normal">Log in</span>
              <LogInIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default EnhancedSidebar;