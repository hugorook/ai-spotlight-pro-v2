import { PropsWithChildren, ReactNode, useMemo } from "react";
import CleanAppHeader from "@/components/CleanAppHeader";
import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import CopilotSidebar from "@/components/CopilotSidebar";

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
      <CleanAppHeader />
      <div className="container mx-auto p-6">
        <div className="mb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {segments.map((seg, idx) => (
                <span key={seg.href} className="inline-flex items-center">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {idx < segments.length - 1 ? (
                      <BreadcrumbLink asChild>
                        <Link to={seg.href}>{seg.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{seg.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </span>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {(title || right) && (
          <div className="flex items-center justify-between mb-6">
            <div>
              {title && <h1 className="text-2xl font-bold mb-1">{title}</h1>}
              {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
            </div>
            {right}
          </div>
        )}

        {children}
      </div>
      <CopilotSidebar />
    </div>
  );
}

function toTitle(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

