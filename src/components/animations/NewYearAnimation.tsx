import { useEffect, useRef, useState } from 'react';

interface NewYearAnimationProps {
  isActive?: boolean;
}

export function NewYearAnimation({ isActive = true }: NewYearAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [displayedYear, setDisplayedYear] = useState('');
  const text = "Happy New Year!";
  const yearText = "2026";

  // Letter-by-letter animation for "Happy New Year!"
  useEffect(() => {
    if (!isActive) return;
    
    let currentIndex = 0;
    setDisplayedText('');
    
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        // Start year animation after text completes
        setTimeout(() => {
          let yearIndex = 0;
          setDisplayedYear('');
          const yearInterval = setInterval(() => {
            if (yearIndex < yearText.length) {
              setDisplayedYear(yearText.slice(0, yearIndex + 1));
              yearIndex++;
            } else {
              clearInterval(yearInterval);
            }
          }, 200);
        }, 500);
      }
    }, 150); // 150ms delay between each letter

    return () => {
      clearInterval(interval);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;

    // Create confetti particles - red theme
    const colors = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fee2e2', '#991b1b', '#b91c1c', '#dc2626'];
    
    for (let i = 0; i < 100; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 3 + 's';
      confetti.style.animationDuration = (2 + Math.random() * 3) + 's';
      container.appendChild(confetti);
    }

    // Create fireworks
    const createFirework = (x: number, y: number, delay: number) => {
      setTimeout(() => {
        for (let i = 0; i < 20; i++) {
          const particle = document.createElement('div');
          particle.className = 'firework-particle';
          particle.style.left = x + '%';
          particle.style.top = y + '%';
          const angle = (Math.PI * 2 * i) / 20;
          const velocity = 50 + Math.random() * 50;
          const vx = Math.cos(angle) * velocity;
          const vy = Math.sin(angle) * velocity;
          particle.style.setProperty('--vx', vx + 'px');
          particle.style.setProperty('--vy', vy + 'px');
          particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          container.appendChild(particle);
          
          setTimeout(() => particle.remove(), 1000);
        }
      }, delay);
    };

    // Create multiple fireworks
    createFirework(20, 30, 500);
    createFirework(80, 40, 1000);
    createFirework(50, 20, 1500);
    createFirework(30, 60, 2000);
    createFirework(70, 50, 2500);

    return () => {
      const confetti = container.querySelectorAll('.confetti');
      const particles = container.querySelectorAll('.firework-particle');
      confetti.forEach(el => el.remove());
      particles.forEach(el => el.remove());
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <>
      <style>{`
        .newyear-animation-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          pointer-events: none;
          z-index: 999;
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          opacity: 0.9;
          animation: confettiFall linear infinite;
        }

        .confetti:nth-child(odd) {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .confetti:nth-child(even) {
          width: 12px;
          height: 4px;
          border-radius: 2px;
        }

        .firework-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          animation: fireworkExplode 1s ease-out forwards;
        }

        .newyear-text-letter {
          position: fixed;
          top: 45%;
          left: 50%;
          transform: translateX(-50%);
          font-size: 64px;
          font-weight: 900;
          color: #fff;
          text-shadow: 
            0 0 10px #dc2626,
            0 0 20px #ef4444,
            0 0 30px #f87171,
            0 0 40px #dc2626,
            0 0 50px #991b1b,
            0 0 60px #dc2626;
          z-index: 1001;
          pointer-events: none;
          text-align: center;
          white-space: nowrap;
          letter-spacing: 8px;
        }

        .newyear-year {
          position: fixed;
          top: 60%;
          left: 50%;
          transform: translateX(-50%);
          font-size: 120px;
          font-weight: 900;
          color: #fff;
          text-shadow: 
            0 0 15px #dc2626,
            0 0 30px #ef4444,
            0 0 45px #f87171,
            0 0 60px #dc2626,
            0 0 75px #991b1b,
            0 0 90px #dc2626;
          z-index: 1002;
          pointer-events: none;
          text-align: center;
          white-space: nowrap;
          letter-spacing: 20px;
          animation: yearPulse 2s ease-in-out infinite;
        }

        .newyear-year span {
          display: inline-block;
          opacity: 0;
          animation: yearPop 0.6s ease-out forwards;
        }

        @keyframes yearPulse {
          0%, 100% {
            transform: translateX(-50%) scale(1);
            filter: brightness(1);
          }
          50% {
            transform: translateX(-50%) scale(1.05);
            filter: brightness(1.2);
          }
        }

        @keyframes yearPop {
          0% {
            opacity: 0;
            transform: translateY(50px) scale(0.2) rotate(-15deg);
          }
          60% {
            transform: translateY(-20px) scale(1.4) rotate(10deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0deg);
          }
        }

        .newyear-text-letter span {
          display: inline-block;
          opacity: 0;
          animation: letterPop 0.5s ease-out forwards;
        }

        @keyframes letterPop {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.3) rotate(-10deg);
          }
          60% {
            transform: translateY(-15px) scale(1.3) rotate(5deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0deg);
          }
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes fireworkExplode {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--vx), var(--vy)) scale(0);
            opacity: 0;
          }
        }

      `}</style>
      <div ref={containerRef} className="newyear-animation-container"></div>
      
      {/* Happy New Year Text - Letter by letter */}
      <div className="newyear-text-letter">
        {displayedText.split('').map((letter, index) => (
          <span 
            key={index} 
            style={{ 
              animationDelay: `${index * 0.15}s`,
              animationFillMode: 'forwards'
            }}
          >
            {letter === ' ' ? '\u00A0' : letter}
          </span>
        ))}
      </div>

      {/* 2026 Year Section */}
      <div className="newyear-year">
        {displayedYear.split('').map((digit, index) => (
          <span 
            key={index} 
            style={{ 
              animationDelay: `${index * 0.2}s`,
              animationFillMode: 'forwards'
            }}
          >
            {digit}
          </span>
        ))}
      </div>
    </>
  );
}

