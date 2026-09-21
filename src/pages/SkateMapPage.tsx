import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import FloatingNav from '@/components/FloatingNav';
import { SpotDetailDrawer } from '@/components/skatemap/SpotDetailDrawer';
import { SpotSubmissionModal } from '@/components/skatemap/SpotSubmissionModal';
import { MapSearchOverlay } from '@/components/skatemap/MapSearchOverlay';
import { LocationPermissionDialog } from '@/components/skatemap/LocationPermissionDialog';
import { getSpots } from '@/services/spotService';
import { Spot } from '@/types/spot';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, Compass, Loader2, Info, Locate, ShieldCheck } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Győr configuration
const GYOR_CENTER: [number, number] = [47.6875, 17.6504];
const GYOR_BOUNDS: [[number, number], [number, number]] = [
  [47.5800, 17.5000],
  [47.7800, 17.8000],
];

// Helper to create custom HTML markers matching dark glassmorphism
const createSpotIcon = (title: string, spotType?: string) => {
  const emoji = spotType === 'skatepark' ? '🛹' : '🏙️';
  return L.divIcon({
    className: 'custom-skate-marker',
    html: `
      <div class="relative group cursor-pointer flex items-center justify-center">
        <div class="w-10 h-10 rounded-2xl bg-neutral-900/90 border border-emerald-500/50 backdrop-blur-md shadow-lg shadow-emerald-500/20 flex items-center justify-center transition-all duration-300 transform group-hover:scale-115 group-hover:border-emerald-400 group-hover:shadow-emerald-400/40">
          <span class="text-lg">${emoji}</span>
        </div>
        <div class="absolute -bottom-1 w-2 h-2 bg-emerald-400 rotate-45 border-r border-b border-emerald-500/50"></div>
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

const SkateMapPage: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'skatepark' | 'street_spot'>('all');
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddingPin, setIsAddingPin] = useState(false);
  const [tempCoords, setTempCoords] = useState<{ lat: number; lng: number } | null>(null);
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

  // 3. Render approved spot markers whenever spots or filter changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const filteredSpots = spots.filter((spot) => {
      if (filterType === 'all') return true;
      return spot.spot_type === filterType;
    });

    filteredSpots.forEach((spot) => {
      const marker = L.marker([spot.latitude, spot.longitude], {
        icon: createSpotIcon(spot.title, spot.spot_type),
      });

      marker.on('click', () => {
        setSelectedSpot(spot);
        setIsDrawerOpen(true);
      });

      const isSkatepark = spot.spot_type === 'skatepark';
      const features = Array.isArray(spot.features) ? spot.features : [];
      const featureLabels: Record<string, string> = {
        rail: '🦯 Korlát',
        ledge: '🧱 Padka',
        gap: '🪜 Gap',
        flatground: '🛹 Flat',
      };

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
            <span class="w-2 h-2 rounded-full ${
              isSkatepark
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
            }"></span>
            <span class="font-bold text-white text-xs tracking-tight">${spot.title}</span>
            <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
              isSkatepark
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            }">
              ${isSkatepark ? 'Skatepark' : 'Street'}
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
  }, [spots, filterType]);

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
          <span class="font-bold text-xs text-white tracking-tight">${name}</span>
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
    <div className="relative w-full h-screen overflow-hidden bg-neutral-950">
      {/* Top Glass Header & Search Overlay */}
      <header className="absolute top-4 left-4 right-4 sm:right-auto z-20 pointer-events-auto flex flex-col gap-2 max-w-full sm:max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-neutral-950/75 border border-white/10 backdrop-blur-xl shadow-2xl">
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
                  {spots.length} spot
                </span>
              </div>

              {/* Sub-row under Győri Skatemap: BETA pill + Info button */}
              <div className="flex items-center gap-1.5 mt-1">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all shadow-sm">
                        BETA
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      align="start"
                      className="max-w-[260px] bg-neutral-900/95 border border-amber-500/30 text-neutral-200 text-xs p-3 backdrop-blur-xl shadow-2xl rounded-xl"
                    >
                      <p className="font-bold text-amber-300 mb-0.5 text-xs">Fejlesztés alatt álló funkció</p>
                      <p className="text-[11px] text-neutral-300 leading-relaxed">
                        Ez a funkció még béta fázisban van: a térkép aktív fejlesztés alatt áll, a felület és a funkciók még nem véglegesek.
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Adatfelhasználási tájékoztató"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      align="start"
                      className="max-w-[280px] bg-neutral-900/95 border border-white/15 text-neutral-200 text-xs p-3 backdrop-blur-xl shadow-2xl rounded-xl space-y-1.5"
                    >
                      <p className="font-bold text-white flex items-center gap-1.5 text-xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Adatfelhasználási tájékoztató
                      </p>
                      <p className="text-[11px] text-neutral-300 leading-relaxed">
                        A helyzetedet (GPS / IP koordinátáidat) kizárólag a böngésződben használjuk a térképen való megjelenítéshez.
                      </p>
                      <div className="pt-1 border-t border-white/10 text-[10px] text-neutral-400 space-y-0.5">
                        <p>✓ Semmilyen személyes vagy helyadatot nem mentünk el.</p>
                        <p>✓ Az adatokat nem használjuk fel semmire és nem továbbítjuk.</p>
                        <p>✓ Az oldalon egyáltalán nincs reklám vagy hirdetés.</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 sm:border-l sm:border-white/10 sm:pl-3 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                filterType === 'all'
                  ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              Összes
            </button>
            <button
              type="button"
              onClick={() => setFilterType('skatepark')}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                filterType === 'skatepark'
                  ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              🛹 Skatepark
            </button>
            <button
              type="button"
              onClick={() => setFilterType('street_spot')}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                filterType === 'street_spot'
                  ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              🏙️ Street
            </button>
          </div>

          {/* Real-time Geofenced Search Input */}
          <div className="sm:border-l sm:border-white/10 sm:pl-3 w-full sm:w-64">
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
      <div className="absolute bottom-24 right-4 sm:right-6 z-20 flex flex-col gap-3 pointer-events-auto">
        {/* Show My Location Button */}
        <Button
          size="icon"
          onClick={requestUserLocation}
          disabled={isLocating}
          className="w-12 h-12 rounded-2xl bg-neutral-950/80 border border-white/10 backdrop-blur-xl text-neutral-300 hover:text-white hover:bg-neutral-900 shadow-xl transition-all hover:scale-105 active:scale-95"
          title="Saját helyzetem mutatása"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          ) : (
            <Locate className="w-5 h-5 text-cyan-400" />
          )}
        </Button>

        {/* Recenter Button */}
        <Button
          size="icon"
          onClick={handleRecenter}
          className="w-12 h-12 rounded-2xl bg-neutral-950/80 border border-white/10 backdrop-blur-xl text-neutral-300 hover:text-white hover:bg-neutral-900 shadow-xl transition-all hover:scale-105 active:scale-95"
          title="Vissza Győr központjához"
        >
          <Compass className="w-5 h-5" />
        </Button>

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

      {/* Site Floating Navigation */}
      <FloatingNav />
    </div>
  );
};

export default SkateMapPage;
