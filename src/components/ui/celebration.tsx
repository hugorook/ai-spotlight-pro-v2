import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Target, TrendingUp, Share2 } from 'lucide-react';

interface CelebrationProps {
  type: 'milestone' | 'improvement' | 'achievement';
  title: string;
  description: string;
  metric?: string;
  previousValue?: number;
  currentValue: number;
  onDismiss: () => void;
  onShare?: () => void;
}

export const Celebration: React.FC<CelebrationProps> = ({
  type,
  title,
  description,
  metric,
  previousValue,
  currentValue,
  onDismiss,
  onShare
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const icons = {
    milestone: <Trophy className="w-8 h-8 text-yellow-500" />,
    improvement: <TrendingUp className="w-8 h-8 text-green-500" />,
    achievement: <Target className="w-8 h-8 text-blue-500" />
  };

  const gradients = {
    milestone: 'from-yellow-50 to-orange-50 border-yellow-200',
    improvement: 'from-green-50 to-blue-50 border-green-200', 
    achievement: 'from-blue-50 to-purple-50 border-blue-200'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={`
        max-w-md w-full p-8 text-center 
        ${gradients[type]}
        transform transition-all duration-500 ease-out
        ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
      `}>
        {/* Celebration Icon */}
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          {icons[type]}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-foreground mb-3">
          {title}
        </h2>

        {/* Description */}
        <p className="text-muted-foreground mb-6">
          {description}
        </p>

        {/* Metric Display */}
        {metric && (
          <div className="bg-white rounded-lg p-4 mb-6">
            <div className="text-sm text-muted-foreground mb-1">{metric}</div>
            <div className="flex items-center justify-center gap-2">
              {previousValue !== undefined && (
                <>
                  <span className="text-lg text-muted-foreground">{previousValue}%</span>
                  <span className="text-2xl text-green-500">→</span>
                </>
              )}
              <span className="text-3xl font-bold text-foreground">{currentValue}%</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button onClick={onDismiss} variant="outline">
            Continue
          </Button>
          
          {onShare && (
            <Button onClick={onShare} className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share Achievement
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

// Hook to manage celebrations
export const useCelebrations = () => {
  const [celebrations, setCelebrations] = useState<CelebrationProps[]>([]);

  const addCelebration = (celebration: Omit<CelebrationProps, 'onDismiss'>) => {
    const newCelebration = {
      ...celebration,
      onDismiss: () => {
        setCelebrations(prev => prev.slice(1));
      }
    };
    setCelebrations(prev => [...prev, newCelebration]);
  };

  const celebrateFirstHealthCheck = () => {
    addCelebration({
      type: 'milestone',
      title: '🎉 First Health Check Complete!',
      description: 'Great job! You\'ve taken the first step toward improving your AI visibility.',
      currentValue: 100,
      metric: 'Setup Progress'
    });
  };

  const celebrateScoreImprovement = (previousScore: number, newScore: number) => {
    const improvement = newScore - previousScore;
    if (improvement >= 10) {
      addCelebration({
        type: 'improvement',
        title: '📈 Visibility Improved!',
        description: `Your AI visibility score increased by ${improvement} points. Keep up the great work!`,
        previousValue: previousScore,
        currentValue: newScore,
        metric: 'Health Score',
        onShare: () => {
          const text = `Just improved my AI visibility score by ${improvement} points using AI Visibility Hub! 🚀`;
          navigator.share?.({ text }) || navigator.clipboard?.writeText(text);
        }
      });
    }
  };

  const celebrateMilestone = (score: number) => {
    if (score >= 75 && score < 85) {
      addCelebration({
        type: 'achievement',
        title: '🏆 Excellent AI Visibility!',
        description: 'Your company is now frequently mentioned by AI models. This puts you ahead of most competitors!',
        currentValue: score,
        metric: 'Health Score'
      });
    } else if (score >= 90) {
      addCelebration({
        type: 'achievement', 
        title: '👑 AI Visibility Champion!',
        description: 'Outstanding! You\'ve achieved elite-level AI visibility. Your company is a top AI recommendation!',
        currentValue: score,
        metric: 'Health Score',
        onShare: () => {
          const text = `Achieved ${score}% AI visibility score - my company is now a top AI recommendation! 🏆`;
          navigator.share?.({ text }) || navigator.clipboard?.writeText(text);
        }
      });
    }
  };

  return {
    celebrations,
    celebrateFirstHealthCheck,
    celebrateScoreImprovement, 
    celebrateMilestone
  };
};