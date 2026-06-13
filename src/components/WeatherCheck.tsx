import { useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { getSkateWeatherCheck, WeatherData, searchHungarianCities, HungarianCityResult } from '@/services/weatherService';

type WeatherState = 'initial' | 'loading' | 'result';

export const WeatherCheck = () => {
  const [weatherState, setWeatherState] = useState<WeatherState>('initial');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search functionality state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HungarianCityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleCheckWeather = async () => {
    console.log('Button clicked - loading set to true');
    setWeatherState('loading');
    setError(null);

    try {
      const data = await getSkateWeatherCheck();
      setWeatherData(data);
      setWeatherState('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba történt');
      setWeatherState('initial');
    }
  };

  const handleReset = () => {
    setWeatherState('initial');
    setWeatherData(null);
    setError(null);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Search functionality
  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length >= 2) {
      setIsSearching(true);
      try {
        const results = await searchHungarianCities(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleCitySelect = async (city: HungarianCityResult) => {
    setWeatherState('loading');
    setError(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);

    try {
      // Fetch weather directly for selected city
      const { fetchWeatherFromOpenMeteo } = await import('@/services/weatherService');
      const cityWeatherData = await fetchWeatherFromOpenMeteo(city.latitude, city.longitude, city.name);
      setWeatherData(cityWeatherData);
      setWeatherState('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba történt');
      setWeatherState('initial');
    }
  };


  if (weatherState === 'result' && weatherData) {
    const variant = weatherData.canSkate ? 'green' : 'red';

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard size="large" variant={variant} className="w-full max-w-lg mx-auto">
          <div className="flex flex-col items-center w-full">
            {/* Weather Display (Top) */}
            <div className="flex flex-col items-center text-center">
              {/* Temperature Display */}
              <div className="flex items-center gap-4">
                <span className="text-6xl font-bold text-gradient">
                  {Math.round(weatherData.temp)}°
                </span>
                <span className="flex items-center justify-center">
                  {weatherData.canSkate ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-emerald-400">
                      <path d="M3 12c4-2 14-2 18 0" />
                      <circle cx="7" cy="15" r="2" />
                      <circle cx="17" cy="15" r="2" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-red-500 animate-bounce" style={{ animationDuration: '3s' }}>
                      <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
                      <line x1="8" y1="16" x2="8" y2="22" />
                      <line x1="12" y1="16" x2="12" y2="22" />
                      <line x1="16" y1="16" x2="16" y2="22" />
                    </svg>
                  )}
                </span>
              </div>

              {/* City */}
              <div className="flex flex-col items-center gap-1 mt-4">
                <p className="text-sm text-muted-foreground">{weatherData.city}</p>
                {weatherData.permissionDenied && (
                  <p className="text-xs text-red-500 font-medium">
                    Helyadatok visszautasítva. Alapértelmezett helyszín betöltve.
                  </p>
                )}
              </div>

              {/* Message */}
              <p className="text-lg font-medium leading-relaxed mt-4">
                {weatherData.conditionText}
              </p>

              {/* Reset Button */}
              <button
                onClick={handleReset}
                className="mt-6 px-6 py-2 bg-accent/50 hover:bg-accent rounded-full transition-colors"
              >
                Új ellenőrzés
              </button>
            </div>

            {/* Search Section (Middle) */}
            <div className="mt-6 w-full">
              {!showSearch ? (
                <button
                  onClick={() => setShowSearch(true)}
                  className="w-full px-4 py-2 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Város keresése</span>
                </button>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Város keresése..."
                      className="w-full p-3 bg-white/10 border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:bg-white/20 focus:border-white/50 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search Results Dropdown */}
                  {(searchResults.length > 0 || isSearching) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {isSearching ? (
                        <div className="px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Keresés...
                        </div>
                      ) : (
                        searchResults.map((city, index) => (
                          <button
                            key={index}
                            onClick={() => handleCitySelect(city)}
                            className="w-full px-4 py-2 text-left hover:bg-accent/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                          >
                            <span className="text-sm">{city.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Legal Text (Bottom) */}
            <p className="mt-4 text-center text-xs text-white/30 leading-relaxed">
              A helyadatokat (GPS/IP) kizárólag a pontos időjárás megjelenítéséhez használjuk. Az oldal ingyenes és reklámmentes, adataidat nem tároljuk.
            </p>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Initial state
  const isLoading = weatherState === 'loading';

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <GlassCard
        size="large"
        className="text-center"
      >
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center justify-center h-16">
            {isLoading ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-muted-foreground animate-spin">
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 text-yellow-500 animate-pulse">
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="M4.93 4.93l1.41 1.41" />
                <path d="M17.66 17.66l1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="M6.34 17.66l-1.41 1.41" />
                <path d="M19.07 4.93l-1.41 1.41" />
                <path d="M22 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
              </svg>
            )}
          </div>
          <h2 className="text-3xl font-bold text-gradient">
            Tudok deszkázni ma?
          </h2>
          <p className="text-muted-foreground max-w-sm">
            {isLoading
              ? 'Időjárás adatok lekérése...'
              : 'Ellenőrizd az időjárást és megtudod, hogy érdemes-e elővenni a deszkát!'
            }
          </p>
          <div className="mt-4">
            {isLoading ? (
              <div className="flex items-center gap-2 px-6 py-3 bg-muted text-muted-foreground rounded-full">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-lg font-medium">Betöltés...</span>
              </div>
            ) : (
              <button
                onClick={handleCheckWeather}
                className="px-6 py-3 bg-primary/20 text-primary rounded-full text-lg font-medium hover:bg-primary/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                Kattints az ellenőrzéshez
              </button>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
