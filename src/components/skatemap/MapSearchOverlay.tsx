import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    suburb?: string;
    city_district?: string;
    road?: string;
    postcode?: string;
  };
}

interface MapSearchOverlayProps {
  onSelectLocation: (lat: number, lon: number, name: string) => void;
  className?: string;
}

export const MapSearchOverlay: React.FC<MapSearchOverlayProps> = ({
  onSelectLocation,
  className,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isExpanded = isFocused || query.trim().length > 0;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions from Nominatim geofenced to Győr
  const searchNominatim = async (searchText: string) => {
    if (!searchText.trim() || searchText.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Győr viewbox coordinates: minLng 17.5000, maxLat 47.7800, maxLng 17.8000, minLat 47.5800
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchText.trim()
      )}&viewbox=17.5000,47.7800,17.8000,47.5800&bounded=1&countrycodes=hu&addressdetails=1&limit=6`;

      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'hu',
        },
      });

      if (!response.ok) throw new Error('Search request failed');

      const data: SearchResult[] = await response.json();
      setResults(data);
      setIsOpen(true);
    } catch (err) {
      console.warn('Nominatim search error:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      searchNominatim(val);
    }, 350);
  };

  const handleSelect = (item: SearchResult) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    
    // Shorten title for cleaner UI
    const parts = item.display_name.split(',');
    const shortTitle = parts.slice(0, 2).join(',').trim();

    onSelectLocation(lat, lon, shortTitle);
    setQuery(shortTitle);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Helper to format clean display names for Győr
  const formatDisplayName = (displayName: string) => {
    const parts = displayName.split(',').map((p) => p.trim());
    const main = parts[0] || '';
    const secondary = parts.slice(1, 3).filter((p) => !p.match(/^\d{4}$/) && p !== 'Magyarország').join(', ');
    return { main, secondary };
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full sm:transition-[width] sm:duration-300 sm:ease-out',
        isExpanded ? 'sm:w-80 md:w-96' : 'sm:w-52 md:w-60',
        className
      )}
    >
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search
          className={cn(
            'absolute left-3 w-4 h-4 transition-colors pointer-events-none',
            isExpanded ? 'text-emerald-400' : 'text-neutral-400'
          )}
        />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder="Keresés: városrész, utca..."
          className={cn(
            'w-full h-10 pl-9 pr-9 rounded-xl backdrop-blur-xl text-base sm:text-xs text-white placeholder:text-neutral-400 focus:outline-none transition-colors shadow-lg',
            isExpanded
              ? 'bg-neutral-900/95 border border-emerald-500/50 ring-1 ring-emerald-500/20'
              : 'bg-neutral-900/80 border border-white/10 hover:border-white/20'
          )}
        />

        {isLoading ? (
          <Loader2 className="absolute right-3 w-4 h-4 text-emerald-400 animate-spin pointer-events-none" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Törlés"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (results.length > 0 || (!isLoading && query.trim().length >= 2)) && (
        <div className="absolute top-12 left-0 right-0 z-50 rounded-2xl bg-neutral-950/95 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-[45vh] sm:max-h-64 flex flex-col">
          {results.length > 0 ? (
            <>
              <div className="p-1.5 space-y-1 overflow-y-auto max-h-40 sm:max-h-56 overscroll-contain">
                {results.map((item, idx) => {
                  const { main, secondary } = formatDisplayName(item.display_name);
                  const isSelected = selectedIndex === idx;

                  return (
                    <button
                      key={item.place_id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'group w-full text-left p-2.5 sm:p-2 rounded-xl flex items-center justify-between gap-3 text-xs transition-all cursor-pointer active:bg-emerald-500/25',
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-500/25 to-emerald-500/10 border border-emerald-500/40 text-white shadow-md'
                          : 'border border-transparent text-neutral-300 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                            isSelected
                              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                              : 'bg-white/5 text-neutral-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/10'
                          )}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'font-semibold truncate transition-colors',
                              isSelected ? 'text-emerald-200' : 'text-white'
                            )}
                          >
                            {main}
                          </p>
                          {secondary && (
                            <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                              {secondary}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Selection action pill indicator */}
                      <div
                        className={cn(
                          'shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all',
                          isSelected
                            ? 'opacity-100 bg-emerald-500 text-neutral-950 shadow-sm'
                            : 'opacity-0 group-hover:opacity-70 text-neutral-400 bg-white/5'
                        )}
                      >
                        <span>Ugrás</span>
                        <Navigation className="w-2.5 h-2.5" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dropdown footer info */}
              <div className="px-3 py-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-400 bg-neutral-950/80 shrink-0">
                <span>{results.length} találat Győrben</span>
                <span className="hidden sm:inline text-[10px] text-neutral-500">
                  ↑↓ navigáció • Enter kiválasztás
                </span>
              </div>
            </>
          ) : !isLoading && query.trim().length >= 2 ? (
            <div className="p-4 text-center space-y-1">
              <p className="text-xs text-neutral-300 font-medium">Nincs találat Győr területén</p>
              <p className="text-[11px] text-neutral-500">
                Próbálj utcanevet vagy városrészt keresni (pl. Baross Gábor út, Nádorváros)
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
