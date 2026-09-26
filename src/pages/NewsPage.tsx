import { useState } from 'react';
import { NewsCard } from '@/components/NewsCard';
import { NewsModal } from '@/components/NewsModal';
import { FilterTabs, FilterValue } from '@/components/FilterTabs';
import FloatingNav from '@/components/FloatingNav';
import PremiumBackground from '@/components/PremiumBackground';
import { useNews, NewsPost } from '@/hooks/useNews';
import { useSEO } from '@/hooks/useSEO';
import { Loader2, Newspaper } from 'lucide-react';

const NewsPage = () => {
  useSEO({
    title: 'Hírek és Bejelentések | Már megint? & Győr Skate Map',
    description: 'A legfrissebb hírek, bejelentések és események a Már megint? és Már megint játszunk? csapatától.',
    keywords: 'már megint hírek, már megint játszunk bejelentések, skate hírek győr, győr skatemap hírek',
    ogTitle: 'Hírek & Bejelentések - Már megint? Hub',
  });

  const [filter, setFilter] = useState<FilterValue>('all');
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);
  const { data: news, isLoading } = useNews(filter);

  return (
    <div className="min-h-screen relative">
      {/* Neutral non-coloured atmospheric background */}
      <PremiumBackground variant="neutral" />
      
      <main className="relative z-10 pt-10 pb-28 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-10 animate-fade-in flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-sm mb-3">
                Hírek
              </h1>
              <p className="text-neutral-400 text-base md:text-lg max-w-xl">
                A legfrissebb hírek és bejelentések mindkét csatornáról
              </p>
            </div>
            
            {/* Filter Tabs */}
            <div className="shrink-0">
              <FilterTabs value={filter} onChange={setFilter} />
            </div>
          </div>
          
          {/* News Grid */}
          {isLoading ? (
            <div className="bg-neutral-950/70 border border-white/10 rounded-[2rem] backdrop-blur-xl flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
              <span className="text-neutral-400 text-sm font-medium">Hírek betöltése...</span>
            </div>
          ) : news && news.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((post, idx) => (
                <div key={post.id} className="animate-fade-in h-full" style={{ animationDelay: `${0.04 * idx}s` }}>
                  <NewsCard
                    post={post}
                    showTag
                    onClick={() => setSelectedPost(post)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-950/70 border border-white/10 rounded-[2rem] backdrop-blur-xl text-center py-24 text-neutral-400">
              <Newspaper className="w-14 h-14 mx-auto mb-4 opacity-40 text-neutral-300" />
              <p className="text-lg font-semibold text-neutral-300">Nincsenek hírek a kiválasztott szűrőhöz</p>
              <p className="text-sm text-neutral-500 mt-1">Próbálj másik kategóriát választani a fenti szűrőben.</p>
            </div>
          )}
        </div>
      </main>

      {/* News Modal */}
      {selectedPost && (
        <NewsModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}

      <FloatingNav />
    </div>
  );
};

export default NewsPage;