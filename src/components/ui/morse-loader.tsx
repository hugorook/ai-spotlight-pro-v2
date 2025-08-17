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
          font-family: var(--font-sans), serif;
          padding: 20px;
        }

        .morse-display {
          font-size: 1.5rem;
          margin-bottom: 8px;
          min-height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: 4px;
        }

        .morse-char {
          display: inline-block;
          opacity: 0;
          transform: scale(0);
          animation: morseAppear 0.3s ease-out forwards;
        }

        .dot {
          width: 12px;
          height: 12px;
          background: linear-gradient(135deg, rgba(196, 181, 253, 0.8) 0%, rgba(147, 197, 253, 0.8) 100%);
          border-radius: 50%;
          margin: 0 2px;
        }

        .dash {
          width: 30px;
          height: 12px;
          background: linear-gradient(135deg, rgba(196, 181, 253, 0.8) 0%, rgba(147, 197, 253, 0.8) 100%);
          border-radius: 6px;
          margin: 0 2px;
        }

        .space {
          width: 20px;
          height: 12px;
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
          font-size: 1.2rem;
          margin-top: 8px;
          min-height: 30px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          letter-spacing: 4px;
          padding: 0;
        }

        .letter-container {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          margin: 0 8px;
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
          min-height: 30px;
          margin-bottom: 3px;
        }

        .letter {
          background: linear-gradient(135deg, rgba(196, 181, 253, 0.8) 0%, rgba(147, 197, 253, 0.8) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent;
          font-weight: bold;
          font-size: 1.2rem;
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

  // Complete morse code mapping
  const morseCode: { [key: string]: string } = {
    'A': '.-',    'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.',   'H': '....', 'I': '..',   'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--',    'N': '-.',   'O': '---',  'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...',   'T': '-',    'U': '..-',  'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--',  'Z': '--..'
  };

  const message = 'YOUR AUDIENCE IS SEARCHING - CAN THEY FIND YOU?';
  // Remove punctuation and convert to morse-friendly format
  const cleanMessage = message.replace(/[^A-Z\s]/g, '').replace(/\s+/g, ' ');

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
    
    // Split message into characters (including spaces)
    const characters = cleanMessage.split('');
    let currentIndex = 0;
    
    // Create morse display area
    const morseArea = document.createElement('div');
    morseArea.style.display = 'flex';
    morseArea.style.flexWrap = 'wrap';
    morseArea.style.justifyContent = 'center';
    morseArea.style.alignItems = 'center';
    morseArea.style.gap = '8px';
    morseDisplay.appendChild(morseArea);
    
    // Create text display area
    const textArea = document.createElement('div');
    textArea.style.fontSize = '1.5rem';
    textArea.style.fontWeight = 'bold';
    textArea.style.background = 'linear-gradient(135deg, rgba(196, 181, 253, 0.8) 0%, rgba(147, 197, 253, 0.8) 100%)';
    textArea.style.webkitBackgroundClip = 'text';
    textArea.style.webkitTextFillColor = 'transparent';
    textArea.style.backgroundClip = 'text';
    textArea.style.textAlign = 'center';
    textArea.style.marginTop = '16px';
    textArea.style.minHeight = '2rem';
    letterDisplay.appendChild(textArea);
    
    function animateNextCharacter(): void {
      if (currentIndex >= characters.length) {
        // Animation complete - show full message
        setTimeout(() => {
          textArea.innerHTML = message;
          textArea.style.animation = 'letterAppear 1s ease-out forwards';
        }, 500);
        return;
      }
      
      const char = characters[currentIndex];
      
      if (char === ' ') {
        // Add word space
        const wordSpace = document.createElement('div');
        wordSpace.style.width = '30px';
        wordSpace.style.height = '20px';
        morseArea.appendChild(wordSpace);
        
        // Show partial text
        const partialText = characters.slice(0, currentIndex + 1).join('');
        textArea.textContent = partialText;
        
        currentIndex++;
        setTimeout(animateNextCharacter, 600);
        return;
      }
      
      const morse = morseCode[char];
      if (!morse) {
        currentIndex++;
        setTimeout(animateNextCharacter, 100);
        return;
      }
      
      // Create letter group
      const letterGroup = document.createElement('div');
      letterGroup.style.display = 'flex';
      letterGroup.style.alignItems = 'center';
      letterGroup.style.gap = '3px';
      letterGroup.style.padding = '2px 4px';
      
      morseArea.appendChild(letterGroup);
      
      // Animate morse symbols for this letter
      let symbolIndex = 0;
      function animateNextSymbol(): void {
        if (symbolIndex >= morse.length) {
          // Letter complete, show it in text
          const partialText = characters.slice(0, currentIndex + 1).join('');
          textArea.textContent = partialText;
          
          currentIndex++;
          setTimeout(animateNextCharacter, 400);
          return;
        }
        
        const symbol = morse[symbolIndex];
        const element = createMorseElement(symbol);
        letterGroup.appendChild(element);
        
        symbolIndex++;
        const delay = symbol === '-' ? 300 : 200;
        setTimeout(animateNextSymbol, delay);
      }
      
      setTimeout(animateNextSymbol, 100);
    }
    
    setTimeout(animateNextCharacter, 300);
  }

  return (
    <div ref={containerRef} className="morse-loader-container">
      <div className="morse-display" id="morseDisplay"></div>
      <div className="letter-display" id="letterDisplay"></div>
    </div>
  );
};

export default MorseLoader;