import { ChannelCard } from '@/components/ChannelCard';
import DotGrid from '@/components/DotGrid';
import FloatingNav from '@/components/FloatingNav';
import { Footer } from '@/components/Footer';
import { useSEO } from '@/hooks/useSEO';

const Index = () => {
  useSEO({
    title: 'Győr Skate Map & Már megint? Hub | Győri Gördeszkás Térkép és Közösség',
    description: 'A hivatalos Győr Skate Map és Már megint? Hub. Fedezd fel Győr legjobb gördeszkás helyeit, street spotjait, skateparkjait, a legújabb videókat és gördeszkás időjárást!',
    keywords: 'győr skatemap, győri skate map, skatemap győr, győr gördeszka, győri skatepark, skate spotok győr, már megint, már megint játszunk, marmegint hub',
    ogTitle: 'Győr Skate Map & Már megint? Hub | Győri Gördeszkás Térkép',
  });

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Interactive DotGrid Background */}
      <div className="fixed inset-0 -z-10 w-full h-full pointer-events-none">
        <DotGrid
          dotSize={3}
          gap={18}
          proximity={110}
          shockRadius={220}
          shockStrength={4}
          returnDuration={1.2}
        />
      </div>

      {/* Visually Hidden SEO Heading for Google Crawlers */}
      <h1 className="sr-only">Győr Skate Map &amp; Már megint? Hub - Hivatalos Győri Gördeszkás Térkép</h1>

      {/* Centered Container with Fixed Height */}
      <main className="relative z-10 w-full max-w-6xl px-4">
        <div className="h-[70vh] grid md:grid-cols-2 gap-8">
          {/* Left Panel - Már megint? */}
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <ChannelCard
              name="Már megint?"
              slug="marmegint"
              variant="a"
              description="Skate, vlogok és IRL tartalmak. Csekkold a híreket és a legújabb videókat egy helyen!"
            />
          </div>

          {/* Right Panel - Már megint játszunk? */}
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <ChannelCard
              name="Már megint játszunk?"
              slug="jatszunk"
              variant="b"
              description="Gameplay és minden ami gaming. Csekkold a híreket és a legújabb videókat egy helyen!"
            />
          </div>
        </div>
      </main>

      <FloatingNav />
      <Footer />
    </div>
  );
};

export default Index;
