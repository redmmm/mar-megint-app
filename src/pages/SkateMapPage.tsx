import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import FloatingNav from '@/components/FloatingNav';
import { SpotDetailDrawer } from '@/components/skatemap/SpotDetailDrawer';
import { SpotSubmissionModal } from '@/components/skatemap/SpotSubmissionModal';
import { MapSearchOverlay } from '@/components/skatemap/MapSearchOverlay';
import { LocationPermissionDialog } from '@/components/skatemap/LocationPermissionDialog';
import { EventNotificationBanner } from '@/components/skatemap/EventNotificationBanner';
import { getSpots } from '@/services/spotService';
import { supabase } from '@/integrations/supabase/client';
import { Spot } from '@/types/spot';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, Compass, Loader2, Info, Locate, ShieldCheck, Dices, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Győr configuration
const GYOR_CENTER: [number, number] = [47.6875, 17.6504];
const GYOR_BOUNDS: [[number, number], [number, number]] = [
  [47.5800, 17.5000],
  [47.7800, 17.8000],
];

// All available spot feature filters
const SPOT_FEATURE_FILTERS = [
  { id: 'rail', label: 'Korlát', emoji: '🦯' },
  { id: 'ledge', label: 'Padka', emoji: '🧱' },
  { id: 'stairs', label: 'Lépcső', emoji: '🪜' },
  { id: 'gap', label: 'Gap', emoji: '🕳️' },
  { id: 'flatground', label: 'Flatground', emoji: '🛹' },
];

// XSS protection: escape user-provided strings before inserting into raw HTML
const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Helper to create custom HTML markers matching dark glassmorphism (solid base to prevent zoom/overlap GPU glitches)
const createSpotIcon = (title: string, spotType?: string) => {
  let emoji = '🏙️';
  let borderColor = 'border-cyan-500/80';
  let shadowColor = 'shadow-cyan-500/30';
  let arrowBg = 'bg-cyan-500 border-cyan-400';

  if (spotType === 'skatepark') {
    emoji = '🛹';
    borderColor = 'border-emerald-400';
    shadowColor = 'shadow-emerald-500/40';
    arrowBg = 'bg-emerald-500 border-emerald-400';
  } else if (spotType === 'skateshop') {
    emoji = '🏪';
    borderColor = 'border-amber-400';
    shadowColor = 'shadow-amber-500/40';
    arrowBg = 'bg-amber-500 border-amber-400';
  }

  return L.divIcon({
    className: 'custom-skate-marker',
    html: `
      <div class="relative cursor-pointer flex items-center justify-center">
        <div class="marker-card w-10 h-10 rounded-2xl bg-[#121215] border-2 ${borderColor} shadow-xl ${shadowColor} flex items-center justify-center">
          <span class="text-lg leading-none select-none">${emoji}</span>
        </div>
        <div class="absolute -bottom-1 w-2 h-2 ${arrowBg} rotate-45 border-r border-b"></div>
      </div>
    `,
    iconSize: [40, 44],
    iconAnchor: [20, 44],
    popupAnchor: [0, -44],
  });
};

const createTempPinIcon = () => {
  return L.divIcon({
    className: 'temp-pin-marker',
    html: `
      <div class="relative flex items-center justify-center animate-bounce">
        <div class="w-10 h-10 rounded-full bg-emerald-500 border-2 border-white shadow-xl shadow-emerald-500/50 flex items-center justify-center text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Pulsing user location marker
const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div class="user-location-pulse"></div>
      <div class="user-location-dot"></div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

// Search result target pin
const createSearchPinIcon = () => {
  return L.divIcon({
    className: 'search-result-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-xl bg-cyan-500 border border-white shadow-xl shadow-cyan-500/40 flex items-center justify-center text-white font-bold">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
        <div class="absolute -bottom-1 w-2 h-2 bg-cyan-500 rotate-45 border-r border-b border-cyan-400"></div>
      </div>
    `,
    iconSize: [32, 36],
    iconAnchor: [16, 36],
  });
};

