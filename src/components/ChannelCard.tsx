import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  
  return (
    <button
      onClick={() => navigate(`/channel/${slug}`)}
      className={cn(
        'group relative w-full h-full min-h-[50vh] md:min-h-[80vh] overflow-hidden',
        'flex flex-col items-center justify-center p-8 md:p-12 lg:p-16',
        'transition-all duration-500 focus:outline-none',
        variant === 'a'
          ? 'premium-glass-green hover:glow-green'
          : 'premium-glass-red hover:glow-red'
      )}
    >
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        {/* Profile Image */}
        <img
          src={variant === 'a' ? marmegintLogo : jatszunkLogo}
          alt={variant === 'a' ? 'Már megint Logo' : 'Már megint játszunk Logo'}
          className="w-20 h-20 rounded-full border-2 border-white/20 shadow-lg object-cover mb-4"
        />

        {/* Channel indicator */}
        <div className={cn(
          'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-8',
          variant === 'a'
            ? 'bg-primary/20 text-primary'
            : 'bg-secondary/20 text-secondary'
        )}>
          <span className="text-lg">{emoji}</span>
          <span>CSATORNA</span>
        </div>

        {/* Title - Giant typography */}
        <h2 className={cn(
          'text-2xl md:text-3xl font-bold text-center mb-6',
          'text-gradient'
        )}>
          {name}
        </h2>

        <p className="text-muted-foreground text-base md:text-lg mb-10 max-w-md mx-auto">
          {description}
        </p>

        {/* CTA */}
        <div className={cn(
          'inline-flex items-center gap-3 px-6 py-3 rounded-full text-sm font-semibold',
          'transition-all duration-300 group-hover:gap-4',
          variant === 'a'
            ? 'bg-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
            : 'bg-secondary/20 text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground'
        )}>
          <span>Belépés</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
      
      {/* Background glow */}
      <div className={cn(
        'absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full blur-3xl',
        'opacity-0 group-hover:opacity-20 transition-opacity duration-700',
        variant === 'a' ? 'bg-primary' : 'bg-secondary'
      )} />
    </button>
  );
};
