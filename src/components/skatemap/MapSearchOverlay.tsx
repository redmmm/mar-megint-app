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
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions from Nominatim geofenced to Győr
  const searchNominatim = async (searchText: string) => {
    if (!searchText.trim() || searchText.trim().length < 2) {
      setResults([]);
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
      setIsOpen(data.length > 0);
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
    <div ref={containerRef} className={cn('relative w-full max-w-xs sm:max-w-sm', className)}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-emerald-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder="Keresés: városrész, utca..."
          className="w-full h-10 pl-9 pr-9 rounded-xl bg-neutral-900/80 border border-white/10 backdrop-blur-xl text-xs text-white placeholder:text-neutral-400 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30 transition-all shadow-lg"
        />

        {isLoading ? (
          <Loader2 className="absolute right-3 w-4 h-4 text-emerald-400 animate-spin pointer-events-none" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-0.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-12 left-0 right-0 z-50 rounded-xl bg-neutral-950/95 border border-white/15 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-1.5 space-y-0.5 max-h-64 overflow-y-auto">
            {results.map((item, idx) => {
              const { main, secondary } = formatDisplayName(item.display_name);
              const isSelected = selectedIndex === idx;

              return (
                <button
                  key={item.place_id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'w-full text-left p-2.5 rounded-lg flex items-start gap-2.5 text-xs transition-colors',
                    isSelected
                      ? 'bg-emerald-500/20 text-white'
                      : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{main}</p>
                    {secondary && (
                      <p className="text-[11px] text-neutral-400 truncate">{secondary}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
