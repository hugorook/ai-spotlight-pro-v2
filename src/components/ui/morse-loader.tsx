import React, { useEffect, useRef } from 'react';

interface MorseLoaderProps {
  isActive: boolean;
  progress?: number;
}

const MorseLoader: React.FC<MorseLoaderProps> = ({ isActive, progress = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && containerRef.current) {
      // Add CSS styles to document head
      const style = document.createElement('style');
      style.textContent = `
        .morse-loader-container {
          text-align: center;
          background: var(--gradient-subtle-purple);
          backdrop-filter: blur(10px);
          padding: 40px;
          border-radius: 20px;
          border: 1px solid rgba(196, 181, 253, 0.2);
          box-shadow: 0 4px 12px rgba(31, 38, 135, 0.1);
          font-family: var(--font-sans), serif;
        }

        .morse-display {
          font-size: 3rem;
          margin-bottom: 10px;
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: 8px;
        }

        .morse-char {
          display: inline-block;
          opacity: 0;
          transform: scale(0);
          animation: morseAppear 0.3s ease-out forwards;
        }

        .dot {
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, rgba(196, 181, 253, 0.8) 0%, rgba(147, 197, 253, 0.8) 100%);
          border-radius: 50%;
          margin: 0 4px;
        }

        .dash {
          width: 50px;
          height: 20px;
          background: linear-gradient(135deg, rgba(196, 181, 253, 0.8) 0%, rgba(147, 197, 253, 0.8) 100%);
          border-radius: 10px;
          margin: 0 4px;
        }

        .space {
          width: 40px;
          height: 20px;
        }

        @keyframes morseAppear {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .letter-display {
          font-size: 2rem;
          margin-top: 10px;
          min-height: 50px;
          display: flex;
          justify-content: flex-start;
          align-items: flex-start;
          letter-spacing: 8px;
          padding-left: 20px;
        }

        .letter-container {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          margin: 0 15px;
          opacity: 0;
          transform: translateX(-20px);
          animation: containerSlideIn 0.3s ease-out forwards;
        }

        @keyframes containerSlideIn {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .morse-section {
          display: flex;
          align-items: center;
          min-height: 60px;
          margin-bottom: 5px;
        }

        .letter {
          background: linear-gradient(135deg, rgba(196, 181, 253, 0.8) 0%, rgba(147, 197, 253, 0.8) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent;
          font-weight: bold;
          font-size: 2rem;
          opacity: 0;
          transform: translateY(20px);
          animation: letterAppear 0.5s ease-out forwards;
        }

        @keyframes letterAppear {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `;
      document.head.appendChild(style);

      setTimeout(() => {
        animateMorseCode();
      }, 500);

      return () => {
        document.head.removeChild(style);
      };
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  // Morse code mapping
  const morseCode: { [key: string]: string } = {
    'S': '...', // dot dot dot
    'E': '.',   // dot
    'A': '.-',  // dot dash
    'R': '.-.', // dot dash dot
    'C': '-.-.', // dash dot dash dot
    'H': '....' // dot dot dot dot
  };

  const word = 'SEARCH';

  function createMorseElement(symbol: string) {
    const element = document.createElement('div');
    element.className = 'morse-char';
    
    if (symbol === '.') {
      element.classList.add('dot');
    } else if (symbol === '-') {
      element.classList.add('dash');
    } else if (symbol === ' ') {
      element.classList.add('space');
    }
    
    return element;
  }

  function animateMorseCode() {
    const morseDisplay = document.getElementById('morseDisplay');
    const letterDisplay = document.getElementById('letterDisplay');
    
    if (!morseDisplay || !letterDisplay) return;
    
    // Clear previous animation
    morseDisplay.innerHTML = '';
    letterDisplay.innerHTML = '';
    
    // Create containers for each letter - they start hidden
    for (let i = 0; i < word.length; i++) {
      const letterContainer = document.createElement('div');
      letterContainer.className = 'letter-container';
      letterContainer.id = `container-${i}`;
      letterContainer.style.opacity = '0';
      letterContainer.style.transform = 'translateX(-20px)';
      
      const morseSection = document.createElement('div');
      morseSection.className = 'morse-section';
      morseSection.id = `morse-${i}`;
      
      const letterElement = document.createElement('div');
      letterElement.className = 'letter';
      letterElement.textContent = word[i];
      letterElement.id = `letter-${i}`;
      letterElement.style.opacity = '0';
      letterElement.style.visibility = 'hidden';
      
      letterContainer.appendChild(morseSection);
      letterContainer.appendChild(letterElement);
      letterDisplay.appendChild(letterContainer);
    }
    
    function animateLetterMorse(letterIndex: number): void {
      if (letterIndex >= word.length) {
        // All morse code complete, now show all letters
        setTimeout(() => {
          for (let i = 0; i < word.length; i++) {
            const letterElement = document.getElementById(`letter-${i}`);
            if (letterElement) {
              setTimeout(() => {
                letterElement.style.visibility = 'visible';
                letterElement.style.animation = 'letterAppear 0.5s ease-out forwards';
              }, i * 150); // Stagger the letter appearances
            }
          }
        }, 300);
        return;
      }
      
      // Show the container for this letter first
      const container = document.getElementById(`container-${letterIndex}`);
      if (container) {
        container.style.animation = 'containerSlideIn 0.3s ease-out forwards';
      }
      
      const letter = word[letterIndex];
      const morse = morseCode[letter];
      const morseSection = document.getElementById(`morse-${letterIndex}`);
      let morseIndex = 0;
      
      function animateNextMorseSymbol(): void {
        if (morseIndex >= morse.length) {
          // Letter morse complete, move to next letter after a pause
          setTimeout(() => {
            animateLetterMorse(letterIndex + 1);
          }, 400);
          return;
        }
        
        const symbol = morse[morseIndex];
        const element = createMorseElement(symbol);
        if (morseSection) {
          morseSection.appendChild(element);
        }
        
        // Trigger animation
        setTimeout(() => {
          element.style.animationDelay = '0s';
        }, 10);
        
        morseIndex++;
        
        // Different timing for dots and dashes
        let delay = symbol === '-' ? 350 : 250;
        
        animationRef.current = setTimeout(animateNextMorseSymbol, delay);
      }
      
      // Small delay before starting morse for this letter
      setTimeout(animateNextMorseSymbol, 200);
    }
    
    setTimeout(() => {
      animateLetterMorse(0);
    }, 500);
  }

  return (
    <div ref={containerRef} className="morse-loader-container">
      <div className="morse-display" id="morseDisplay"></div>
      <div className="letter-display" id="letterDisplay"></div>
    </div>
  );
};

export default MorseLoader;