import React, { useState, useEffect, useRef } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";
import { Search, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import GooglePlacesService from "@/services/googlePlaces";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: {
    city: string;
    state: string;
    country: string;
    pincode: string;
    latitude: number;
    longitude: number;
    formattedAddress: string;
  }) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export function LocationAutocomplete({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Search for a city...",
  label,
  error,
  className,
  disabled = false,
}: LocationAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [googlePlacesService, setGooglePlacesService] =
    useState<GooglePlacesService | null>(null);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const isProgrammaticUpdateRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize Google Places service
  useEffect(() => {
    const initializeService = async () => {
      try {
        // Check if Google Maps is already loaded with places library
        if (window.google && window.google.maps && window.google.maps.places) {
          const service = new GooglePlacesService();
          setGooglePlacesService(service);
        } else {
          // Wait a bit for other components to load Google Maps
          const checkInterval = setInterval(() => {
            if (
              window.google &&
              window.google.maps &&
              window.google.maps.places
            ) {
              clearInterval(checkInterval);
              const service = new GooglePlacesService();
              setGooglePlacesService(service);
            }
          }, 100);

          // Clear interval after 5 seconds to prevent infinite waiting
          setTimeout(() => {
            clearInterval(checkInterval);
          }, 5000);
        }
      } catch (error) {
        console.error("Failed to initialize Google Places service:", error);
      }
    };

    initializeService();
  }, []);

  const getPredictions = async (input: string): Promise<Prediction[]> => {
    if (!googlePlacesService || input.length < 2) {
      return [];
    }

    try {
      const predictions = await googlePlacesService.getPlacePredictions(input);
      return predictions.map((p) => ({
        place_id: p.place_id,
        description: p.description,
        structured_formatting: p.structured_formatting,
      }));
    } catch (error) {
      console.error("Error fetching predictions:", error);
      return [];
    }
  };

  const getPlaceDetails = async (placeId: string) => {
    if (!googlePlacesService) {
      throw new Error("Google Places service not initialized");
    }

    const placeDetails = await googlePlacesService.getPlaceDetails(placeId);
    const extractedComponents =
      googlePlacesService.extractAddressComponents(placeDetails);
    return extractedComponents;
  };

  useEffect(() => {
    const fetchPredictions = async () => {
      // Don't fetch predictions if this is a programmatic update
      if (isProgrammaticUpdateRef.current) {
        return;
      }

      if (value.length < 2) {
        setPredictions([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await getPredictions(value);
        setPredictions(results);
        setShowDropdown(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Error fetching predictions:", error);
        setPredictions([]);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchPredictions, 300);

    // Reset isUserTyping after user stops typing for 1 second
    const resetUserTypingTimer = setTimeout(() => {
      setIsUserTyping(false);
    }, 1000);

    return () => {
      clearTimeout(debounceTimer);
      clearTimeout(resetUserTypingTimer);
    };
  }, [value, googlePlacesService]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsUserTyping(true);
    setShowDropdown(true);
  };

  const handlePredictionSelect = async (prediction: Prediction) => {
    try {
      const locationDetails = await getPlaceDetails(prediction.place_id);
      onLocationSelect(locationDetails);

      // Set flag to prevent prediction fetching BEFORE updating the value
      isProgrammaticUpdateRef.current = true;
      setIsUserTyping(false);
      setShowDropdown(false);
      setPredictions([]);

      // Update the input value after setting the flag
      onChange(prediction.description);

      // Reset the flag after a delay to ensure the onChange has been processed
      setTimeout(() => {
        isProgrammaticUpdateRef.current = false;
      }, 1000);
    } catch (error) {
      console.error("Error getting place details:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handlePredictionSelect(predictions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (
      inputRef.current &&
      !inputRef.current.contains(e.target as Node) &&
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node)
    ) {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)}>
      {label && (
        <Label className="text-sm font-medium mb-2 block">{label}</Label>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Textarea
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className={cn("pl-10", error && "border-destructive")}
        />
        {isLoading && (
          <div className="absolute right-3 top-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive mt-1">{error}</p>}

      {showDropdown && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {predictions.map((prediction, index) => (
            <div
              key={prediction.place_id}
              className={cn(
                "px-4 py-3 cursor-pointer hover:bg-muted transition-colors",
                selectedIndex === index && "bg-muted"
              )}
              onClick={() => handlePredictionSelect(prediction)}
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {prediction.structured_formatting.main_text}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {predictions.length === 5 && (
            <div className="px-4 py-2 text-xs text-muted-foreground border-t">
              Tip: Try typing more specific city names for better results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