// Hook for fluid, momentum drag-to-scroll using window-level mouse listeners.
// Avoids setPointerCapture which breaks child button onClick events.
const useDragScroll = (onScrollChange?: () => void) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const draggedDistanceRef = useRef(0);
  const velocityRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animFrameIdRef = useRef<number | null>(null);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (!ref.current) return;

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    isDraggingRef.current = true;
    startXRef.current = e.pageX;
    lastXRef.current = e.pageX;
    lastTimeRef.current = performance.now();
    scrollLeftRef.current = ref.current.scrollLeft;
    draggedDistanceRef.current = 0;
    velocityRef.current = 0;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current || !ref.current) return;

      const currentX = ev.pageX;
      const now = performance.now();
      const dt = now - lastTimeRef.current;
      const dx = currentX - lastXRef.current;

      if (dt > 0) velocityRef.current = dx / dt;
      lastXRef.current = currentX;
      lastTimeRef.current = now;

      const totalWalk = currentX - startXRef.current;
      draggedDistanceRef.current = Math.abs(totalWalk);
      ref.current.scrollLeft = scrollLeftRef.current - totalWalk;
      onScrollChange?.();
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      // Smooth inertia glide after release
      if (ref.current && Math.abs(velocityRef.current) > 0.08) {
        let v = velocityRef.current * 16;
        const friction = 0.93;
        const glide = () => {
          if (!ref.current || Math.abs(v) < 0.4) {
            animFrameIdRef.current = null;
            return;
          }
          ref.current.scrollLeft -= v;
          v *= friction;
          onScrollChange?.();
          animFrameIdRef.current = requestAnimationFrame(glide);
        };
        animFrameIdRef.current = requestAnimationFrame(glide);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Suppress click on children only when a real drag happened (>5px)
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedDistanceRef.current > 5) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && ref.current) {
      ref.current.scrollLeft += e.deltaY;
      onScrollChange?.();
    }
  };

  return {
    ref,
    draggedDistance: draggedDistanceRef,
    events: {
      onMouseDown,
      onWheel,
      onClickCapture,
    },
  };
};



