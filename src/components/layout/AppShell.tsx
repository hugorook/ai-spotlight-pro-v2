import { PropsWithChildren, ReactNode, useMemo } from "react";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/layout/Sidebar";
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
}>;

export default function AppShell({ title, subtitle, right, children }: AppShellProps) {
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
      {/* Left Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="ml-16 flex flex-col">
        <AppHeader />
        
        <div className="flex-1 p-6">
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

