interface PremiumBackgroundProps {
  withParticles?: boolean;
}

const PremiumBackground = ({ withParticles = false }: PremiumBackgroundProps) => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-background">
      {/* Deep radial gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, hsl(0 0% 8%) 0%, hsl(0 0% 4%) 50%, hsl(0 0% 2%) 100%)'
        }}
      />

      {/* Green orb - left side */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full animate-orb-drift"
        style={{
          left: '10%',
          top: '20%',
          background: 'radial-gradient(circle, hsl(142 70% 45% / 0.15) 0%, hsl(142 70% 45% / 0.05) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Red orb - right side */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full animate-orb-drift"
        style={{
          right: '10%',
          bottom: '20%',
          background: 'radial-gradient(circle, hsl(0 85% 60% / 0.15) 0%, hsl(0 85% 60% / 0.05) 40%, transparent 70%)',
          filter: 'blur(80px)',
          animationDelay: '-12s',
          animationDirection: 'reverse',
        }}
      />

      {/* Secondary smaller green orb */}
      <div
        className="absolute w-[300px] h-[300px] rounded-full animate-orb-drift"
        style={{
          left: '30%',
          bottom: '10%',
          background: 'radial-gradient(circle, hsl(142 70% 50% / 0.1) 0%, transparent 60%)',
          filter: 'blur(60px)',
          animationDelay: '-8s',
        }}
      />

      {/* Secondary smaller red orb */}
      <div
        className="absolute w-[350px] h-[350px] rounded-full animate-orb-drift"
        style={{
          right: '25%',
          top: '10%',
          background: 'radial-gradient(circle, hsl(0 85% 55% / 0.1) 0%, transparent 60%)',
          filter: 'blur(60px)',
          animationDelay: '-18s',
          animationDirection: 'reverse',
        }}
      />

      {/* Animated Particles with Emojis */}
      {withParticles && (
        <>
          {/* Left/Top: Green dots + Skateboard emojis */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`green-particle-${i}`}
              className="absolute w-2 h-2 bg-green-400 rounded-full animate-particle-float"
              style={{
                left: `${15 + Math.random() * 25}%`,
                top: `${10 + Math.random() * 40}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${8 + Math.random() * 4}s`,
              }}
            />
          ))}

          {/* Left/Top: Skateboard emojis */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`skateboard-${i}`}
              className="absolute text-2xl opacity-60 animate-particle-float"
              style={{
                left: `${20 + Math.random() * 20}%`,
                top: `${15 + Math.random() * 35}%`,
                animationDelay: `${Math.random() * 12}s`,
                animationDuration: `${10 + Math.random() * 6}s`,
              }}
            >
              🛹
            </div>
          ))}

          {/* Right/Bottom: Red dots + Controller emojis */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`red-particle-${i}`}
              className="absolute w-2 h-2 bg-red-400 rounded-full animate-particle-float"
              style={{
                right: `${15 + Math.random() * 25}%`,
                bottom: `${10 + Math.random() * 40}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${8 + Math.random() * 4}s`,
              }}
            />
          ))}

          {/* Right/Bottom: Controller emojis */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`controller-${i}`}
              className="absolute text-2xl opacity-60 animate-particle-float"
              style={{
                right: `${20 + Math.random() * 20}%`,
                bottom: `${15 + Math.random() * 35}%`,
                animationDelay: `${Math.random() * 12}s`,
                animationDuration: `${10 + Math.random() * 6}s`,
              }}
            >
              🎮
            </div>
          ))}
        </>
      )}

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default PremiumBackground;