const SkateMapPage: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);

  const [spots, setSpots] = useState<Spot[]>([]);
  // Single-select Spot Type: 'all' | 'skatepark' | 'street_spot' | 'skateshop'
  const [spotTypeFilter, setSpotTypeFilter] = useState<'all' | 'skatepark' | 'street_spot' | 'skateshop'>('all');
  // Multi-select Features: array of feature IDs (e.g. ['rail', 'ledge'])
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [randomSpotId, setRandomSpotId] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddingPin, setIsAddingPin] = useState(false);
  const [tempCoords, setTempCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Dynamic extra features from loaded spots
  const extraFeatures = React.useMemo(() => {
    const set = new Set<string>();
    spots.forEach((s) => {
      if (Array.isArray(s.features)) {
        s.features.forEach((f) => {
          if (!SPOT_FEATURE_FILTERS.some((sf) => sf.id === f)) {
            set.add(f);
          }
        });
      }
    });
    return Array.from(set);
  }, [spots]);

  // Handle Single-select Spot Type filter (Row 1)
  const handleSelectSpotType = (type: 'all' | 'skatepark' | 'street_spot' | 'skateshop') => {
    setRandomSpotId(null);
    setSpotTypeFilter(type);
    if (type === 'all') {
      setSelectedFeatures([]);
    }
  };

  // Handle Multi-select Feature filter (Row 2)
  const handleToggleFeature = (featureId: string) => {
    setRandomSpotId(null);
    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    );
  };

  // Top row smooth drag-scroll instance
  const topRowDrag = useDragScroll();

  // Bottom row scroll indicators and smooth drag-scroll instance
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const bottomRowDrag = useDragScroll(() => {
    const el = bottomRowDrag.ref.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 6);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
    }
  });

  const checkScroll = React.useCallback(() => {
    const el = bottomRowDrag.ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, [bottomRowDrag.ref]);

  useEffect(() => {
    checkScroll();
  }, [spots, checkScroll]);

  // Handle Random Spot selection (hides other spots)
  const handleSelectRandomSpot = () => {
    if (spots.length === 0) {
      toast.error('Nincsenek elérhető spotok a sorsoláshoz.');
      return;
    }

    const pool = spots.length > 1 && randomSpotId
      ? spots.filter((s) => s.id !== randomSpotId)
      : spots;
    const picked = pool[Math.floor(Math.random() * pool.length)];

    setRandomSpotId(picked.id);
    setSelectedSpot(picked);
    setIsDrawerOpen(true);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([picked.latitude, picked.longitude], 16, {
        duration: 1.2,
      });
    }

    toast.success(`🎲 Kiválasztott spot: ${picked.title}`, {
      description: 'A többi spot elrejtve. Kattints az "Összes"-re a visszaállításhoz.',
    });
  };
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [locErrorType, setLocErrorType] = useState<'permission_denied' | 'timeout' | 'unavailable' | 'unknown'>('permission_denied');

  // Keep state accessible to Leaflet event listeners
  const isAddingPinRef = useRef(isAddingPin);
  isAddingPinRef.current = isAddingPin;

  // 1. Fetch approved spots
  const loadApprovedSpots = async () => {
    setIsLoading(true);
    try {
      const data = await getSpots('approved');
      setSpots(data);
    } catch (err) {
      console.error('Failed to load spots:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApprovedSpots();

    const channel = supabase
      .channel('public-skatemap-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spots' },
        () => {
          loadApprovedSpots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 2. Initialize Leaflet Map with CARTO Dark Matter & Győr Bounds
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Map with bounds and zoom limits
    const map = L.map(mapContainerRef.current, {
      center: GYOR_CENTER,
      zoom: 13,
      minZoom: 12,
      maxZoom: 19,
      maxBounds: GYOR_BOUNDS,
      bounceAtZoomLimits: true,
      zoomControl: false,
    });

    mapInstanceRef.current = map;

    // Standard OpenStreetMap with CSS dark filter (100% free, keyless, no watermark)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      className: 'map-dark-tiles',
      maxZoom: 19,
      minZoom: 12,
      keepBuffer: 2,
      updateWhenIdle: true,
      updateWhenZooming: false,
    }).addTo(map);

    // Zoom controls positioned at top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Markers layer group
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Győr Boundary: Spotlight Mask (Method 2) + Glowing Neon Border (Method 1)
    fetch('/gyor-boundary.json')
      .then((res) => {
        if (!res.ok) throw new Error('Local boundary file not found');
        return res.json();
      })
      .catch(() => {
        return fetch(
          'https://nominatim.openstreetmap.org/search?city=Gyor&country=Hungary&polygon_geojson=1&format=geojson'
        ).then((res) => res.json());
      })
      .then((data) => {
        if (!mapInstanceRef.current) return;

        // Method 2: World Dim Spotlight Mask (dims everything outside Győr)
        const gyorCoords = data.features?.[0]?.geometry?.coordinates;
        if (gyorCoords) {
          const worldOuterBounds = [
            [-180, 90],
            [180, 90],
            [180, -90],
            [-180, -90],
            [-180, 90],
          ];

          const invertedPolygonData = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [worldOuterBounds, ...gyorCoords],
            },
          };

          L.geoJSON(invertedPolygonData as any, {
            style: {
              color: '#000000',
              fillColor: '#000000',
              fillOpacity: 0.65,
              weight: 0,
            },
            interactive: false,
          }).addTo(mapInstanceRef.current);
        }

        // Method 1: Glowing Neon Border Line
        // Outer glow layer (Thick, vibrant emerald/cyan glow)
        L.geoJSON(data as any, {
          style: {
            color: '#10b981',
            weight: 7,
            opacity: 0.7,
            fill: false,
            className: 'gyor-outer-glow',
          },
          interactive: false,
        }).addTo(mapInstanceRef.current);

        // Inner sharp core line (Thin, bright white)
        L.geoJSON(data as any, {
          style: {
            color: '#ffffff',
            weight: 2,
            opacity: 0.95,
            fill: false,
            className: 'gyor-inner-core',
          },
          interactive: false,
        }).addTo(mapInstanceRef.current);
      })
      .catch((err) => {
        console.warn('Could not load Győr boundary GeoJSON:', err);
      });

    // Map click handler for dropping pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Check if click is inside Győr bounds
      if (
        lat < GYOR_BOUNDS[0][0] ||
        lat > GYOR_BOUNDS[1][0] ||
        lng < GYOR_BOUNDS[0][1] ||
        lng > GYOR_BOUNDS[1][1]
      ) {
        toast.error('Kérjük, kattints Győr területén belülre!');
        return;
      }

      if (isAddingPinRef.current) {
        // Place temporary marker
        if (tempMarkerRef.current) {
          tempMarkerRef.current.setLatLng([lat, lng]);
        } else {
          const tempMarker = L.marker([lat, lng], { icon: createTempPinIcon() }).addTo(map);
          tempMarkerRef.current = tempMarker;
        }

        setTempCoords({ lat, lng });
        setIsModalOpen(true);
        setIsAddingPin(false);
      }
    });

    // Cleanup on unmount to prevent "Map container is already initialized" error
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Compute filtered spots based on single-select type and multi-select features
  const filteredSpots = React.useMemo(() => {
    return spots.filter((spot) => {
      // 1. If a random spot is selected, hide all other spots
      if (randomSpotId) {
        return spot.id === randomSpotId;
      }

      // 2. Spot Type filter (Single-select: 'all' | 'skatepark' | 'street_spot' | 'skateshop')
      if (spotTypeFilter !== 'all' && spot.spot_type !== spotTypeFilter) {
        return false;
      }

      // 3. Features filter (Multi-select: spot must have all selected features)
      if (selectedFeatures.length > 0) {
        const spotFeatures = Array.isArray(spot.features) ? spot.features : [];
        const hasAllFeatures = selectedFeatures.every((f) => spotFeatures.includes(f));
        if (!hasAllFeatures) return false;
      }

      return true;
    });
  }, [spots, randomSpotId, spotTypeFilter, selectedFeatures]);

  // 3. Render approved spot markers whenever spots or filter changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // Priority order: Skatepark (highest) > Skateshop (high) > Street spot (normal)
    // We sort spots so that street spots are added to Leaflet first (lower DOM order),
    // and skatepark/skateshop spots are added last (higher DOM order).
    const priorityWeight: Record<string, number> = {
      skatepark: 3,
      skateshop: 2,
      street_spot: 1,
    };

    const sortedSpots = [...filteredSpots].sort((a, b) => {
      const wA = priorityWeight[a.spot_type || 'street_spot'] || 1;
      const wB = priorityWeight[b.spot_type || 'street_spot'] || 1;
      return wA - wB;
    });

    sortedSpots.forEach((spot) => {
      const isSkatepark = spot.spot_type === 'skatepark';
      const isSkateshop = spot.spot_type === 'skateshop';

      // zIndexOffset: guarantees Skatepark (1000) and Skateshop (800) always
      // display above Street spots (100) when overlapping
      const zOffset = isSkatepark ? 1000 : isSkateshop ? 800 : 100;

      const marker = L.marker([spot.latitude, spot.longitude], {
        icon: createSpotIcon(spot.title, spot.spot_type),
        zIndexOffset: zOffset,
        riseOnHover: true,
        riseOffset: 1500,
      });

      marker.on('click', () => {
        setSelectedSpot(spot);
        setIsDrawerOpen(true);
      });

      const features = Array.isArray(spot.features) ? spot.features : [];
      const featureLabels: Record<string, string> = {
        rail: '🦯 Korlát',
        ledge: '🧱 Padka',
        stairs: '🪜 Lépcső',
        gap: '🕳️ Gap',
        flatground: '🛹 Flat',
      };

      const dotClass = isSkatepark
        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
        : isSkateshop
        ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
        : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]';

      const badgeClass = isSkatepark
        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
        : isSkateshop
        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';

      const typeLabel = isSkatepark ? 'Skatepark' : isSkateshop ? 'Skateshop' : 'Street';

      const featuresHtml =
        features.length > 0
          ? `
          <div class="flex items-center flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-white/10">
            ${features
              .map(
                (f) =>
                  `<span class="px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-[9px] text-neutral-300 font-medium">${
                    featureLabels[f] || f
                  }</span>`
              )
              .join('')}
          </div>
        `
          : '';

      // Clean modern glass tooltip on hover
      marker.bindTooltip(
        `
        <div class="spot-tooltip-content">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${dotClass}"></span>
            <span class="font-bold text-white text-xs tracking-tight">${escapeHtml(spot.title)}</span>
            <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${badgeClass}">
              ${typeLabel}
            </span>
          </div>
          ${featuresHtml}
        </div>
        `,
        {
          direction: 'top',
          offset: [0, -42],
          className: 'spot-glass-tooltip',
        }
      );

      markersLayerRef.current?.addLayer(marker);
    });
  }, [filteredSpots]);

  // Handle search location selection
  const handleSelectSearchLocation = (lat: number, lon: number, name: string) => {
    if (!mapInstanceRef.current) return;

    if (searchMarkerRef.current) {
      mapInstanceRef.current.removeLayer(searchMarkerRef.current);
      searchMarkerRef.current = null;
    }

    const marker = L.marker([lat, lon], {
      icon: createSearchPinIcon(),
      zIndexOffset: 900,
    }).addTo(mapInstanceRef.current);

    marker
      .bindTooltip(
        `
        <div class="search-loc-tooltip-content">
          <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
          <span class="font-bold text-xs text-white tracking-tight">${escapeHtml(name)}</span>
        </div>
        `,
        {
          direction: 'top',
          offset: [0, -32],
          className: 'spot-glass-tooltip',
          permanent: true,
        }
      )
      .openTooltip();

    searchMarkerRef.current = marker;

    mapInstanceRef.current.flyTo([lat, lon], 16, { duration: 1.2 });
  };

