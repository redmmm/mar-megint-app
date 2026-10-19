import { Play, Clock } from 'lucide-react';
import { YouTubeVideo } from '@/lib/youtube';
import { formatDistanceToNow } from 'date-fns';
import { hu } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface VideoCardProps {
  video: YouTubeVideo;
  variant?: 'a' | 'b';
  featured?: boolean;
}

export const VideoCard = ({ video, variant = 'a', featured = false }: VideoCardProps) => {
  const handleClick = () => {
    if (video.id.startsWith('mock')) {
      return;
    }
    window.open(`https://www.youtube.com/watch?v=${video.id}`, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'group w-full text-left premium-glass premium-glass-hover overflow-hidden',
        featured && 'md:col-span-2 md:row-span-2'
      )}
    >
      {/* Thumbnail */}
      <div className={cn(
        'relative aspect-video overflow-hidden',
        featured ? 'rounded-t-3xl' : 'rounded-t-3xl'
      )}>
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-105"
        />
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-350 flex items-center justify-center">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-400 group-hover:scale-110 active:scale-95',
            'premium-glass border border-white/25 text-white shadow-2xl backdrop-blur-xl',
            'bg-gradient-to-b from-white/20 via-white/10 to-transparent',
            'shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_8px_32px_rgba(0,0,0,0.5)]',
            variant === 'a'
              ? 'group-hover:border-[#5c9884]/60 group-hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),0_0_30px_rgba(92,152,132,0.5)] group-hover:text-emerald-300'
              : 'group-hover:border-[#b0223b]/60 group-hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),0_0_30px_rgba(176,34,59,0.5)] group-hover:text-rose-300'
          )}>
            <Play className="w-7 h-7 ml-1 fill-current drop-shadow-md" />
          </div>
        </div>
        
        {/* Mock badge */}
        {video.id.startsWith('mock') && (
          <div className="absolute top-3 right-3 premium-glass px-3 py-1 rounded-full text-xs text-muted-foreground">
            Demo
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className={cn('p-4', featured && 'p-6')}>
        <h3 className={cn(
          'font-semibold line-clamp-2 mb-2 text-gradient transition-colors',
          featured ? 'text-lg md:text-xl' : 'text-sm'
        )}>
          {video.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>
            {formatDistanceToNow(new Date(video.publishedAt), { 
              addSuffix: true, 
              locale: hu 
            })}
          </span>
        </div>
      </div>
    </button>
  );
};
