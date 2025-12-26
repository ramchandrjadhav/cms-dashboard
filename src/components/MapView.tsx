import React, { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import GooglePlacesService from "@/services/googlePlaces";

// Google Maps API type declarations
declare global {
  interface Window {
    google: any;
  }

  namespace google {
    namespace maps {
      class Map {
        constructor(element: HTMLElement, options: any);
        setCenter(latLng: LatLng): void;
        setZoom(zoom: number): void;
        panTo(latLng: LatLng): void;
        addListener(event: string, handler: (e: any) => void): void;
      }

      class Marker {
        constructor(options: any);
        setPosition(latLng: LatLng): void;
        setMap(map: Map | null): void;
        getPosition(): LatLng | null;
        addListener(event: string, handler: () => void): void;
      }

      class Geocoder {
        constructor();
        geocode(
          request: any,
          callback: (results: any[] | null, status: string) => void
        ): void;
      }

      class LatLng {
        constructor(lat: number, lng: number);
        lat(): number;
        lng(): number;
      }

      interface MapMouseEvent {
        latLng: LatLng;
      }
    }
  }
}

interface MapViewProps {
  lat?: number;
  lng?: number;
  onLocationSelect: (addressData: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  }) => void;
}

const DEFAULT_CENTER = { lat: 22.9734, lng: 78.6569 }; // Center on India

const MapView: React.FC<MapViewProps> = ({ lat, lng, onLocationSelect }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const loadMap = async () => {
    if (window.google && window.google.maps) {
      initializeMap();
    } else {
      const loader = new Loader({
        apiKey: import.meta.env.VITE_GOOGLE_PLACES_API_KEY,
        version: "weekly",
        libraries: ["drawing", "places"],
      });

      await loader.load();
      initializeMap();
    }
  };

  const initializeMap = () => {
    if (!mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: lat && lng ? { lat, lng } : DEFAULT_CENTER,
      zoom: lat && lng ? 16 : 5,
      streetViewControl: false,
      mapTypeControl: false,
    });

    const marker = new google.maps.Marker({
      position: lat && lng ? { lat, lng } : undefined,
      map: lat && lng ? map : undefined,
      draggable: true,
    });

    const geocoder = new google.maps.Geocoder();

    mapInstance.current = map;
    markerRef.current = marker;
    geocoderRef.current = geocoder;

    // Click to place pin feature
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      const clickedLatLng = e.latLng;
      if (clickedLatLng) {
        placeMarkerAndReverseGeocode(clickedLatLng.lat(), clickedLatLng.lng());
      }
    });

    // Drag marker listener
    marker.addListener("dragend", () => {
      const position = marker.getPosition();
      if (position) {
        placeMarkerAndReverseGeocode(position.lat(), position.lng());
      }
    });

    // If lat/lng was passed, trigger reverse geocode on load
    if (lat && lng) {
      placeMarkerAndReverseGeocode(lat, lng);
    }
  };

  const placeMarkerAndReverseGeocode = (lat: number, lng: number) => {
    if (!mapInstance.current || !markerRef.current || !geocoderRef.current)
      return;

    const position = new google.maps.LatLng(lat, lng);

    markerRef.current.setPosition(position);
    markerRef.current.setMap(mapInstance.current);
    mapInstance.current.panTo(position);
    mapInstance.current.setZoom(16);

    geocoderRef.current.geocode({ location: position }, (results, status) => {
      if (status === "OK" && results && results.length > 0) {
        const place = results[0];
        const googlePlacesService = new GooglePlacesService();
        const structured = googlePlacesService.extractAddressComponents(place);

        onLocationSelect({
          latitude: lat,
          longitude: lng,
          formattedAddress: place.formatted_address || "",
          city: structured.city,
          state: structured.state,
          country: structured.country,
          pincode: structured.pincode,
        });
      }
    });
  };

  // Update map when coordinates change
  useEffect(() => {
    if (mapInstance.current && markerRef.current && lat && lng) {
      const position = new google.maps.LatLng(lat, lng);

      // Update marker position
      markerRef.current.setPosition(position);
      markerRef.current.setMap(mapInstance.current);

      // Pan and zoom to the new location
      mapInstance.current.panTo(position);
      mapInstance.current.setZoom(16);
    }
  }, [lat, lng]);

  useEffect(() => {
    loadMap();
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full h-[28rem] rounded-md shadow border mt-4"
    />
  );
};

export default MapView;
