import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { VideoCard } from '@/components/VideoCard';
import { NewsCard } from '@/components/NewsCard';
import { NewsModal } from '@/components/NewsModal';
import { NewVideosBadge } from '@/components/NewVideosBadge';
import FloatingNav from '@/components/FloatingNav';
import PremiumBackground from '@/components/PremiumBackground';
import { useYouTubeVideos } from '@/hooks/useYouTubeData';
import { useNews, NewsPost } from '@/hooks/useNews';
import { CHANNELS, ChannelTag } from '@/lib/youtube';
import { Loader2, Video, Newspaper, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ChannelDashboard = () => {
  const { slug } = useParams<{ slug: string }>();
  const [selectedNews, setSelectedNews] = useState<NewsPost | null>(null);

  // Find channel by slug
  const channel = Object.values(CHANNELS).find(c => c.slug === slug);
  
  if (!channel) {
    return <Navigate to="/" replace />;
  }

  const channelTag = channel.tag as ChannelTag;
  const variant = channelTag === 'marmegint' ? 'a' : 'b';
  
  const {
    data: videos,
    isLoading: videosLoading,
    error: videosError,
    isFetching: videosFetching,
    hasNewVideos,
    markVideosAsSeen,
  } = useYouTubeVideos(channelTag);
  const { data: news, isLoading: newsLoading } = useNews(channelTag);

  const handleNewVideosClick = () => {
    markVideosAsSeen();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen relative">
      <PremiumBackground />
      <Header showBack title={channel.name} />
      
      <main className="relative z-10 pt-20 pb-24 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Channel Header */}
          <div className="mb-12 animate-fade-in">
            <div className={cn(
              'inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-sm font-medium mb-6',
              variant === 'a' 
                ? 'bg-primary/20 text-primary' 
                : 'bg-secondary/20 text-secondary'
            )}>
              <span className="text-xl">{variant === 'a' ? '🛹' : '🎮'}</span>
              <span>CSATORNA</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gradient mb-4 break-words">
              {channel.name}
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              A legújabb videók és hírek egy helyen
            </p>
          </div>
          
          {/* Section 1: Latest Videos */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className={cn(
                'p-2.5 rounded-2xl',
                variant === 'a' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'
              )}>
                <Video className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gradient">Legújabb videók</h2>
            </div>

            {videosLoading ? (
              <div className="premium-glass flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : videosError ? (
              <div className="premium-glass flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <AlertCircle className="w-5 h-5" />
                <span>Hiba történt a videók betöltése közben</span>
              </div>
            ) : videos && videos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.slice(0, 6).map((video, idx) => (
                  <div key={video.id} className="animate-fade-in" style={{ animationDelay: `${0.1 * idx}s` }}>
                    <VideoCard video={video} variant={variant} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="premium-glass text-center py-12 text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nincsenek elérhető videók</p>
              </div>
            )}
          </section>
          
          {/* Section 2: News */}
          {news && news.length > 0 && (
            <section className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className={cn(
                  'p-2.5 rounded-2xl',
                  variant === 'a' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'
                )}>
                  <Newspaper className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-gradient">Hírek</h2>
              </div>

              {newsLoading ? (
                <div className="premium-glass flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {news.map((post, idx) => (
                    <div key={post.id} className="animate-fade-in" style={{ animationDelay: `${0.1 * idx}s` }}>
                      <NewsCard
                        post={post}
                        onClick={() => setSelectedNews(post)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
      
      <FloatingNav />

      {/* New videos notification */}
      {hasNewVideos && (
        <NewVideosBadge onClick={handleNewVideosClick} />
      )}

      {/* News Modal */}
      {selectedNews && (
        <NewsModal
          post={selectedNews}
          onClose={() => setSelectedNews(null)}
        />
      )}
    </div>
  );
};

export default ChannelDashboard;