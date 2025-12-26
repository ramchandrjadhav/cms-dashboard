import { Loader } from "@googlemaps/js-api-loader";

// Google Maps API type declarations
declare global {
  interface Window {
    google: any;
  }

  namespace google {
    namespace maps {
      namespace places {
        class AutocompleteService {
          getPlacePredictions(
            request: {
              input: string;
              types?: string[];
              componentRestrictions?: { country: string };
            },
            callback: (
              predictions: any[] | null,
              status: PlacesServiceStatus
            ) => void
          ): void;
        }

        class PlacesService {
          constructor(attrContainer: HTMLDivElement);
          getDetails(
            request: {
              placeId: string;
              fields: string[];
            },
            callback: (place: any, status: PlacesServiceStatus) => void
          ): void;
        }

        enum PlacesServiceStatus {
          OK = "OK",
          ZERO_RESULTS = "ZERO_RESULTS",
          OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
          REQUEST_DENIED = "REQUEST_DENIED",
          INVALID_REQUEST = "INVALID_REQUEST",
          UNKNOWN_ERROR = "UNKNOWN_ERROR",
        }
      }
    }
  }
}

interface PlacePrediction {
  place_id: string;
  description: string;
  matched_substrings: Array<{
    length: number;
    offset: number;
  }>;
  reference: string;
  structured_formatting: {
    main_text: string;
    main_text_matched_substrings: Array<{
      length: number;
      offset: number;
    }>;
    secondary_text: string;
  };
  terms: Array<{
    offset: number;
    value: string;
  }>;
  types: string[];
}

interface PlaceDetails {
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  formatted_address: string;
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
}

class GooglePlacesService {
  private apiKey: string;
  private autocompleteService: google.maps.places.AutocompleteService | null =
    null;
  private placesService: google.maps.places.PlacesService | null = null;
  private isInitialized = false;

  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || "";

    if (!this.apiKey) {
      console.warn("Google Places API key not found in environment variables");
    }
  }

  private async initializeServices() {
    if (this.isInitialized) return;

    if (!this.apiKey) {
      throw new Error("Google Places API key is required");
    }

    try {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log("GooglePlacesService: Using existing Google Maps instance");
        this.autocompleteService = new google.maps.places.AutocompleteService();
        // Create a dummy div for PlacesService (required by Google Maps API)
        const mapDiv = document.createElement("div");
        this.placesService = new google.maps.places.PlacesService(mapDiv);
        this.isInitialized = true;
        return;
      }

      // Only load if not already loaded
      console.log("GooglePlacesService: Loading Google Maps API");
      const loader = new Loader({
        apiKey: this.apiKey,
        version: "weekly",
        libraries: ["places"],
      });

      await loader.load();

      this.autocompleteService = new google.maps.places.AutocompleteService();
      // Create a dummy div for PlacesService (required by Google Maps API)
      const mapDiv = document.createElement("div");
      this.placesService = new google.maps.places.PlacesService(mapDiv);

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize Google Maps API:", error);
      throw error;
    }
  }

  async getPlacePredictions(input: string): Promise<PlacePrediction[]> {
    if (!input || input.length < 2) {
      return [];
    }

    try {
      await this.initializeServices();

      if (!this.autocompleteService) {
        throw new Error("Google Places API not initialized");
      }

      return new Promise((resolve, reject) => {
        this.autocompleteService!.getPlacePredictions(
          {
            input,
            // types: ["(cities)"],
            componentRestrictions: { country: "in" }, // Keep India restriction
          },
          (predictions, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              predictions
            ) {
              resolve(predictions as PlacePrediction[]);
            } else {
              resolve([]);
            }
          }
        );
      });
    } catch (error) {
      console.error("Error fetching place predictions:", error);
      return [];
    }
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    if (!placeId) {
      throw new Error("Place ID is required");
    }

    try {
      await this.initializeServices();

      if (!this.placesService) {
        throw new Error("Google Places API not initialized");
      }

      return new Promise((resolve, reject) => {
        this.placesService!.getDetails(
          {
            placeId,
            fields: ["address_components", "formatted_address", "geometry"],
          },
          (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
              resolve(place as PlaceDetails);
            } else {
              reject(new Error("Failed to get place details"));
            }
          }
        );
      });
    } catch (error) {
      console.error("Error fetching place details:", error);
      throw error;
    }
  }

  extractAddressComponents(placeDetails: PlaceDetails) {
    const components = placeDetails.address_components;

    let city = "";
    let state = "";
    let country = "";
    let pincode = "";

    for (const component of components) {
      const types = component.types;

      // Prioritize locality over administrative_area_level_2 for city
      if (types.includes("locality")) {
        city = component.long_name;
      } else if (types.includes("administrative_area_level_2") && !city) {
        // Only use administrative_area_level_2 if we haven't found a locality
        city = component.long_name;
      } else if (types.includes("administrative_area_level_1")) {
        state = component.long_name;
      } else if (types.includes("country")) {
        country = component.long_name;
      } else if (types.includes("postal_code")) {
        pincode = component.long_name;
      }
    }

    const result = {
      city,
      state,
      country,
      pincode,
      latitude:
        typeof placeDetails.geometry.location.lat === "function"
          ? placeDetails.geometry.location.lat()
          : placeDetails.geometry.location.lat,
      longitude:
        typeof placeDetails.geometry.location.lng === "function"
          ? placeDetails.geometry.location.lng()
          : placeDetails.geometry.location.lng,
      formattedAddress: placeDetails.formatted_address,
    };

    return result;
  }
}

export default GooglePlacesService;
