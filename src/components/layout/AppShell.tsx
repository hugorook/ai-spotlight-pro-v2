import { PropsWithChildren, ReactNode, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import EnhancedSidebar from "@/components/layout/EnhancedSidebar";
import { useLocation, Link } from "react-router-dom";

type AppShellProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  showHealthCheckSidebar?: boolean;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onRunHealthCheck?: () => void;
  isRunning?: boolean;
}>;

export default function AppShell({ 
  title, 
  subtitle, 
  right, 
  children, 
  showHealthCheckSidebar = false,
  activeTab = 'results',
  onTabChange,
  onRunHealthCheck,
  isRunning = false
}: AppShellProps) {
  const location = useLocation();
  const isHealthCheckPage = showHealthCheckSidebar;

  return (
    <div className="min-h-screen bg-[#ece7e0] text-foreground">
      {/* Enhanced Sidebar with all navigation */}
      <EnhancedSidebar 
        activeHealthTab={isHealthCheckPage ? activeTab : undefined}
        onHealthTabChange={isHealthCheckPage ? onTabChange : undefined}
        onRunHealthCheck={isHealthCheckPage ? onRunHealthCheck : undefined}
        isRunning={isHealthCheckPage ? isRunning : false}
      />
      
      {/* Main Content Area - align with landing page layout (12.5rem = 200px) */}
      <div className="lg:pl-[12.5rem]">
        <div className="px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

