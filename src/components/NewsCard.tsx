import { Calendar, Tag } from 'lucide-react';
import { NewsPost } from '@/hooks/useNews';
import { formatDistanceToNow } from 'date-fns';
import { hu } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import SpotlightCard from './SpotlightCard';

interface NewsCardProps {
  post: NewsPost;
  onClick: () => void;
  showTag?: boolean;
  tall?: boolean;
}

export const NewsCard = ({ post, showTag = false, tall = false, onClick }: NewsCardProps) => {
  const isA = post.category === 'marmegint';
  const channelName = isA ? 'Már megint?' : 'Már megint játszunk?';
  const spotlightColor = isA ? 'rgba(92, 152, 132, 0.35)' : 'rgba(176, 34, 59, 0.35)';

  return (
    <SpotlightCard
      spotlightColor={spotlightColor}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'group cursor-pointer select-none overflow-hidden h-full flex flex-col justify-between',
        'rounded-[2rem] border border-white/10',
        'bg-neutral-950/70 backdrop-blur-xl',
        'transition-all duration-500 focus:outline-none focus-visible:ring-2',
        isA
          ? 'hover:border-[#5c9884]/60 hover:shadow-[0_0_50px_rgba(92,152,132,0.22)] focus-visible:ring-[#5c9884]/60'
          : 'hover:border-[#b0223b]/60 hover:shadow-[0_0_50px_rgba(176,34,59,0.22)] focus-visible:ring-[#b0223b]/60',
        tall && 'md:row-span-2'
      )}
    >
      {/* Top Image if present */}
      {post.image_url && (
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl m-3.5 mb-0 border border-white/10',
            tall ? 'aspect-[4/3]' : 'aspect-video'
          )}
        >
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      )}

      {/* Content */}
      <div className={cn('relative z-10 p-6 flex flex-col flex-1 justify-between', !post.image_url && 'pt-7')}>
        <div>
          {/* Tags & Date */}
          <div className="flex items-center flex-wrap gap-2.5 mb-3.5">
            {showTag && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide transition-all duration-300',
                  isA
                    ? 'bg-[#5c9884]/15 text-[#a8d3c5] border border-[#5c9884]/30'
                    : 'bg-[#b0223b]/15 text-[#f5a1af] border border-[#b0223b]/30'
                )}
              >
                <Tag className="w-3 h-3" />
                <span>{channelName}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
              <Calendar className="w-3 h-3" />
              <span>
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                  locale: hu,
                })}
              </span>
            </span>
          </div>

          {/* Title */}
          <h3
            className={cn(
              'font-black mb-2.5 line-clamp-2 text-white tracking-tight drop-shadow-sm transition-colors duration-300',
              isA ? 'group-hover:text-[#c4e5dc]' : 'group-hover:text-[#fcc2cc]',
              tall ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'
            )}
          >
            {post.title}
          </h3>

          {/* Content preview */}
          <p
            className={cn(
              'text-neutral-400 text-sm leading-relaxed',
              tall ? 'line-clamp-4' : 'line-clamp-3'
            )}
          >
            {post.content}
          </p>
        </div>

        {/* Read More link */}
        <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs font-bold text-neutral-300 group-hover:text-white transition-colors">
          <span>Elolvasom</span>
          <span className="transform transition-transform duration-300 group-hover:translate-x-1">→</span>
        </div>
      </div>
    </SpotlightCard>
  );
};