import { PropsWithChildren, ReactNode, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import TopNavBar from "@/components/layout/TopNavBar";
import HealthCheckSidebar from "@/components/layout/HealthCheckSidebar";
import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
  
  const segments = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const acc: { label: string; href: string }[] = [];
    let href = "";
    for (const part of parts) {
      href += `/${part}`;
      acc.push({ label: toTitle(part), href });
    }
    return acc;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation Bar */}
      <TopNavBar />
      
      {/* Health Check Sidebar (only on health check page) */}
      {showHealthCheckSidebar && onTabChange && onRunHealthCheck && (
        <HealthCheckSidebar 
          activeTab={activeTab}
          onTabChange={onTabChange}
          onRunHealthCheck={onRunHealthCheck}
          isRunning={isRunning}
        />
      )}
      
      {/* Main Content Area */}
      <div className={`flex flex-col pt-16 ${showHealthCheckSidebar ? 'ml-64' : ''}`}>
        <div className="flex-1 px-6 py-2">
          {children}
        </div>
      </div>
    </div>
  );
}

function toTitle(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

