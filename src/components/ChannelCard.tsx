import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import SpotlightCard from '@/components/SpotlightCard';
import marmegintLogo from '/marmegint-logo.jpg';
import jatszunkLogo from '/jatszunk-logo.png';

interface ChannelCardProps {
  name: string;
  slug: string;
  variant: 'a' | 'b';
  description: string;
}

export const ChannelCard = ({ name, slug, variant, description }: ChannelCardProps) => {
  const navigate = useNavigate();

  const emoji = variant === 'a' ? '🛹' : '🎮';
  
  // Left (IRL): #5c9884 | Right (gameplay): #b0223b
  const isA = variant === 'a';
  const spotlightColor = isA ? 'rgba(92, 152, 132, 0.35)' : 'rgba(176, 34, 59, 0.35)';

  return (
    <SpotlightCard
      spotlightColor={spotlightColor}
      onClick={() => navigate(`/channel/${slug}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/channel/${slug}`);
        }
      }}
      className={cn(
        'group cursor-pointer select-none w-full h-full min-h-[460px] md:min-h-full',
        'flex flex-col items-center justify-center p-8 md:p-12 lg:p-14 text-center',
        'rounded-[2rem] border border-white/10',
        'bg-neutral-950/70 backdrop-blur-xl',
        'transition-all duration-500 focus:outline-none focus-visible:ring-2',
        isA
          ? 'hover:border-[#5c9884]/60 hover:shadow-[0_0_60px_rgba(92,152,132,0.25)] focus-visible:ring-[#5c9884]/60'
          : 'hover:border-[#b0223b]/60 hover:shadow-[0_0_60px_rgba(176,34,59,0.25)] focus-visible:ring-[#b0223b]/60'
      )}
    >
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center w-full">
        {/* Profile Image */}
        <div className="relative mb-5">
          <img
            src={isA ? marmegintLogo : jatszunkLogo}
            alt={isA ? 'Már megint Logo' : 'Már megint játszunk Logo'}
            className={cn(
              'w-24 h-24 rounded-full border-2 border-white/20 shadow-2xl object-cover transition-all duration-500',
              isA
                ? 'group-hover:border-[#5c9884] group-hover:shadow-[0_0_30px_rgba(92,152,132,0.5)]'
                : 'group-hover:border-[#b0223b] group-hover:shadow-[0_0_30px_rgba(176,34,59,0.5)]'
            )}
          />
        </div>

        {/* Channel indicator badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider mb-6 premium-glass text-white transition-all duration-350 group-hover:border-white/20">
          <span className="text-base">{emoji}</span>
          <span>CSATORNA</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-black text-center mb-4 tracking-tight text-white drop-shadow-sm">
          {name}
        </h2>

        {/* Description */}
        <p className="text-neutral-400 text-sm md:text-base leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      </div>
    </SpotlightCard>
  );
};