// Multi-service IP Geolocation fallback (supports Hungarian ISPs like Magyar Telekom, Vodafone, Digi)
const fetchIpLocation = async (): Promise<{ lat: number; lng: number } | null> => {
  // Service 1: ipwho.is (very accurate for Hungarian cities, returns Győr directly)
  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return { lat: data.latitude, lng: data.longitude };
      }
    }
  } catch (e) {
    console.warn('ipwho.is failed, trying next:', e);
  }

  // Service 2: freeipapi.com
  try {
    const res = await fetch('https://freeipapi.com/api/json');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return { lat: data.latitude, lng: data.longitude };
      }
    }
  } catch (e) {
    console.warn('freeipapi failed, trying next:', e);
  }

  // Service 3: ipapi.co
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return { lat: data.latitude, lng: data.longitude };
      }
    }
  } catch (e) {
    console.warn('ipapi.co failed:', e);
  }

  return null;
};

  // Handle Geolocation: "Show My Location" with fast standard + immediate IP fallback
  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error('A böngésződ nem támogatja a helymeghatározást.');
      return;
    }

    setIsLocating(true);

    const handleSuccess = (latitude: number, longitude: number, isApproximate = false) => {
      setIsLocating(false);
      setIsPermissionDialogOpen(false);

      // Verify if user is inside Győr bounds
      const isInsideGyor =
        latitude >= GYOR_BOUNDS[0][0] &&
        latitude <= GYOR_BOUNDS[1][0] &&
        longitude >= GYOR_BOUNDS[0][1] &&
        longitude <= GYOR_BOUNDS[1][1];

      if (!isInsideGyor) {
        toast.warning(
          isApproximate
            ? 'Hozzávetőleges helyzet: A tartózkodási helyed Győr határain kívül esik.'
            : 'A tartózkodási helyed Győr határain kívül esik.'
        );
      } else {
        toast.success(
          isApproximate
            ? 'Helyzeted beazonosítva (hálózati pozíció).'
            : 'Helyzeted sikeresen beazonosítva!'
        );
      }

      if (mapInstanceRef.current) {
        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.setLatLng([latitude, longitude]);
        } else {
          const userMarker = L.marker([latitude, longitude], {
            icon: createUserLocationIcon(),
            zIndexOffset: 1000,
          }).addTo(mapInstanceRef.current);

          userMarker.bindTooltip(
            `
            <div class="user-loc-tooltip-content">
              <span class="user-loc-tooltip-dot"></span>
              <span>Jelenlegi helyzeted</span>
            </div>
            `,
            {
              direction: 'top',
              offset: [0, -14],
              className: 'user-loc-tooltip-container',
            }
          );

          userLocationMarkerRef.current = userMarker;
        }

        if (isInsideGyor) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1.2 });
        }
      }
    };

    // Step 1: Fast standard location (enableHighAccuracy: false) - short 3s timeout
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleSuccess(position.coords.latitude, position.coords.longitude);
      },
      async (fastError) => {
        console.warn('Fast geolocation attempt failed:', fastError);

        // If user explicitly denied browser permission, show permission dialog
        if (fastError.code === fastError.PERMISSION_DENIED) {
          setIsLocating(false);
          setLocErrorType('permission_denied');
          setIsPermissionDialogOpen(true);
          return;
        }

        // Step 2: On desktop PCs without GPS/Wi-Fi, immediately try IP Geolocation fallback
        const ipLocation = await fetchIpLocation();
        if (ipLocation) {
          handleSuccess(ipLocation.lat, ipLocation.lng, true);
          return;
        }

        // Step 3: High accuracy GPS attempt with short timeout (in case device is mobile with GPS)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            handleSuccess(pos.coords.latitude, pos.coords.longitude);
          },
          (gpsError) => {
            console.warn('High-accuracy geolocation failed:', gpsError);

            // If all attempts failed
            setIsLocating(false);
            setLocErrorType(
              gpsError.code === gpsError.TIMEOUT
                ? 'timeout'
                : gpsError.code === gpsError.POSITION_UNAVAILABLE
                ? 'unavailable'
                : 'unknown'
            );
            setIsPermissionDialogOpen(true);
          },
          { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 120000 }
    );
  };

  // Handle resetting map view to Győr center
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(GYOR_CENTER, 13, { duration: 1 });
    }
  };

  const handleStartAddSpot = () => {
    setIsAddingPin(true);
    toast.info('Kattints a térképre a kívánt ponton az új spot elhelyezéséhez!');
  };

  const handleCancelAddPin = () => {
    setIsAddingPin(false);
    if (tempMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    if (tempMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
  };

  return (
    <div className="relative w-full h-screen h-[100dvh] overflow-hidden bg-neutral-950">
      {/* Top Glass Header & Search Overlay */}
      <header className="absolute top-4 left-4 right-4 sm:right-auto z-20 pointer-events-auto flex flex-col gap-2 max-w-full sm:max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-neutral-950/75 border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white leading-none">
                  Győri Skatemap
                </h1>
                <span className="inline-flex items-center justify-center min-w-[56px] text-center text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm">
                  {randomSpotId
                    ? `1 / ${spots.length} spot`
                    : spotTypeFilter !== 'all' || selectedFeatures.length > 0
                    ? `${filteredSpots.length} / ${spots.length} spot`
                    : `${spots.length} spot`}
                </span>
              </div>

              {/* Sub-row under Győri Skatemap: BETA pill + Info button */}
              <div className="flex items-center gap-2 mt-1">
                {/* BETA popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="cursor-pointer inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/35 hover:bg-amber-500/30 active:scale-95 transition-all shadow-sm focus:outline-none"
                      aria-label="Béta információ"
                    >
                      BETA
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="start"
                    sideOffset={8}
                    className="max-w-[270px] bg-neutral-900/95 border border-amber-500/30 text-neutral-200 text-xs p-3.5 backdrop-blur-xl shadow-2xl rounded-2xl z-50"
                  >
                    <p className="font-bold text-amber-300 mb-1 text-xs">Fejlesztés alatt álló funkció</p>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Ez a funkció még béta fázisban van: a térkép aktív fejlesztés alatt áll, a felület és a funkciók még nem véglegesek.
                    </p>
                  </PopoverContent>
                </Popover>

                {/* Info popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="cursor-pointer inline-flex items-center justify-center w-5 h-5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95 transition-colors focus:outline-none"
                      aria-label="Adatfelhasználási tájékoztató"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="start"
                    sideOffset={8}
                    className="max-w-[290px] bg-neutral-900/95 border border-white/15 text-neutral-200 text-xs p-3.5 backdrop-blur-xl shadow-2xl rounded-2xl space-y-2 z-50"
                  >
                    <p className="font-bold text-white flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Adatfelhasználási tájékoztató
                    </p>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      A helyzetedet (GPS / IP koordinátáidat) kizárólag a böngésződben használjuk a térképen való megjelenítéshez.
                    </p>
                    <div className="pt-1.5 border-t border-white/10 text-[10px] text-neutral-400 space-y-1">
                      <p>✓ Semmilyen személyes vagy helyadatot nem mentünk el.</p>
                      <p>✓ Az adatokat nem használjuk fel semmire és nem továbbítjuk.</p>
                      <p>✓ Az oldalon egyáltalán nincs reklám vagy hirdetés.</p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Category & Feature Filter Section */}
          <div className="flex flex-col gap-1.5 sm:border-l sm:border-white/10 sm:pl-3 pt-0.5 sm:pt-0 min-w-0 flex-1 max-w-[calc(100vw-3rem)] sm:max-w-[400px] md:max-w-[460px] lg:max-w-[520px]">
            {/* Row 1: Types (Single-select only: Összes, Skatepark, Street, Skateshop) - Draggable */}
            <div
              ref={topRowDrag.ref}
              {...topRowDrag.events}
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 select-none cursor-grab active:cursor-grabbing shrink-0"
            >
              <button
                type="button"
                onClick={() => handleSelectSpotType('all')}
                title="Összes spot megjelenítése"
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer",
                  spotTypeFilter === 'all' && !randomSpotId
                    ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm font-semibold"
                    : "text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                Összes
              </button>
              <button
                type="button"
                onClick={() => handleSelectSpotType('skatepark')}
                title="Csak skateparkok"
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer",
                  spotTypeFilter === 'skatepark' && !randomSpotId
                    ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm font-semibold"
                    : "text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                🛹 Skatepark
              </button>
              <button
                type="button"
                onClick={() => handleSelectSpotType('street_spot')}
                title="Csak street spotok"
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer",
                  spotTypeFilter === 'street_spot' && !randomSpotId
                    ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold"
                    : "text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                🏙️ Street
              </button>
              <button
                type="button"
                onClick={() => handleSelectSpotType('skateshop')}
                title="Csak skateshopok"
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer",
                  spotTypeFilter === 'skateshop' && !randomSpotId
                    ? "bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm font-semibold"
                    : "text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                🏪 Skateshop
              </button>

            </div>

            {/* Row 2: RANDOM directly under Összes + Multi-select Features (Scrollable & visibly clipped) */}
            <div className="relative min-w-0 w-full group">
              {/* Left fade gradient when scrolled */}
              {canScrollLeft && (
                <div className="pointer-events-none absolute left-0 top-0 bottom-1 w-6 bg-gradient-to-r from-neutral-950 via-neutral-950/90 to-transparent z-10 transition-opacity duration-200" />
              )}

              <div
                ref={bottomRowDrag.ref}
                {...bottomRowDrag.events}
                onScroll={checkScroll}
                className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none cursor-grab active:cursor-grabbing custom-horizontal-scrollbar"
              >
                {/* RANDOM Button */}
                <button
                  type="button"
                  onClick={handleSelectRandomSpot}
                  title="Véletlenszerű spot sorsolása (a többi elrejtése)"
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                    randomSpotId
                      ? "bg-purple-600/40 text-purple-200 border border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)] ring-1 ring-purple-400/50"
                      : "text-neutral-400 hover:text-white hover:bg-white/5 border border-white/5"
                  )}
                >
                  <Dices className={cn("w-3.5 h-3.5", randomSpotId ? "text-purple-300" : "text-neutral-400")} />
                  <span>RANDOM</span>
                </button>

                {/* Multi-select Feature Chips */}
                {SPOT_FEATURE_FILTERS.map((feat) => {
                  const isSelected = selectedFeatures.includes(feat.id) && !randomSpotId;
                  return (
                    <button
                      key={feat.id}
                      type="button"
                      onClick={() => handleToggleFeature(feat.id)}
                      title={`Szűrés: ${feat.label} (több is kiválasztható)`}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1",
                        isSelected
                          ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400 shadow-sm font-semibold ring-1 ring-emerald-400/40"
                          : "text-neutral-400 hover:text-white hover:bg-white/5 border border-white/5"
                      )}
                    >
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      )}
                      <span>{feat.emoji}</span>
                      <span>{feat.label}</span>
                    </button>
                  );
                })}

                {/* Extra dynamic features */}
                {extraFeatures.map((feat) => {
                  const isSelected = selectedFeatures.includes(feat) && !randomSpotId;
                  return (
                    <button
                      key={feat}
                      type="button"
                      onClick={() => handleToggleFeature(feat)}
                      title={`Szűrés: ${feat} (több is kiválasztható)`}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1",
                        isSelected
                          ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400 shadow-sm font-semibold ring-1 ring-emerald-400/40"
                          : "text-neutral-400 hover:text-white hover:bg-white/5 border border-white/5"
                      )}
                    >
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      )}
                      <span>🏷️</span>
                      <span className="capitalize">{feat}</span>
                    </button>
                  );
                })}

                {/* Clear Selected Features button if any active */}
                {selectedFeatures.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedFeatures([])}
                    title="Kiválasztott elemek törlése"
                    className="px-2 py-1 rounded-full text-[10px] font-medium text-neutral-400 hover:text-rose-400 hover:bg-rose-500/15 border border-white/10 shrink-0 cursor-pointer flex items-center gap-1 transition-all"
                  >
                    <X className="w-3 h-3" />
                    <span>Törlés ({selectedFeatures.length})</span>
                  </button>
                )}
              </div>

              {/* Right fade gradient showing clipping & scrollability */}
              {canScrollRight && (
                <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-neutral-950 via-neutral-950/90 to-transparent z-10 transition-opacity duration-200" />
              )}
            </div>
          </div>

          {/* Real-time Geofenced Search Input */}
          <div className="sm:border-l sm:border-white/10 sm:pl-3 w-full sm:w-auto">
            <MapSearchOverlay onSelectLocation={handleSelectSearchLocation} />
          </div>
        </div>
      </header>

      {/* Pin Drop Mode Banner */}
      {isAddingPin && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 backdrop-blur-xl shadow-2xl text-white">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs sm:text-sm font-semibold">
              Kattints a térképen Győr területére!
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelAddPin}
              className="h-7 px-2.5 text-xs border-white/20 bg-white/10 hover:bg-white/20 text-white"
            >
              Mégse
            </Button>
          </div>
        </div>
      )}

      {/* Floating Action Controls */}
      <div className="absolute bottom-24 right-4 sm:right-6 z-20 flex flex-col items-end gap-3 pointer-events-auto">
        {/* Iránytű és Saját helyzet egymás mellett (az iránytű mellett jobb oldalon a saját helyzet) */}
        <div className="flex items-center gap-2.5">
          {/* Recenter Button (Iránytű) */}
          <Button
            size="icon"
            onClick={handleRecenter}
            aria-label="Vissza Győr központjához (Iránytű)"
            className="w-12 h-12 rounded-2xl bg-neutral-950/80 border border-white/10 backdrop-blur-xl text-neutral-300 hover:text-white hover:bg-neutral-900 shadow-xl transition-all hover:scale-105 active:scale-95"
            title="Vissza Győr központjához (Iránytű)"
          >
            <Compass className="w-5 h-5" />
          </Button>

          {/* Show My Location Button (Saját helyzet) - az iránytű mellett a jobb oldalon */}
          <Button
            size="icon"
            onClick={requestUserLocation}
            disabled={isLocating}
            aria-label="Saját helyzetem mutatása"
            className="w-12 h-12 rounded-2xl bg-neutral-950/80 border border-white/10 backdrop-blur-xl text-neutral-300 hover:text-white hover:bg-neutral-900 shadow-xl transition-all hover:scale-105 active:scale-95"
            title="Saját helyzetem mutatása"
          >
            {isLocating ? (
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            ) : (
              <Locate className="w-5 h-5 text-cyan-400" />
            )}
          </Button>
        </div>

        {/* Add Spot Button */}
        <Button
          onClick={handleStartAddSpot}
          className="h-12 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xl shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-bold">Új Spot</span>
        </Button>
      </div>

      {/* Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0 cursor-crosshair"
        style={{ minHeight: '100vh', width: '100vw' }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-neutral-900/80 border border-white/10 text-white">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span className="text-sm font-medium">Győri spotok betöltése...</span>
          </div>
        </div>
      )}

      {/* Slide-over Spot Detail Drawer */}
      <SpotDetailDrawer
        spot={selectedSpot}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedSpot(null);
        }}
      />

      {/* Spot Submission Modal */}
      <SpotSubmissionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        initialCoords={tempCoords}
        onSuccess={() => {
          loadApprovedSpots();
        }}
      />

      {/* Location Permission Dialog */}
      <LocationPermissionDialog
        isOpen={isPermissionDialogOpen}
        onClose={() => setIsPermissionDialogOpen(false)}
        onRetry={() => {
          setIsPermissionDialogOpen(false);
          requestUserLocation();
        }}
        isLoading={isLocating}
        errorType={locErrorType}
      />

      {/* Scheduled Apple-Style Event Notification Popup */}
      <EventNotificationBanner />

      {/* Site Floating Navigation */}
      <FloatingNav />
    </div>
  );
};

export default SkateMapPage;
