import { X } from 'lucide-react';
import { NewsPost } from '@/hooks/useNews';
import { formatDistanceToNow } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useEffect, useRef } from 'react';

interface NewsModalProps {
  post: NewsPost;
  onClose: () => void;
}

export const NewsModal = ({ post, onClose }: NewsModalProps) => {
  const channelName = post.category === 'marmegint' ? 'Már megint?' : 'Már megint játszunk?';
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Animate in on mount
  useEffect(() => {
    const backdrop = backdropRef.current;
    const content = contentRef.current;
    if (!backdrop || !content) return;

    // Initial state
    backdrop.style.transition = 'none';
    backdrop.style.opacity = '0';
    content.style.transition = 'none';
    content.style.opacity = '0';
    content.style.transform = 'scale(0.94) translateY(12px)';

    // Force reflow
    void backdrop.offsetHeight;

    // Animate to final state
    const ease = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    backdrop.style.transition = `opacity 0.35s ${ease}`;
    backdrop.style.opacity = '1';
    content.style.transition = `opacity 0.4s ${ease}, transform 0.45s ${ease}`;
    content.style.opacity = '1';
    content.style.transform = 'scale(1) translateY(0px)';
  }, []);

  // Animate out then call onClose
  const handleClose = () => {
    const backdrop = backdropRef.current;
    const content = contentRef.current;
    if (!backdrop || !content) {
      onClose();
      return;
    }

    const ease = 'cubic-bezier(0.4, 0, 0.2, 1)';
    backdrop.style.transition = `opacity 0.25s ${ease}`;
    backdrop.style.opacity = '0';
    content.style.transition = `opacity 0.25s ${ease}, transform 0.28s ${ease}`;
    content.style.opacity = '0';
    content.style.transform = 'scale(0.95) translateY(8px)';

    setTimeout(onClose, 280);
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ opacity: 0 }}
      onClick={handleBackdropClick}
    >
      <div
        ref={contentRef}
        className="relative max-w-2xl w-full max-h-[90vh] overflow-hidden bg-neutral-950/95 border border-white/15 rounded-[2rem] shadow-2xl backdrop-blur-2xl"
        style={{ opacity: 0, transform: 'scale(0.94) translateY(12px)' }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full premium-glass premium-glass-hover flex items-center justify-center text-white cursor-pointer"
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide premium-glass text-white">
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
