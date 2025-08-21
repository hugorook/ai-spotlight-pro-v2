import React, { useState } from 'react';
import { BarChart3, Globe, Activity, Award, TrendingUp, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthCheckSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onRunHealthCheck: () => void;
  isRunning?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

const HealthCheckSidebar: React.FC<HealthCheckSidebarProps> = ({
  activeTab,
  onTabChange,
  onRunHealthCheck,
  isRunning = false,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const tabs = [
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'website', label: 'Website Analysis', icon: Globe },
    { id: 'benchmark', label: 'Benchmark', icon: Activity },
    { id: 'authority', label: 'Authority', icon: Award },
    { id: 'trending', label: 'Trending', icon: TrendingUp }
  ];

  return (
    <div className={cn(
      "fixed left-0 top-20 h-[calc(100vh-5rem)] z-[100] glass-strong backdrop-blur-xl border-r border-white/20 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="h-full flex flex-col p-4">
        {/* Collapse Toggle Button */}
        <button
          onClick={() => onToggleCollapse?.(!isCollapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3 text-gray-600" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-gray-600" />
          )}
        </button>

        {/* Run Health Check Button */}
        <button
          onClick={onRunHealthCheck}
          disabled={isRunning}
          className={cn(
            "w-full flex items-center gap-2 rounded-md text-sm font-medium transition-colors mb-6",
            isCollapsed ? "justify-center px-2 py-3" : "justify-center px-4 py-3",
            isRunning 
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-transparent text-foreground hover:bg-[#E7E2F9] hover:text-white border border-gray-300"
          )}
        >
          <Play className="w-4 h-4" />
          {!isCollapsed && (isRunning ? 'Running...' : 'Run Health Check')}
        </button>

        {/* Health Check Tabs */}
        <nav className="flex-1">
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "w-full flex items-center rounded-md text-sm font-medium transition-colors",
                  isCollapsed ? "justify-center px-2 py-3" : "px-4 py-3",
                  activeTab === tab.id 
                    ? 'bg-[#E7E2F9] text-foreground' 
                    : 'bg-transparent text-foreground hover:bg-[#E7E2F9] hover:text-white'
                )}
                title={isCollapsed ? tab.label : undefined}
              >
                <div className={cn(
                  "w-4 h-4 flex-shrink-0 flex items-center justify-center",
                  !isCollapsed && "mr-3"
                )}>
                  <tab.icon className="w-4 h-4" />
                </div>
                {!isCollapsed && <span className="flex-1 text-left">{tab.label}</span>}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default HealthCheckSidebar;