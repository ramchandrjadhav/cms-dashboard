import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';

interface MapboxMapProps {
  center: [number, number];
  radius?: number;
  className?: string;
  mapboxToken?: string;
}

const MapboxMap: React.FC<MapboxMapProps> = ({ 
  center, 
  radius = 5, 
  className,
  mapboxToken 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isTokenValid, setIsTokenValid] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    try {
      // Initialize map
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: center,
        zoom: 12,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      // Add facility marker
      new mapboxgl.Marker({
        color: '#3B82F6',
        scale: 1.2,
      })
        .setLngLat(center)
        .addTo(map.current);

      // Add delivery radius circle
      map.current.on('load', () => {
        if (!map.current) return;

        // Add source for the circle
        map.current.addSource('radius', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: center,
            },
            properties: {}
          }
        });

        // Add circle layer
        map.current.addLayer({
          id: 'radius',
          type: 'circle',
          source: 'radius',
          paint: {
            'circle-radius': {
              stops: [
                [0, 0],
                [20, radius * 1000 * 0.075] // Approximate conversion for visual representation
              ],
              base: 2
            },
            'circle-color': '#3B82F6',
            'circle-opacity': 0.1,
            'circle-stroke-color': '#3B82F6',
            'circle-stroke-width': 2,
            'circle-stroke-opacity': 0.8
          }
        });
      });

      setIsTokenValid(true);
    } catch (error) {
      console.error('Mapbox initialization error:', error);
      setIsTokenValid(false);
    }

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [center, radius, mapboxToken]);

  if (!mapboxToken) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded-lg", className)}>
        <div className="text-center p-6">
          <p className="text-muted-foreground mb-2">Map requires Mapbox token</p>
          <p className="text-sm text-muted-foreground">Please configure your Mapbox public token</p>
        </div>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded-lg", className)}>
        <div className="text-center p-6">
          <p className="text-muted-foreground mb-2">Invalid Mapbox token</p>
          <p className="text-sm text-muted-foreground">Please check your token configuration</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Facility Location</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-3 h-3 border-2 border-blue-500 rounded-full bg-blue-500/20"></div>
          <span>Delivery Radius ({radius} km)</span>
        </div>
      </div>
    </div>
  );
};

export default MapboxMap;