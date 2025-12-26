import { useEffect, useRef } from 'react';

interface WarehouseSetupAnimationProps {
  isActive?: boolean;
}

export function WarehouseSetupAnimation({ isActive = true }: WarehouseSetupAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const boxes: HTMLDivElement[] = [];

    // Create warehouse boxes animation
    const createBox = (index: number) => {
      const box = document.createElement('div');
      box.className = 'warehouse-box';
      box.style.left = `${20 + (index % 4) * 20}%`;
      box.style.top = `${30 + Math.floor(index / 4) * 15}%`;
      box.style.animationDelay = `${index * 0.1}s`;
      container.appendChild(box);
      boxes.push(box);
    };

    // Create 12 boxes
    for (let i = 0; i < 12; i++) {
      createBox(i);
    }

    // Create building structure
    const building = document.createElement('div');
    building.className = 'warehouse-building';
    container.appendChild(building);

    // Create checkmark overlay
    setTimeout(() => {
      const checkmark = document.createElement('div');
      checkmark.className = 'warehouse-checkmark';
      container.appendChild(checkmark);
    }, 2000);

    return () => {
      boxes.forEach(box => box.remove());
      const building = container.querySelector('.warehouse-building');
      const checkmark = container.querySelector('.warehouse-checkmark');
      if (building) building.remove();
      if (checkmark) checkmark.remove();
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <>
      <style>{`
        .warehouse-animation-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          pointer-events: none;
          z-index: 998;
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
        }

        .warehouse-building {
          position: absolute;
          bottom: 20%;
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          height: 150px;
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          border: 3px solid #1e3a8a;
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          animation: buildUp 1.5s ease-out;
        }

        .warehouse-building::before {
          content: '';
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 100px solid transparent;
          border-right: 100px solid transparent;
          border-bottom: 30px solid #1e40af;
          animation: roofBuild 1s ease-out 0.5s both;
        }

        .warehouse-building::after {
          content: '🏭';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 60px;
          opacity: 0;
          animation: fadeInScale 0.5s ease-out 1.5s both;
        }

        .warehouse-box {
          position: absolute;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          border: 2px solid #d97706;
          border-radius: 4px;
          opacity: 0;
          transform: scale(0) rotate(0deg);
          animation: boxAppear 0.6s ease-out forwards, boxFloat 2s ease-in-out infinite;
        }

        .warehouse-box::before {
          content: '📦';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 24px;
        }

        .warehouse-checkmark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0);
          width: 80px;
          height: 80px;
          background: #10b981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 50px;
          color: white;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.6);
          animation: checkmarkPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 2s both;
        }

        @keyframes buildUp {
          0% {
            height: 0;
            opacity: 0;
          }
          100% {
            height: 150px;
            opacity: 1;
          }
        }

        @keyframes roofBuild {
          0% {
            width: 0;
            opacity: 0;
          }
          100% {
            width: 200px;
            opacity: 1;
          }
        }

        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes boxAppear {
          0% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(360deg);
          }
        }

        @keyframes boxFloat {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.05);
          }
        }

        @keyframes checkmarkPop {
          0% {
            transform: translate(-50%, -50%) scale(0);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
      <div ref={containerRef} className="warehouse-animation-container"></div>
    </>
  );
}

