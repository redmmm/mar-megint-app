import { ListVideo, Play } from 'lucide-react';
import { YouTubePlaylist } from '@/lib/youtube';
import { cn } from '@/lib/utils';

interface PlaylistCardProps {
  playlist: YouTubePlaylist;
  variant?: 'a' | 'b';
}

export const PlaylistCard = ({ playlist, variant = 'a' }: PlaylistCardProps) => {
  const handleClick = () => {
    if (playlist.id.startsWith('playlist')) {
      return;
    }
    window.open(`https://www.youtube.com/playlist?list=${playlist.id}`, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className="group w-full text-left premium-glass premium-glass-hover p-4 focus:outline-none"
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="relative w-32 aspect-video rounded-2xl overflow-hidden shrink-0">
          <img
            src={playlist.thumbnail}
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center">
            <ListVideo className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{playlist.itemCount} videó</span>
          </div>
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2 mb-1 text-gradient">
            {playlist.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {playlist.description || 'Lejátszási lista'}
          </p>
          
          {/* Play button */}
          <div className={cn(
            'inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300',
            'premium-glass border border-white/20 text-white backdrop-blur-md shadow-sm',
            variant === 'a' 
              ? 'hover:border-[#5c9884]/60 hover:text-emerald-300' 
              : 'hover:border-[#b0223b]/60 hover:text-rose-300'
          )}>
            <Play className="w-3 h-3 fill-current" />
            <span>Lejátszás</span>
          </div>
        </div>
      </div>
    </button>
  );
};
