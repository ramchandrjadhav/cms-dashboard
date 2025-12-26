import { useEffect, useRef, useState, useCallback } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Trash2,
  MapPin,
  Globe,
  Layers,
  RotateCcw,
  Navigation,
  Search,
  X,
  Info,
  Upload,
} from "lucide-react";

interface Coordinate {
  lat: number;
  lng: number;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function PolygonKmlEditor() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const gmapRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const drawingManagerRef = useRef<any>(null);
  const searchBoxRef = useRef<HTMLInputElement>(null);
  const [coords, setCoords] = useState<Coordinate[]>([]);
  const [ready, setReady] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mapType, setMapType] = useState<
    "roadmap" | "satellite" | "hybrid" | "terrain"
  >("satellite");
  const [zoom, setZoom] = useState(12);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const isUpdatingFromSelectionRef = useRef(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<"above" | "below">(
    "above"
  );
  const [copySuccess, setCopySuccess] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updateTooltipPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const tooltipHeight = 320;

      if (rect.top > tooltipHeight + 20) {
        setTooltipPosition("above");
      } else {
        setTooltipPosition("below");
      }
    }
  }, []);

  const handleShowInstructions = (show: boolean) => {
    if (show) {
      updateTooltipPosition();
    }
    setShowInstructions(show);
  };

  const setSearchQuerySafely = useCallback(
    (query: string, bypassSearch: boolean = false) => {
      if (bypassSearch) {
        isUpdatingFromSelectionRef.current = true;
      }
      setSearchQuery(query);
    },
    []
  );

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    if (isUpdatingFromSelectionRef.current) {
      return;
    }

    if (debouncedSearchQuery.trim() && ready) {
      performSearch(debouncedSearchQuery);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
      setSelectedResultIndex(-1);
    }
  }, [debouncedSearchQuery, ready]);

  useEffect(() => {
    if (!isUpdatingFromSelectionRef.current) {
      isUpdatingFromSelectionRef.current = false;
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        !(event.target as Element)?.closest(".tooltip-content")
      ) {
        setShowInstructions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (window.google && window.google.maps) {
      initializeMap();
    } else {
      const loader = new Loader({
        apiKey: import.meta.env.VITE_GOOGLE_PLACES_API_KEY,
        version: "weekly",
        libraries: ["drawing", "places"],
      });

      loader
        .load()
        .then(() => {
          initializeMap();
        })
        .catch((err) => {
          console.error("Google Maps failed to load:", err);
        });
    }
  }, []);

  const initializeMap = () => {
    if (!mapRef.current) return;

    if (!(google.maps as any).drawing) {
      console.error(
        "Drawing library not available. Please ensure Google Maps is loaded with drawing library."
      );
      return;
    }

    const center = { lat: 19.076, lng: 72.8777 }; // Mumbai default
    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 12,
      mapTypeId: "satellite" as any,
      tilt: 0,
      streetViewControl: true,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: "HORIZONTAL_BAR" as any,
        position: "TOP_RIGHT" as any,
      },
      zoomControl: true,
      zoomControlOptions: {
        position: "RIGHT_CENTER" as any,
      },
      scaleControl: true,
      rotateControl: true,
      fullscreenControl: true,
      gestureHandling: "greedy",
    });

    gmapRef.current = map;

    const drawingManager = new (google.maps as any).drawing.DrawingManager({
      drawingMode: null,
      drawingControl: true,
      drawingControlOptions: {
        position: "TOP_CENTER" as any,
        drawingModes: ["polygon" as any],
      },
      polygonOptions: {
        fillColor: "#4285F4",
        fillOpacity: 0.3,
        strokeColor: "#4285F4",
        strokeWeight: 3,
        editable: true,
        draggable: false,
      },
    });

    drawingManager.setMap(map);
    drawingManagerRef.current = drawingManager;

    (google.maps as any).event.addListener(
      drawingManager,
      "overlaycomplete",
      (e: any) => {
        if (e.type !== "polygon") return;

        if (polygonRef.current) {
          polygonRef.current.setMap(null);
        }

        const poly = e.overlay;
        polygonRef.current = poly;

        drawingManager.setDrawingMode(null);
        setIsDrawing(false);

        const path = poly.getPath();

        const updateStateFromPath = () => {
          const arr: Coordinate[] = [];
          for (let i = 0; i < path.getLength(); i++) {
            const p = path.getAt(i);
            arr.push({ lat: p.lat(), lng: p.lng() });
          }
          setCoords(arr);
        };

        updateStateFromPath();

        (google.maps as any).event.addListener(
          path,
          "insert_at",
          updateStateFromPath
        );
        (google.maps as any).event.addListener(
          path,
          "remove_at",
          updateStateFromPath
        );
        (google.maps as any).event.addListener(
          path,
          "set_at",
          updateStateFromPath
        );
      }
    );

    (google.maps as any).event.addListener(map, "maptypeid_changed", () => {
      setMapType((map as any).getMapTypeId() as any);
    });

    (google.maps as any).event.addListener(map, "zoom_changed", () => {
      setZoom((map as any).getZoom() || 12);
    });

    setReady(true);
  };

  const startDrawing = () => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode("polygon" as any);
      setIsDrawing(true);
    }
  };

  const clearPolygon = () => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
    setCoords([]);
    setIsDrawing(false);
  };

  const resetView = () => {
    if (gmapRef.current) {
      gmapRef.current.setZoom(12);
      gmapRef.current.setCenter({ lat: 19.076, lng: 72.8777 });
      setZoom(12);
    }
  };

  const changeMapType = (
    type: "roadmap" | "satellite" | "hybrid" | "terrain"
  ) => {
    if (gmapRef.current) {
      gmapRef.current.setMapTypeId(type);
      setMapType(type);
    }
  };

  const performSearch = async (query: string) => {
    setIsSearching(true);
    setSearchResults([]);
    setSelectedResultIndex(-1);

    try {
      if (
        !(google.maps as any).places ||
        !(google.maps as any).places.AutocompleteService
      ) {
        console.error("Google Places API not available");
        setIsSearching(false);
        return;
      }

      const autocompleteService = new (
        google.maps as any
      ).places.AutocompleteService();
      const placesService = new (google.maps as any).places.PlacesService(
        gmapRef.current
      );

      autocompleteService.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: "in" },
        },
        async (predictions: any[], status: any) => {
          if (status === "OK" && predictions && predictions.length > 0) {
            const detailedResults = await Promise.all(
              predictions.slice(0, 10).map(async (prediction) => {
                return new Promise((resolve) => {
                  placesService.getDetails(
                    {
                      placeId: prediction.place_id,
                      fields: ["name", "formatted_address", "geometry"],
                    },
                    (place: any, detailStatus: any) => {
                      if (detailStatus === "OK" && place) {
                        resolve({
                          name: place.name || prediction.description,
                          formatted_address: place.formatted_address,
                          geometry: place.geometry,
                        });
                      } else {
                        resolve({
                          name: prediction.description,
                          formatted_address: prediction.description,
                          geometry: null,
                        });
                      }
                    }
                  );
                });
              })
            );

            const validResults = detailedResults.filter(
              (result: any) => result.geometry
            );

            if (validResults.length > 0) {
              setSearchResults(validResults);
              setShowSearchResults(true);
              setSelectedResultIndex(-1);
            } else {
              setSearchResults([]);
              setShowSearchResults(false);
              setSelectedResultIndex(-1);
            }
          } else {
            setSearchResults([]);
            setShowSearchResults(false);
            setSelectedResultIndex(-1);
          }
          setIsSearching(false);
        }
      );
    } catch (error) {
      console.error("Search error:", error);
      setIsSearching(false);
      setSelectedResultIndex(-1);
    }
  };

  const goToLocation = (place: any) => {
    if (!place.geometry || !gmapRef.current) {
      return;
    }
    const location = place.geometry.location;
    isUpdatingFromSelectionRef.current = true;
    const displayText = place.name || place.formatted_address;
    setSearchQuerySafely(displayText, true);

    setShowSearchResults(false);
    setSelectedResultIndex(-1);

    setTimeout(() => {
      try {
        gmapRef.current.setCenter(location);
        gmapRef.current.setZoom(16);

        const marker = new (google.maps as any).Marker({
          position: location,
          map: gmapRef.current,
          title: displayText,
          icon: {
            url:
              "data:image/svg+xml;charset=UTF-8," +
              encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4285F4"/>
                <circle cx="12" cy="9" r="2.5" fill="white"/>
              </svg>
            `),
            scaledSize: new (google.maps as any).Size(24, 24),
          },
        });
      } catch (error) {
        console.error("Error in map operations:", error);
      }
    }, 100);

    setTimeout(() => {
      setSearchResults([]);
      setTimeout(() => {
        isUpdatingFromSelectionRef.current = false;
      }, 500);
    }, 200);
  };

  const exportKml = () => {
    if (!coords.length) return;
    const coordString = coords.map((c) => `${c.lng},${c.lat},0`).join(" ");

    const kml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<kml xmlns="http://www.opengis.net/kml/2.2">\n` +
      `  <Document>\n` +
      `    <name>Drawn Polygon</name>\n` +
      `    <Placemark>\n` +
      `      <name>Polygon</name>\n` +
      `      <Style>\n` +
      `        <LineStyle><width>2</width></LineStyle>\n` +
      `        <PolyStyle><fill>1</fill><outline>1</outline></PolyStyle>\n` +
      `      </Style>\n` +
      `      <Polygon>\n` +
      `        <extrude>0</extrude>\n` +
      `        <altitudeMode>clampToGround</altitudeMode>\n` +
      `        <outerBoundaryIs>\n` +
      `          <LinearRing>\n` +
      `            <coordinates>${coordString}</coordinates>\n` +
      `          </LinearRing>\n` +
      `        </outerBoundaryIs>\n` +
      `      </Polygon>\n` +
      `    </Placemark>\n` +
      `  </Document>\n` +
      `</kml>`;

    const blob = new Blob([kml], {
      type: "application/vnd.google-earth.kml+xml",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `polygon-${new Date().toISOString().split("T")[0]}.kml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyCoordinates = () => {
    if (!coords.length) return;

    const coordString = coords
      .map((c) => `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`)
      .join("\n");

    navigator.clipboard.writeText(coordString).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/50 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto p-6 mx-6">
          <div className="flex items-center gap-3">
            {/* <Globe className="h-8 w-8 text-primary" /> */}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Serviceable Area Drawer
              </h1>
              <p className="text-sm text-muted-foreground">
                Professional polygon drawing tool
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-card-foreground">
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Drawing & Navigation Controls
              </div>
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                  onMouseEnter={() => handleShowInstructions(true)}
                  onClick={() => handleShowInstructions(!showInstructions)}
                  ref={buttonRef}
                >
                  <Info className="h-4 w-4" />
                </Button>

                {showInstructions && (
                  <div
                    className={`absolute transform tooltip-content ${
                      tooltipPosition === "above"
                        ? "bottom-full mb-2"
                        : "top-full mt-2"
                    } w-80 bg-background border border-border rounded-lg shadow-lg p-4 z-50`}
                    style={{
                      right: "0px",
                      transform: "translateX(0%)",
                    }}
                    onMouseEnter={() => handleShowInstructions(true)}
                    onMouseLeave={() => handleShowInstructions(false)}
                  >
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-3 text-card-foreground flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          1. Search & Navigate
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-2">
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></span>
                            Use the search box to find specific locations
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></span>
                            Click on search results to navigate to that location
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></span>
                            Use map controls to zoom, pan, and rotate the view
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 text-card-foreground flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          2. Draw & Export
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-2">
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></span>
                            Click "Start Drawing" to activate polygon mode
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></span>
                            Click on the map to place vertices, double-click to
                            complete
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></span>
                            Export as KML file or copy coordinates for use
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div
                      className={`absolute w-0 h-0 ${
                        tooltipPosition === "above"
                          ? "top-full right-4 border-l-4 border-r-4 border-t-4 border-transparent border-t-border"
                          : "bottom-full right-4 border-l-4 border-r-4 border-b-4 border-transparent border-b-border"
                      }`}
                    ></div>
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-card-foreground flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Location Search
                </h4>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchBoxRef}
                    placeholder="Search for a place, address, or landmark..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) {
                        setShowSearchResults(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setSelectedResultIndex((prev) =>
                          prev < searchResults.length - 1 ? prev + 1 : prev
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setSelectedResultIndex((prev) =>
                          prev > 0 ? prev - 1 : -1
                        );
                      } else if (
                        e.key === "Enter" &&
                        selectedResultIndex >= 0
                      ) {
                        e.preventDefault();
                        goToLocation(searchResults[selectedResultIndex]);
                      } else if (e.key === "Escape") {
                        setShowSearchResults(false);
                        setSelectedResultIndex(-1);
                      }
                    }}
                    className="pl-10 pr-10"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  )}
                  {searchQuery && !isSearching && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => {
                        setSearchQuerySafely("", true);
                        setSearchResults([]);
                        setShowSearchResults(false);
                        setSelectedResultIndex(-1);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {showSearchResults && searchResults.length > 0 && (
                  <div className="relative">
                    <div
                      className="absolute top-0 left-0 right-0 z-50 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        backgroundColor: "white",
                        borderRadius: "8px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                        maxHeight: "240px",
                        overflowY: "auto",
                      }}
                    >
                      {searchResults.map((result, index) => (
                        <div
                          key={index}
                          className={`p-3 cursor-pointer transition-colors border-b border-border last:border-b-0 ${
                            selectedResultIndex === index
                              ? "bg-muted"
                              : "hover:bg-muted"
                          }`}
                          style={{
                            cursor: "pointer",
                            backgroundColor:
                              index === selectedResultIndex
                                ? "#f3f4f6"
                                : "transparent",
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            setTimeout(() => {
                              goToLocation(result);
                              setSelectedResultIndex(-1);
                            }, 10);
                          }}
                        >
                          <div className="font-medium text-foreground">
                            {result.name || "Unnamed Location"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {result.formatted_address}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {isSearching && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Searching...
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-card-foreground">
                    Drawing
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={startDrawing}
                      disabled={!ready || isDrawing}
                      variant="default"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      Start Drawing
                    </Button>
                    <Button
                      onClick={clearPolygon}
                      variant="destructive"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-card-foreground">
                    Map Type
                  </h4>
                  <Select
                    onValueChange={(value) =>
                      changeMapType(
                        value as "roadmap" | "satellite" | "hybrid" | "terrain"
                      )
                    }
                    defaultValue={mapType}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select a map type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="roadmap">Roadmap</SelectItem>
                      <SelectItem value="satellite">Satellite</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="terrain">Terrain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-card-foreground">View</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={resetView}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset View
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-card-foreground">Export</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={exportKml}
                      disabled={!coords.length}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      KML
                    </Button>
                    <Button
                      onClick={copyCoordinates}
                      disabled={!coords.length}
                      variant={copySuccess ? "default" : "outline"}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {copySuccess ? (
                        <>
                          <span className="text-green-600">✓</span>
                          Copied!
                        </>
                      ) : (
                        "Copy Coords"
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                {isDrawing && (
                  <Badge variant="warning" className="animate-pulse">
                    Drawing Mode Active
                  </Badge>
                )}
                {!ready && (
                  <Badge
                    variant="outline"
                    className="bg-muted text-muted-foreground"
                  >
                    Loading Google Maps...
                  </Badge>
                )}
                {coords.length > 0 && (
                  <Badge variant="success">
                    {coords.length} points captured
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border bg-background-secondary">
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Layers className="h-5 w-5" />
              Interactive Map View
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div ref={mapRef} className="w-full h-[75vh] relative" />
          </CardContent>
        </Card>

        {coords.length > 0 && (
          <Card className="border border-success/20 bg-success-light/10 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <MapPin className="h-5 w-5" />
                Polygon Coordinates
                <Badge variant="success">{coords.length} points</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-60 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {coords.map((coord, index) => (
                    <div
                      key={index}
                      className="p-3 bg-background rounded-lg border border-border text-sm font-mono shadow-sm hover:shadow-md transition-shadow"
                    >
                      <span className="text-success font-semibold">
                        Point {index + 1}:
                      </span>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lat:</span>
                          <span className="text-success font-medium">
                            {coord.lat.toFixed(6)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lng:</span>
                          <span className="text-success font-medium">
                            {coord.lng.toFixed(6)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
