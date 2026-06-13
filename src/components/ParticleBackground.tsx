import { useEffect, useState } from 'react';

interface Particle {
  id: string;
  x: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  emoji?: string;
}

const ParticleBackground = () => {
  const [leftParticles, setLeftParticles] = useState<Particle[]>([]);
  const [rightParticles, setRightParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate left side particles (green dots + skateboards)
    const leftDots: Particle[] = [];
    const leftEmojis: Particle[] = [];

    // Green dots
    for (let i = 0; i < 20; i++) {
      leftDots.push({
        id: `left-dot-${i}`,
        x: Math.random() * 50, // 0-50% of screen width
        size: Math.random() * 6 + 2, // 2-8px
        opacity: Math.random() * 0.6 + 0.2, // 0.2-0.8
        duration: Math.random() * 10 + 10, // 10-20s
        delay: Math.random() * -20, // -20 to 0s delay
      });
    }

    // Skateboard emojis
    for (let i = 0; i < 5; i++) {
      leftEmojis.push({
        id: `left-emoji-${i}`,
        x: Math.random() * 50,
        size: Math.random() * 20 + 20, // 20-40px (emoji size)
        opacity: Math.random() * 0.4 + 0.3, // 0.3-0.7
        duration: Math.random() * 15 + 10, // 10-25s
        delay: Math.random() * -25,
        emoji: '🛹',
      });
    }

    // Generate right side particles (red dots + controllers)
    const rightDots: Particle[] = [];
    const rightEmojis: Particle[] = [];

    // Red dots
    for (let i = 0; i < 20; i++) {
      rightDots.push({
        id: `right-dot-${i}`,
        x: 50 + Math.random() * 50, // 50-100% of screen width
        size: Math.random() * 6 + 2, // 2-8px
        opacity: Math.random() * 0.6 + 0.2, // 0.2-0.8
        duration: Math.random() * 10 + 10, // 10-20s
        delay: Math.random() * -20, // -20 to 0s delay
      });
    }

    // Controller emojis
    for (let i = 0; i < 5; i++) {
      rightEmojis.push({
        id: `right-emoji-${i}`,
        x: 50 + Math.random() * 50,
        size: Math.random() * 20 + 20, // 20-40px (emoji size)
        opacity: Math.random() * 0.4 + 0.3, // 0.3-0.7
        duration: Math.random() * 15 + 10, // 10-25s
        delay: Math.random() * -25,
        emoji: '🎮',
      });
    }

    setLeftParticles([...leftDots, ...leftEmojis]);
    setRightParticles([...rightDots, ...rightEmojis]);
  }, []);

  return (
    <>
      {/* CSS Animation Definition */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(100vh) scale(0.8);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-10vh) scale(1.2);
            opacity: 0;
          }
        }

        .animate-float {
          animation-name: floatUp;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>

      {/* Particle Container */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Left Side Particles */}
        {leftParticles.map((particle) => (
          <div
            key={particle.id}
            className="absolute animate-float"
            style={{
              left: `${particle.x}%`,
              width: particle.emoji ? `${particle.size}px` : `${particle.size}px`,
              height: particle.emoji ? `${particle.size}px` : `${particle.size}px`,
              backgroundColor: particle.emoji ? 'transparent' : 'hsl(142, 70%, 45%)',
              borderRadius: particle.emoji ? '0' : '50%',
              opacity: particle.opacity,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {particle.emoji && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-[#22c55e]">
                <path d="M3 12c4-2 14-2 18 0" />
                <circle cx="7" cy="15" r="2.5" />
                <circle cx="17" cy="15" r="2.5" />
              </svg>
            )}
          </div>
        ))}

        {/* Right Side Particles */}
        {rightParticles.map((particle) => (
          <div
            key={particle.id}
            className="absolute animate-float"
            style={{
              left: `${particle.x}%`,
              width: particle.emoji ? `${particle.size}px` : `${particle.size}px`,
              height: particle.emoji ? `${particle.size}px` : `${particle.size}px`,
              backgroundColor: particle.emoji ? 'transparent' : 'hsl(0, 85%, 60%)',
              borderRadius: particle.emoji ? '0' : '50%',
              opacity: particle.opacity,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {particle.emoji && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-[#ef4444]">
                <line x1="6" y1="12" x2="10" y2="12" />
                <line x1="8" y1="10" x2="8" y2="14" />
                <circle cx="15" cy="13" r="1" />
                <circle cx="18" cy="11" r="1" />
                <rect x="2" y="6" width="20" height="12" rx="3" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default ParticleBackground;
