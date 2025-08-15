import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HelpTooltipProps {
  content: string | React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  iconClassName?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ 
  content, 
  side = 'top', 
  className = '',
  iconClassName = 'w-4 h-4 text-muted-foreground hover:text-foreground cursor-help'
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={`${iconClassName} ${className}`} />
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {typeof content === 'string' ? <p>{content}</p> : content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface InfoBoxProps {
  title: string;
  children: React.ReactNode;
  variant?: 'info' | 'tip' | 'warning';
}

export const InfoBox: React.FC<InfoBoxProps> = ({ 
  title, 
  children, 
  variant = 'info' 
}) => {
  const variants = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    tip: 'bg-green-50 border-green-200 text-green-900', 
    warning: 'bg-orange-50 border-orange-200 text-orange-900'
  };

  const icons = {
    info: '💡',
    tip: '✅',
    warning: '⚠️'
  };

  return (
    <div className={`rounded-lg border p-4 ${variants[variant]}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{icons[variant]}</span>
        <div className="flex-1">
          <h4 className="font-medium mb-1">{title}</h4>
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
};