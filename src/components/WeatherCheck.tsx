import { useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import SpotlightCard from './SpotlightCard';
import { getSkateWeatherCheck, WeatherData, searchHungarianCities, HungarianCityResult, fetchWeatherFromOpenMeteo } from '@/services/weatherService';

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
      const cityWeatherData = await fetchWeatherFromOpenMeteo(city.latitude, city.longitude, city.name);
      setWeatherData(cityWeatherData);
      setWeatherState('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba történt');
      setWeatherState('initial');
    }
  };

  // Result state
  if (weatherState === 'result' && weatherData) {
    const emoji = weatherData.canSkate ? '🛹' : '🌧️';

    return (
      <div className="flex items-center justify-center w-full">
        <SpotlightCard
          spotlightColor="rgba(108, 108, 108, 0.35)"
          className="w-full max-w-lg mx-auto rounded-[2rem] border border-white/10 hover:border-[#6c6c6c]/60 bg-neutral-950/70 backdrop-blur-xl p-8 sm:p-12 text-center transition-all duration-500 hover:shadow-[0_0_60px_rgba(108,108,108,0.25)]"
        >
          <div className="relative z-10 flex flex-col items-center w-full text-center">
            {/* Temperature Display */}
            <div className="flex items-center justify-center gap-3">
              <span className="text-6xl sm:text-7xl font-black text-white drop-shadow-sm">
                {Math.round(weatherData.temp)}°
              </span>
              <span className="text-3xl sm:text-4xl">{emoji}</span>
            </div>

            {/* City */}
            <div className="flex flex-col items-center gap-1 mt-4">
              <p className="text-sm font-semibold tracking-wide text-neutral-300">
                {weatherData.city}
              </p>
              {weatherData.permissionDenied && (
                <p className="text-xs text-amber-400 font-medium">
                  Helyadatok visszautasítva. Alapértelmezett helyszín betöltve.
                </p>
              )}
            </div>

            {/* Message */}
            <p className="text-lg sm:text-xl font-bold leading-relaxed text-white mt-4 max-w-md">
              {weatherData.conditionText}
            </p>

            {/* Reset Button (Grey & White) */}
            <button
              onClick={handleReset}
              className="mt-6 px-6 py-2.5 bg-white/10 hover:bg-[#6c6c6c] text-white border border-white/15 rounded-full transition-all text-sm font-bold shadow-md hover:shadow-[0_0_20px_rgba(108,108,108,0.5)] active:scale-95 cursor-pointer"
            >
              Új ellenőrzés
            </button>

            {/* Search Section */}
            <div className="mt-6 w-full max-w-sm">
              {!showSearch ? (
                <button
                  onClick={() => setShowSearch(true)}
                  className="w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer"
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
                      className="w-full p-3 pr-10 bg-white/10 border border-white/20 text-white placeholder:text-neutral-400 rounded-xl focus:bg-white/15 focus:border-[#6c6c6c] focus:outline-none text-sm transition-all"
                    />
                    <button
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search Results Dropdown */}
                  {(searchResults.length > 0 || isSearching) && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-neutral-900/95 border border-white/15 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto backdrop-blur-xl">
                      {isSearching ? (
                        <div className="px-4 py-3 text-sm text-neutral-400 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#6c6c6c]" />
                          Keresés...
                        </div>
                      ) : (
                        searchResults.map((city, index) => (
                          <button
                            key={index}
                            onClick={() => handleCitySelect(city)}
                            className="w-full px-4 py-2.5 text-left text-neutral-200 hover:text-white hover:bg-white/10 transition-colors first:rounded-t-xl last:rounded-b-xl text-sm cursor-pointer"
                          >
                            <span>{city.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Legal / Info Text */}
            <p className="mt-6 text-center text-[11px] text-neutral-500 leading-relaxed max-w-xs">
              A helyadatokat (GPS/IP) kizárólag a pontos időjárás megjelenítéséhez használjuk. Az oldal ingyenes és reklámmentes, adataidat nem tároljuk.
            </p>
          </div>
        </SpotlightCard>
      </div>
    );
  }

  // Initial / Loading state
  const isLoading = weatherState === 'loading';

  return (
    <div className="flex items-center justify-center w-full">
      <SpotlightCard
        spotlightColor="rgba(108, 108, 108, 0.35)"
        className="w-full max-w-lg mx-auto rounded-[2rem] border border-white/10 hover:border-[#6c6c6c]/60 bg-neutral-950/70 backdrop-blur-xl p-8 sm:p-12 text-center transition-all duration-500 hover:shadow-[0_0_60px_rgba(108,108,108,0.25)]"
      >
        <div className="relative z-10 flex flex-col items-center gap-6 w-full text-center">
          {/* Top Emoji Icon */}
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-inner">
            {isLoading ? <Loader2 className="w-7 h-7 text-[#6c6c6c] animate-spin" /> : '🌤️'}
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
            Tudok deszkázni ma?
          </h2>

          {/* Description */}
          <p className="text-neutral-400 text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
            {isLoading
              ? 'Időjárás adatok lekérése a jelenlegi helyzeted alapján...'
              : 'Ellenőrizd az időjárást és megtudod, hogy érdemes-e elővenni a deszkát!'
            }
          </p>

          {/* Error Message if any */}
          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl">
              {error}
            </p>
          )}

          {/* Action Button - Grey and White (No green) */}
          <div className="mt-2 w-full flex justify-center">
            {isLoading ? (
              <div className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-white/5 border border-white/10 text-neutral-300 rounded-full text-base sm:text-lg font-medium backdrop-blur-md shadow-md">
                <Loader2 className="w-5 h-5 animate-spin text-[#6c6c6c]" />
                <span>Időjárás adatok lekérése...</span>
              </div>
            ) : (
              <button
                onClick={handleCheckWeather}
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white/10 text-white border border-white/15 rounded-full text-base sm:text-lg font-bold tracking-wide hover:bg-[#6c6c6c] hover:border-[#6c6c6c] hover:text-white transition-all shadow-lg hover:shadow-[0_0_30px_rgba(108,108,108,0.6)] focus:outline-none focus:ring-2 focus:ring-[#6c6c6c]/60 active:scale-95 cursor-pointer"
              >
                Kattints az ellenőrzéshez
              </button>
            )}
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
};
