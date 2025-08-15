import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ArrowRight, Building2, Activity, Target, FileText } from 'lucide-react';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending';
  action?: () => void;
}

interface WorkflowProgressProps {
  steps: WorkflowStep[];
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ steps }) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6 text-center">Your AI Visibility Journey</h3>
      
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-4">
            {/* Status Icon */}
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center
              ${step.status === 'completed' 
                ? 'bg-green-100 text-green-600' 
                : step.status === 'current'
                ? 'bg-blue-100 text-blue-600'
                : 'bg-gray-100 text-gray-400'
              }
            `}>
              {step.status === 'completed' ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                step.icon
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-medium ${
                    step.status === 'completed' 
                      ? 'text-green-700' 
                      : step.status === 'current'
                      ? 'text-blue-700'
                      : 'text-gray-500'
                  }`}>
                    {step.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                </div>
                
                {step.status === 'current' && step.action && (
                  <Button onClick={step.action} size="sm">
                    Continue
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className={`
                absolute left-6 mt-16 w-0.5 h-8
                ${step.status === 'completed' ? 'bg-green-200' : 'bg-gray-200'}
              `} />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

// Helper hook to generate workflow steps based on user progress
export const useWorkflowSteps = (
  hasCompanyProfile: boolean,
  hasRunHealthCheck: boolean,
  hasCreatedContent: boolean
) => {
  const steps: WorkflowStep[] = [
    {
      id: 'setup',
      title: 'Company Setup',
      description: 'Tell us about your company',
      icon: <Building2 className="w-6 h-6" />,
      status: hasCompanyProfile ? 'completed' : 'current',
      action: hasCompanyProfile ? undefined : () => window.location.href = '/geo'
    },
    {
      id: 'health-check',
      title: 'AI Health Check', 
      description: 'Test your current AI visibility',
      icon: <Activity className="w-6 h-6" />,
      status: hasRunHealthCheck ? 'completed' : hasCompanyProfile ? 'current' : 'pending',
      action: hasRunHealthCheck ? undefined : hasCompanyProfile ? () => window.location.href = '/geo' : undefined
    },
    {
      id: 'content',
      title: 'Content Creation',
      description: 'Generate optimized content',
      icon: <FileText className="w-6 h-6" />,
      status: hasCreatedContent ? 'completed' : hasRunHealthCheck ? 'current' : 'pending',
      action: hasCreatedContent ? undefined : hasRunHealthCheck ? () => window.location.href = '/content' : undefined
    }
  ];

  return steps;
};