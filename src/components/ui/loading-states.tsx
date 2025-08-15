import { Skeleton } from "@/components/ui/skeleton";
import AppShell from "@/components/layout/AppShell";

export const DashboardSkeleton = () => (
  <AppShell title="Dashboard" subtitle="Loading your AI visibility metrics...">
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
      {/* Header tiles */}
      <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card p-6 rounded-2xl">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      
      {/* Chart areas */}
      <div className="lg:col-span-2">
        <div className="bg-card p-6 rounded-2xl">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
      
      <div className="lg:col-span-2">
        <div className="bg-card p-6 rounded-2xl">
          <Skeleton className="h-5 w-28 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </AppShell>
);

export const HealthCheckSkeleton = () => (
  <AppShell title="Health Check" subtitle="Analyzing your AI visibility...">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Company setup */}
      <div className="bg-card p-6 rounded-2xl">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-4">
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
      
      {/* Results */}
      <div className="bg-card p-6 rounded-2xl">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
    
    {/* Strategies section */}
    <div className="bg-card p-6 rounded-2xl">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-16 w-full mb-3" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  </AppShell>
);

export const ContentSkeleton = () => (
  <AppShell title="Content Assistant" subtitle="Loading AI content optimization tools...">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Input section */}
      <div className="bg-card p-6 rounded-2xl">
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="space-y-4">
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      
      {/* Output section */}
      <div className="bg-card p-6 rounded-2xl">
        <Skeleton className="h-6 w-28 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  </AppShell>
);

export const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center mx-auto animate-pulse">
        <div className="text-2xl">🧠</div>
      </div>
      <div className="space-y-2">
        <div className="text-lg font-medium text-foreground">{message}</div>
        <div className="text-sm text-muted-foreground">Please wait...</div>
      </div>
    </div>
  </div>
);