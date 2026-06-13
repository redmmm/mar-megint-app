import { Map, ExternalLink } from 'lucide-react';
import FloatingNav from '@/components/FloatingNav';
import PremiumBackground from '@/components/PremiumBackground';

const SkateMapPage = () => {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <PremiumBackground />

      <main className="relative z-10 pt-8 pb-24 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-12 animate-fade-in text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-accent text-accent-foreground mb-6 border border-white/5">
              <Map className="w-4 h-4 text-emerald-400" />
              <span className="tracking-wider text-xs font-bold">SKATE MAP</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gradient mb-4">
              Skate Map
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              A városod rejtett skate spotjai és parkjai egyetlen interaktív térképen. 
              Keresd meg a következő legális vagy utcai tipped, nézd meg hol deszkáznak a többiek, 
              vagy töltsd fel a saját felfedezéseidet. Ne csak gurulj, hódítsd meg a várost!
            </p>
          </div>

          {/* Premium Glass Map Card container */}
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <a
              href="https://gyorskatemap.hu/"
              target="_blank"
              rel="noopener noreferrer"
              className="block group relative w-full max-w-3xl aspect-[16/10] md:aspect-[16/9] mx-auto rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:border-emerald-500/30 hover:shadow-emerald-500/10 hover:shadow-3xl"
            >
              {/* Image Preview (The other side) */}
              <img
                src="/skate_map_preview.png"
                alt="Gyors Skate Map"
                className="w-full h-full object-cover transition-all duration-700 ease-out scale-105 group-hover:scale-100 blur-[3px] group-hover:blur-[1px] opacity-60 group-hover:opacity-85"
              />

              {/* Glass Refraction & Reflection Sweep overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-white/5 pointer-events-none" />
              <div className="absolute inset-0 backdrop-blur-[4px] group-hover:backdrop-blur-[1px] transition-all duration-500 pointer-events-none" />
              
              {/* Shine highlight animation on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

              {/* Liquid Glass Overlay Border highlight */}
              <div className="absolute inset-0 rounded-[2rem] border border-white/10 group-hover:border-white/20 transition-all duration-500 pointer-events-none" />
              <div className="absolute inset-px rounded-[1.95rem] border border-white/5 pointer-events-none" />

              {/* Central Premium Hover CTA Button */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/45 group-hover:bg-black/20 transition-colors duration-500">
                <div className="px-6 py-3.5 rounded-full bg-black/75 border border-white/10 backdrop-blur-lg text-white font-bold text-xs md:text-sm tracking-widest flex items-center gap-2 transform translate-y-3 group-hover:translate-y-0 opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:border-emerald-400 group-hover:text-emerald-400 shadow-lg group-hover:shadow-emerald-500/20">
                  <span>INTERAKTÍV TÉRKÉP MEGNYITÁSA</span>
                  <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </a>
          </div>
        </div>
      </main>

      <FloatingNav />
    </div>
  );
};

export default SkateMapPage;
