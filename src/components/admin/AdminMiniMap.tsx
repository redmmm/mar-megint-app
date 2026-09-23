import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface AdminMiniMapProps {
  lat: number;
  lng: number;
  title?: string;
  isDraggable?: boolean;
  onPositionChange?: (lat: number, lng: number) => void;
  className?: string;
}

export const AdminMiniMap: React.FC<AdminMiniMapProps> = ({
  lat,
  lng,
  title,
  isDraggable = false,
  onPositionChange,
  className = 'h-40 w-full',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      className: 'map-dark-tiles',
      maxZoom: 19,
      minZoom: 11,
      keepBuffer: 2,
      updateWhenIdle: true,
      updateWhenZooming: false,
    }).addTo(map);

    const icon = L.divIcon({
      className: 'admin-mini-marker',
      html: `
        <div class="w-8 h-8 rounded-xl bg-emerald-500 border border-white shadow-lg flex items-center justify-center text-sm transform -translate-x-1/2 -translate-y-1/2">
          🛹
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([lat, lng], {
      icon,
      draggable: isDraggable,
    }).addTo(map);

    markerRef.current = marker;

    if (isDraggable) {
      marker.on('dragend', () => {
        const newPos = marker.getLatLng();
        if (onPositionChange) {
          onPositionChange(newPos.lat, newPos.lng);
        }
      });
    }

    // Force redraw on container layout
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update position if props change
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    }
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className={`rounded-xl overflow-hidden border border-white/10 ${className}`}
    />
  );
};
