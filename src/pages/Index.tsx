import { ChannelCard } from '@/components/ChannelCard';
import DotGrid from '@/components/DotGrid';
import FloatingNav from '@/components/FloatingNav';
import { Footer } from '@/components/Footer';

const Index = () => {
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
