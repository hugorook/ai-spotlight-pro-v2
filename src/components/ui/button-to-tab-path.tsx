import React from 'react';

interface ButtonToTabPathProps {
  isActive: boolean;
  progress: number;
  onComplete?: () => void;
}

const ButtonToTabPath: React.FC<ButtonToTabPathProps> = ({
  isActive,
  progress,
  onComplete
}) => {
  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <svg 
        className="w-full h-full" 
        viewBox="0 0 1200 800"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="buttonPathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="50%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        
        {/* Path: right → down → left → down to results tab */}
        <path
          d="M 400 300 L 900 300 L 900 500 L 300 500 L 300 700"
          fill="none"
          stroke="url(#buttonPathGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            strokeDasharray: '1000',
            strokeDashoffset: `${1000 - (progress * 10)}`,
            transition: 'stroke-dashoffset 0.5s ease-in-out'
          }}
        />
        
        {/* Animated dot at the end of the path */}
        {progress > 95 && (
          <circle
            cx="300"
            cy="700"
            r="4"
            fill="url(#buttonPathGradient)"
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
};

export default ButtonToTabPath;