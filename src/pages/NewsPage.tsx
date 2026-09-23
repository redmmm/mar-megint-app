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
      <PremiumBackground />
      
      <main className="relative z-10 pt-8 pb-24 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-accent text-accent-foreground mb-6">
              <Newspaper className="w-4 h-4" />
              <span>HÍREK</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gradient mb-4">
              Hírek
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mb-8">
              A legfrissebb hírek és bejelentések mindkét csatornáról
            </p>
            
            {/* Filter */}
            <FilterTabs value={filter} onChange={setFilter} />
          </div>
          
          {/* News Grid */}
          {isLoading ? (
            <div className="premium-glass flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : news && news.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {news.map((post, idx) => (
                <div key={post.id} className="animate-fade-in" style={{ animationDelay: `${0.05 * idx}s` }}>
                  <NewsCard
                    post={post}
                    showTag
                    onClick={() => setSelectedPost(post)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="premium-glass text-center py-20 text-muted-foreground">
              <Newspaper className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Nincsenek hírek a kiválasztott szűrőhöz</p>
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