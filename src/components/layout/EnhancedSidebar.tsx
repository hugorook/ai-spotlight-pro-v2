import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, BarChart3, FileText, Settings, Building2, LogIn as LogInIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface EnhancedSidebarProps {
  activeHealthTab?: string;
  onHealthTabChange?: (tabId: string) => void;
  onRunHealthCheck?: () => void;
  isRunning?: boolean;
}

const EnhancedSidebar: React.FC<EnhancedSidebarProps> = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const getUserInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const navigationItems = [
    { label: "Dashboard", icon: TrendingUp, href: "/dashboard" },
    { label: "Site Connection", icon: Building2, href: "/site-connection" },
    { label: "Analytics Hub", icon: BarChart3, href: "/analytics" },
    { label: "Prompts", icon: FileText, href: "/prompts" },
  ];

  const settingsItems = [
    { label: "Settings", icon: Settings, href: "/settings" },
  ];

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
            {navigationItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.href);
                }}
                className="text-[#282823b3] hover:bg-[#e7f8be] hover:text-[#282823] flex items-center justify-between px-3 py-2 rounded-md transition-colors"
              >
                <span className="text-[13px] font-normal">{item.label}</span>
                <item.icon className="w-3.5 h-3.5" />
              </a>
            ))}
          </nav>

          {/* Settings Navigation (stuck to bottom of white box) */}
          <nav className="px-2 pb-3 space-y-1 mt-auto">
            {settingsItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.href);
                }}
                className="text-[#282823b3] hover:bg-[#e7f8be] hover:text-[#282823] flex items-center justify-between px-3 py-2 rounded-md transition-colors"
              >
                <span className="text-[13px] font-normal">{item.label}</span>
                <item.icon className="w-3.5 h-3.5" />
              </a>
            ))}
          </nav>
        </div>

        {/* Login box (same style) */}
        <div className="bg-white rounded-2xl border border-[#d9d9d9] shadow-sm p-2">
          {user ? (
            <a
              href="/settings"
              onClick={(e) => {
                e.preventDefault();
                navigate('/settings');
              }}
              className="w-full block text-[#282823b3] hover:bg-[#e7f8be] hover:text-[#282823] px-3 py-2 rounded-md transition-colors flex items-center justify-between"
            >
              <span className="text-[13px] font-normal truncate">{user.email}</span>
              <div className="text-[10px] font-medium text-[#282823] bg-[#f0f0f0] px-1.5 py-0.5 rounded flex-shrink-0 ml-2">
                {getUserInitials(user.email || 'User')}
              </div>
            </a>
          ) : (
            <a
              href="/auth"
              onClick={(e) => {
                e.preventDefault();
                navigate('/auth');
              }}
              className="w-full block text-[#282823b3] hover:bg-[#e7f8be] hover:text-[#282823] px-3 py-2 rounded-md transition-colors flex items-center justify-between"
            >
              <span className="text-[13px] font-normal">Log in</span>
              <LogInIcon className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </aside>
  );
};

export default EnhancedSidebar;