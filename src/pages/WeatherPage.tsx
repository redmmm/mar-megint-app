import DotGrid from '@/components/DotGrid';
import { WeatherCheck } from '@/components/WeatherCheck';
import { useSEO } from '@/hooks/useSEO';

const WeatherPage = () => {
  useSEO({
    title: 'Gördeszkás Időjárás Győr | Mikor érdemes deszkázni? - Már megint?',
    description: 'Valós idejű gördeszkás időjárás előrejelzés Győrben: csapadék, szél és felület-száradási viszonyok, hogy tudd mikor a legjobb kimenni skate-elni!',
    keywords: 'gördeszkás időjárás győr, skate időjárás győr, deszkás időjárás, győr skatemap időjárás',
    ogTitle: 'Gördeszkás Időjárás Győr - Már megint? Hub',
  });

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-black">
      {/* Interactive DotGrid Background (White) */}
      <div className="fixed inset-0 z-0 w-full h-full pointer-events-none">
        <DotGrid
          dotSize={3}
          gap={18}
          proximity={110}
          shockRadius={220}
          shockStrength={4}
          returnDuration={1.2}
          colorScheme="white"
        />
      </div>

      {/* Visually hidden h1 for SEO & accessibility */}
      <h1 className="sr-only">Gördeszkás Időjárás Győr - Már megint?</h1>

      <main className="relative z-10 w-full max-w-xl px-4 py-16 pb-28">
        {/* Weather Check Card */}
        <WeatherCheck />
      </main>
    </div>
  );
};

export default WeatherPage;
