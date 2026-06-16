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
              fontSize: particle.emoji ? `${particle.size}px` : 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {particle.emoji}
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
              fontSize: particle.emoji ? `${particle.size}px` : 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {particle.emoji}
          </div>
        ))}
      </div>
    </>
  );
};

export default ParticleBackground;
