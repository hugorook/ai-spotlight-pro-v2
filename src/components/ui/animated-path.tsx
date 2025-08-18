import React, { useState, useEffect } from 'react';

interface AnimatedPathProps {
  isActive: boolean;
  progress: number; // 0-100
  onComplete: () => void;
  currentStep?: string;
}

const AnimatedPath: React.FC<AnimatedPathProps> = ({ 
  isActive, 
  progress, 
  onComplete,
  currentStep = ''
}) => {
  const [pathProgress, setPathProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (isActive) {
      // Map AI progress (0-100) to path progress (0-1)
      const normalizedProgress = Math.min(progress / 100, 1);
      setPathProgress(normalizedProgress);
      
      // Show results tab when we're close to completion
      if (normalizedProgress >= 0.95) {
        setShowResults(true);
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    } else {
      setPathProgress(0);
      setShowResults(false);
    }
  }, [isActive, progress, onComplete]);

  if (!isActive) return null;

  return (
    <div className="relative w-full h-96 overflow-hidden">
      {/* SVG Path Container */}
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox="0 0 800 400"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Define gradient */}
        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(17, 30, 99, 0.8)" />
            <stop offset="100%" stopColor="rgba(17, 30, 99, 0.8)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background path (full route) */}
        <path
          d="M 50 50 L 50 150 L 400 150 L 400 250 L 750 250"
          stroke="rgba(17, 30, 99, 0.2)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="5,5"
        />

        {/* Animated path (progress) */}
        <path
          d="M 50 50 L 50 150 L 400 150 L 400 250 L 750 250"
          stroke="url(#pathGradient)"
          strokeWidth="4"
          fill="none"
          filter="url(#glow)"
          style={{
            strokeDasharray: '1000',
            strokeDashoffset: `${1000 - (pathProgress * 1000)}`,
            transition: 'stroke-dashoffset 0.5s ease-in-out'
          }}
        />

        {/* Animated dot following the path */}
        {pathProgress > 0 && (
          <circle
            r="6"
            fill="url(#pathGradient)"
            filter="url(#glow)"
            className="animate-pulse"
            style={{
              transform: `translateX(${50 + (pathProgress * 700)}px) translateY(${
                pathProgress < 0.25 ? 50 + (pathProgress * 4 * 100) :
                pathProgress < 0.5 ? 150 :
                pathProgress < 0.75 ? 150 + ((pathProgress - 0.5) * 4 * 100) :
                250
              }px)`
            }}
          />
        )}
      </svg>

      {/* Start Point */}
      <div className="absolute top-8 left-8">
        <div className="glass p-3 rounded-lg">
          <div className="w-3 h-3 bg-gradient-ai rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="absolute top-32 left-8">
        <div className={`glass p-3 rounded-lg transition-all duration-500 ${pathProgress > 0.3 ? 'bg-gradient-ai text-white transform scale-105' : ''}`}>
          <span className="text-sm font-medium">Processing...</span>
        </div>
      </div>

      <div className="absolute top-32 left-1/2 transform -translate-x-1/2">
        <div className={`glass p-3 rounded-lg transition-all duration-500 ${pathProgress > 0.6 ? 'bg-gradient-ai text-white transform scale-105' : ''}`}>
          <span className="text-sm font-medium">Analyzing...</span>
        </div>
      </div>

      {/* Results Tab */}
      <div 
        className={`absolute top-56 right-8 transition-all duration-500 ${
          showResults ? 'transform scale-110' : 'transform scale-90 opacity-50'
        }`}
      >
        <div className={`glass-strong p-4 rounded-lg border-2 transition-all duration-500 ${
          showResults 
            ? 'bg-[#111E63] text-white border-[#111E63] shadow-lg animate-pulse' 
            : 'border-[#111E63]/20'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              showResults ? 'bg-white animate-pulse' : 'bg-[#111E63]/30'
            }`}></div>
            <span className="font-medium">Results</span>
          </div>
          {showResults && (
            <div className="text-xs text-white/80 mt-1 animate-fade-in">
              Analysis Complete
            </div>
          )}
        </div>
      </div>

      {/* Current Step Display */}
      {currentStep && pathProgress > 0 && pathProgress < 1 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-fade-in">
          <div className="glass p-3 rounded-lg text-center">
            <span className="text-sm text-foreground">{currentStep}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimatedPath;