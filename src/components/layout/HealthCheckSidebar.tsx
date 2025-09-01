import React from 'react';
import { BarChart3, Globe, Activity, Award, TrendingUp, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthCheckSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onRunHealthCheck: () => void;
  isRunning?: boolean;
}

const HealthCheckSidebar: React.FC<HealthCheckSidebarProps> = ({
  activeTab,
  onTabChange,
  onRunHealthCheck,
  isRunning = false
}) => {
  const tabs = [
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'website', label: 'Website Analysis', icon: Globe },
    { id: 'benchmark', label: 'Benchmark', icon: Activity },
    { id: 'authority', label: 'Authority', icon: Award },
    { id: 'trending', label: 'Trending', icon: TrendingUp }
  ];

  return (
    <div className="fixed left-0 top-0 h-screen w-64 z-[100] glass-strong backdrop-blur-xl sidebar-flush">
      <div className="h-full flex flex-col p-4">
        {/* Run Health Check Button */}
        <button
          onClick={onRunHealthCheck}
          disabled={isRunning}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors mb-6",
            isRunning 
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "sidebar-button text-foreground hover:bg-[#5F209B] hover:text-white"
          )}
        >
          <Play className="w-4 h-4" />
          {isRunning ? 'Running...' : 'Run Health Check'}
        </button>

        {/* Health Check Tabs */}
        <nav className="flex-1">
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "w-full flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors",
                  activeTab === tab.id 
                    ? 'bg-[#E7F0F6] text-foreground' 
                    : 'sidebar-button text-foreground hover:bg-[#5F209B] hover:text-white'
                )}
              >
                <div className="w-4 h-4 mr-3 flex-shrink-0 flex items-center justify-center">
                  <tab.icon className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default HealthCheckSidebar;