import React, { useState, useEffect } from 'react';

interface FlashlightEffectProps {
  isActive: boolean;
  onToggle: (active: boolean) => void;
}

export default function FlashlightEffect({ isActive, onToggle }: FlashlightEffectProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [screenDimensions, setScreenDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setScreenDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onToggle(!isActive);
      }
    };

    if (isActive) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, onToggle]);

  if (!isActive) return null;

  // Calculate torch holder position (center of screen)
  const torchX = screenDimensions.width / 2;
  const torchY = screenDimensions.height / 2;
  
  // Calculate distance and angle from torch to cursor
  const deltaX = mousePos.x - torchX;
  const deltaY = mousePos.y - torchY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = Math.atan2(deltaY, deltaX);
  
  // Calculate ellipse dimensions based on distance and angle
  const maxDistance = Math.sqrt(torchX * torchX + torchY * torchY);
  const distanceRatio = Math.min(distance / maxDistance, 1);
  
  // Base radius that shrinks with distance (perspective)
  const baseRadius = 280 - (distanceRatio * 80);
  
  // Create elliptical distortion based on angle from center
  const horizontalStretch = 1 + (distanceRatio * Math.abs(Math.cos(angle)) * 1.2);
  const verticalStretch = 1 + (distanceRatio * Math.abs(Math.sin(angle)) * 1.2);
  
  // Calculate the ellipse dimensions
  const radiusX = baseRadius * horizontalStretch;
  const radiusY = baseRadius * verticalStretch;

  return (
    <>
      {/* Instruction Text */}
      <div className="fixed top-6 right-6 z-[100] text-white text-lg font-medium bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
        Press Esc to turn the lights on
      </div>

      {/* Flashlight Mask with realistic beam geometry */}
      <div 
        className="fixed inset-0 pointer-events-none z-[60] cursor-none"
        style={{
          background: `radial-gradient(ellipse ${radiusX}px ${radiusY}px at ${mousePos.x}px ${mousePos.y}px, 
            transparent 0%, 
            transparent 35%, 
            rgba(0,0,0,0.2) 50%, 
            rgba(0,0,0,0.6) 70%, 
            rgba(0,0,0,0.85) 85%, 
            rgba(0,0,0,0.92) 100%)`
        }}
      />
    </>
  );
}