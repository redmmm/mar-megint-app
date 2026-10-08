import { cn } from '@/lib/utils';
import { ReactNode, MouseEvent } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'green' | 'red';
  hover?: boolean;
  size?: 'default' | 'large' | 'featured';
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}

export const GlassCard = ({
  children,
  className,
  variant = 'default',
  hover = true,
  size = 'default',
  onClick
}: GlassCardProps) => {
  return (
    <div
      className={cn(
        'premium-glass p-6 transition-all duration-350',
        hover && 'premium-glass-hover cursor-pointer',
        size === 'large' && 'p-8',
        size === 'featured' && 'p-10 col-span-2 row-span-2',
        variant === 'green' && 'premium-glass-green',
        variant === 'red' && 'premium-glass-red',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
