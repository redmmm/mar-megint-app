import FloatingNav from '@/components/FloatingNav';
import PremiumBackground from '@/components/PremiumBackground';
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
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Non-coloured atmospheric background (no green or red tints) */}
      <PremiumBackground variant="neutral" />

      {/* Visually hidden h1 for SEO & accessibility */}
      <h1 className="sr-only">Gördeszkás Időjárás Győr - Már megint?</h1>

      <main className="relative z-10 w-full max-w-xl px-4 py-16 pb-28">
        {/* Weather Check Card */}
        <WeatherCheck />
      </main>

      <FloatingNav />
    </div>
  );
};

export default WeatherPage;
