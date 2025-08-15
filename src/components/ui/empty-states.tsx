import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BarChart3, Target, FileText, PlayCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  showVideo?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  showVideo
}) => {
  return (
    <Card className="p-8 text-center">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
        {icon || <BarChart3 className="w-8 h-8 text-muted-foreground" />}
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        {primaryAction && (
          <Button onClick={primaryAction.onClick} className="w-full sm:w-auto">
            {primaryAction.label}
          </Button>
        )}
        
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick} className="w-full sm:w-auto">
            {secondaryAction.label}
          </Button>
        )}
        
        {showVideo && (
          <Button variant="ghost" className="w-full sm:w-auto">
            <PlayCircle className="w-4 h-4 mr-2" />
            Watch Demo
          </Button>
        )}
      </div>
    </Card>
  );
};

// Specific empty states for common scenarios
export const NoHealthCheckResults = ({ onStartHealthCheck }: { onStartHealthCheck: () => void }) => (
  <EmptyState
    icon={<Target className="w-8 h-8 text-blue-500" />}
    title="No AI Health Check Results Yet"
    description="Run your first AI Health Check to see how visible your company is across AI models like ChatGPT, Claude, and Gemini."
    primaryAction={{
      label: "Run Your First Health Check",
      onClick: onStartHealthCheck
    }}
    showVideo
  />
);

export const NoCompanyProfile = ({ onSetupCompany }: { onSetupCompany: () => void }) => (
  <EmptyState
    icon={<FileText className="w-8 h-8 text-orange-500" />}
    title="Company Profile Required"
    description="Set up your company profile to start testing your AI visibility. This takes less than 2 minutes and helps us generate more relevant prompts."
    primaryAction={{
      label: "Set Up Company Profile",
      onClick: onSetupCompany
    }}
  />
);


export const DashboardEmptyState = ({ onStartJourney }: { onStartJourney: () => void }) => (
  <EmptyState
    icon={<BarChart3 className="w-8 h-8 text-purple-500" />}
    title="Welcome to AI Visibility Hub!"
    description="Your AI visibility dashboard will show metrics once you complete your first health check. Let's get started with a quick 2-minute setup."
    primaryAction={{
      label: "Start Your AI Visibility Journey",
      onClick: onStartJourney
    }}
    showVideo
  />
);