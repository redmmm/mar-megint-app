import { useParams, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { VideoCard } from '@/components/VideoCard';
import { NewVideosBadge } from '@/components/NewVideosBadge';
import PremiumBackground from '@/components/PremiumBackground';
import { useYouTubeVideos } from '@/hooks/useYouTubeData';
import { CHANNELS, ChannelTag } from '@/lib/youtube';
import { useSEO } from '@/hooks/useSEO';
import { Loader2, Video, AlertCircle } from 'lucide-react';

const ChannelDashboard = () => {
  const { slug } = useParams<{ slug: string }>();

  // Find channel by slug
  const channel = Object.values(CHANNELS).find(c => c.slug === slug);
  const channelTag = (channel?.tag || 'marmegint') as ChannelTag;
  const variant = channelTag === 'marmegint' ? 'a' : 'b';

  useSEO({
    title: channel ? `${channel.name} | Hivatalos Videók - Már megint? Hub` : 'Már megint? Hub',
    description: variant === 'a'
      ? 'A Már megint? csatorna hivatalos oldala: skate videók, vlogok és a győri gördeszkás közösség egy helyen!'
      : 'A Már megint játszunk? csatorna hivatalos oldala: gameplay videók és szórakozás egy helyen!',
    keywords: variant === 'a'
      ? 'már megint, már megint?, marmegint, skate, gördeszka, győr skatemap, győri gördeszkázás, marmegint videók'
      : 'már megint játszunk, már megint játszunk?, marmegint gaming, gameplay videók, játéktesztek',
    ogTitle: channel ? `${channel.name} - Már megint? Hub` : 'Már megint? Hub',
  });
  
  const {
    data: videos,
    isLoading: videosLoading,
    error: videosError,
    hasNewVideos,
    markVideosAsSeen,
  } = useYouTubeVideos(channelTag);

  const handleNewVideosClick = () => {
    markVideosAsSeen();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!channel) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen relative">
      <PremiumBackground />
      <Header showBack title={channel.name} />
      
      <main className="relative z-10 pt-24 pb-24 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Section: Latest Videos */}
          <section>
            <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
              <div className="premium-glass p-2.5 rounded-full inline-flex items-center justify-center text-white">
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
                  <div key={video.id} className="animate-fade-in-up w-full min-w-0" style={{ animationDelay: `${0.07 * idx}s` }}>
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
        </div>
      </main>
      
      {/* New videos notification */}
      {hasNewVideos && (
        <NewVideosBadge onClick={handleNewVideosClick} />
      )}
    </div>
  );
};

export default ChannelDashboard;