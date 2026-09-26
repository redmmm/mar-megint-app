import { X } from 'lucide-react';
import { NewsPost } from '@/hooks/useNews';
import { formatDistanceToNow } from 'date-fns';
import { hu } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NewsModalProps {
  post: NewsPost;
  onClose: () => void;
}

export const NewsModal = ({ post, onClose }: NewsModalProps) => {
  const variant = post.category === 'marmegint' ? 'a' : 'b';
  const channelName = post.category === 'marmegint' ? 'Már megint?' : 'Már megint játszunk?';

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-2xl w-full max-h-[90vh] overflow-hidden bg-neutral-950/95 border border-white/15 rounded-[2rem] shadow-2xl backdrop-blur-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Image */}
        {post.image_url && (
          <div className="w-full h-64 sm:h-72 overflow-hidden border-b border-white/10">
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(90vh-16rem)]">
          {/* Metadata */}
          <div className="flex items-center gap-3 mb-4">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide',
              variant === 'a'
                ? 'bg-[#5c9884]/15 text-[#a8d3c5] border border-[#5c9884]/30'
                : 'bg-[#b0223b]/15 text-[#f5a1af] border border-[#b0223b]/30'
            )}>
              {channelName}
            </span>
            <span className="text-neutral-400 text-xs">
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
                locale: hu
              })}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-6 leading-tight">
            {post.title}
          </h2>

          {/* Body Text */}
          <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </div>
        </div>
      </div>
    </div>
  );
};
