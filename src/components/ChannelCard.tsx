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
          {variant === 'a' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M3 12c4-2 14-2 18 0" />
              <circle cx="7" cy="15" r="2" />
              <circle cx="17" cy="15" r="2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="6" y1="12" x2="10" y2="12" />
              <line x1="8" y1="10" x2="8" y2="14" />
              <circle cx="15" cy="13" r="1" />
              <circle cx="18" cy="11" r="1" />
              <rect x="2" y="6" width="20" height="12" rx="3" />
            </svg>
          )}
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
