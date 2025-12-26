import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Package, 
  Zap, 
  Target, 
  Route,
  Search,
  Eye,
  EyeOff,
  Building,
  Truck,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ProductWithVariants, ProductVariant, AvailabilityCheck } from '@/types/variant-types';
import { apiClient } from '@/lib/api-client';

// Mock data for facilities
const mockFacilities = [
  {
    id: '1',
    name: 'Central Warehouse',
    type: 'warehouse',
    address: '123 Main St, Downtown',
    coordinates: [40.7128, -74.0060] as [number, number],
    radius: 5000, // 5km in meters
    isActive: true,
    products: ['Product A', 'Product B', 'Product C'],
    capacity: 1000,
    currentLoad: 750
  },
  {
    id: '2',
    name: 'North Distribution Center',
    type: 'distribution',
    address: '456 North Ave, Uptown',
    coordinates: [40.7580, -73.9855] as [number, number],
    radius: 3000, // 3km in meters
    isActive: true,
    products: ['Product A', 'Product D', 'Product E'],
    capacity: 800,
    currentLoad: 600
  },
  {
    id: '3',
    name: 'East Store',
    type: 'store',
    address: '789 East St, Eastside',
    coordinates: [40.7282, -73.9942] as [number, number],
    radius: 2000, // 2km in meters
    isActive: true,
    products: ['Product B', 'Product C', 'Product F'],
    capacity: 500,
    currentLoad: 300
  },
  {
    id: '4',
    name: 'South Hub',
    type: 'hub',
    address: '321 South Blvd, Southside',
    coordinates: [40.6982, -74.0178] as [number, number],
    radius: 4000, // 4km in meters
    isActive: false,
    products: ['Product A', 'Product G'],
    capacity: 1200,
    currentLoad: 0
  }
];

const mockProducts = [
  'Product A',
  'Product B', 
  'Product C',
  'Product D',
  'Product E',
  'Product F',
  'Product G'
];

const mockVariants: ProductVariant[] = [
  {
    id: 'var-1',
    productId: '1',
    productName: 'Product A',
    title: 'Red - Size M',
    optionValueIds: ['red', 'size-m'],
    sku: 'PA-RED-M',
    price: 29.99,
    inventory: 15,
    enabled: true
  },
  {
    id: 'var-2',
    productId: '1',
    productName: 'Product A',
    title: 'Blue - Size L',
    optionValueIds: ['blue', 'size-l'],
    sku: 'PA-BLUE-L',
    price: 29.99,
    inventory: 8,
    enabled: true
  }
];

interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

const Coverage: React.FC = () => {
  const { toast } = useToast();
  const [searchAddress, setSearchAddress] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null);
  const [searchRadius, setSearchRadius] = useState([5000]);
  const [showFacilityRadii, setShowFacilityRadii] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedVariant, setSelectedVariant] = useState<string>('all');
  const [availableVariants, setAvailableVariants] = useState<ProductVariant[]>(mockVariants);
  const [visibleFacilities, setVisibleFacilities] = useState<Set<string>>(new Set(mockFacilities.map(f => f.id)));
  const [coverageResults, setCoverageResults] = useState<any[]>([]);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState('coverage');

  const handleAddressSearch = async () => {
    if (!searchAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter an address to search",
        variant: "destructive"
      });
      return;
    }

    try {
      // Simple geocoding using Nominatim (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`
      );
      const data: GeocodeResult[] = await response.json();

      if (data.length > 0) {
        const { lat, lng } = data[0];
        setSelectedPoint([lat, lng]);
        analyzeCoverage([lat, lng]);
        toast({
          title: "Location Found",
          description: `Address geocoded successfully`
        });
      } else {
        toast({
          title: "Address Not Found",
          description: "Could not find the specified address",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Geocoding Error",
        description: "Failed to geocode address",
        variant: "destructive"
      });
    }
  };

  const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
    const R = 6371000; // Earth radius in meters
    const lat1 = point1[0] * Math.PI / 180;
    const lat2 = point2[0] * Math.PI / 180;
    const deltaLat = (point2[0] - point1[0]) * Math.PI / 180;
    const deltaLng = (point2[1] - point1[1]) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const analyzeCoverage = (point: [number, number]) => {
    const results = mockFacilities.map(facility => {
      const distance = calculateDistance(point, facility.coordinates);
      const isInRange = distance <= facility.radius;
      const travelTime = Math.round(distance / 1000 * 3); // Approximate: 3 min per km

      return {
        facility,
        distance,
        isInRange,
        travelTime,
        hasProduct: selectedProduct === 'all' || selectedProduct === '' ? true : facility.products.includes(selectedProduct),
        hasVariant: selectedVariant === 'all' || selectedVariant === '' ? true : 
          availableVariants.find(v => v.id === selectedVariant && facility.products.includes(v.productName))
      };
    });

    setCoverageResults(results);
  };

  const runDeliverySimulation = async () => {
    if (!selectedPoint) {
      toast({
        title: "No Location Selected",
        description: "Please select a location first",
        variant: "destructive"
      });
      return;
    }

    setIsSimulating(true);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const results = coverageResults
        .filter(r => r.facility.isActive && r.isInRange && r.hasProduct && r.hasVariant)
        .sort((a, b) => a.distance - b.distance);

      if (results.length === 0) {
        let message = "No active facilities can deliver to this location";
        if (selectedVariant && selectedVariant !== 'all') {
          const variant = availableVariants.find(v => v.id === selectedVariant);
          message = `No active facilities can deliver variant "${variant?.title}" to this location`;
        } else if (selectedProduct && selectedProduct !== 'all') {
          message = `No active facilities can deliver "${selectedProduct}" to this location`;
        }
        setSimulationResults({
          success: false,
          message
        });
      } else {
        const nearestFacility = results[0];
        setSimulationResults({
          success: true,
          nearestFacility: nearestFacility.facility,
          distance: nearestFacility.distance,
          travelTime: nearestFacility.travelTime,
          eta: nearestFacility.travelTime + 10, // Add 10 min prep time
          alternativeFacilities: results.slice(1, 3),
          product: selectedProduct === 'all' ? '' : selectedProduct,
          variant: selectedVariant === 'all' ? '' : availableVariants.find(v => v.id === selectedVariant)?.title
        });
      }
    } catch (error) {
      toast({
        title: "Simulation Error",
        description: "Failed to run delivery simulation",
        variant: "destructive"
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const toggleFacilityVisibility = (facilityId: string) => {
    const newVisible = new Set(visibleFacilities);
    if (newVisible.has(facilityId)) {
      newVisible.delete(facilityId);
    } else {
      newVisible.add(facilityId);
    }
    setVisibleFacilities(newVisible);
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getFacilityIcon = (type: string) => {
    switch (type) {
      case 'warehouse': return Building;
      case 'distribution': return Truck;
      case 'store': return Building;
      case 'hub': return Building;
      default: return Building;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coverage Intelligence</h1>
          <p className="text-muted-foreground">
            Analyze delivery coverage and simulate customer orders
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Location Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address or Coordinates</Label>
                <div className="flex gap-2">
                  <Input
                    id="address"
                    placeholder="Enter address..."
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
                  />
                  <Button onClick={handleAddressSearch} size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Search Radius: {formatDistance(searchRadius[0])}</Label>
                <Slider
                  value={searchRadius}
                  onValueChange={setSearchRadius}
                  max={10000}
                  min={500}
                  step={500}
                  className="w-full"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-radii"
                  checked={showFacilityRadii}
                  onCheckedChange={setShowFacilityRadii}
                />
                <Label htmlFor="show-radii">Show Facility Radii</Label>
              </div>

              {selectedPoint && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="font-medium text-sm mb-1">Selected Location</div>
                  <div className="text-xs text-muted-foreground">
                    {Number(selectedPoint[0]).toFixed(6)}, {Number(selectedPoint[1]).toFixed(6)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Delivery Simulation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Product (Optional)</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any product</SelectItem>
                    {mockProducts.map(product => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Variant (Optional)</Label>
                <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any variant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any variant</SelectItem>
                    {availableVariants.map(variant => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.productName} - {variant.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={runDeliverySimulation}
                disabled={!selectedPoint || isSimulating}
                className="w-full"
              >
                {isSimulating ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>

              <div className="text-sm text-muted-foreground">
                Click on the map placeholder to select a location for simulation
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Facilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {mockFacilities.map(facility => {
                    const Icon = getFacilityIcon(facility.type);
                    return (
                      <div
                        key={facility.id}
                        className="flex items-center justify-between p-2 rounded-lg border"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <div>
                            <div className="font-medium text-sm">{facility.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {facility.type} • {formatDistance(facility.radius)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={facility.isActive ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {facility.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFacilityVisibility(facility.id)}
                          >
                            {visibleFacilities.has(facility.id) ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Map Placeholder */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="h-[600px] w-full bg-muted rounded-lg flex items-center justify-center relative">
                <div className="text-center">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Interactive Map</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Map will be loaded here with facility locations and coverage areas
                  </p>
                  <Button
                    onClick={() => setSelectedPoint([40.7128, -74.0060])}
                    variant="outline"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Select Demo Location
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="coverage">Coverage Analysis</TabsTrigger>
              <TabsTrigger value="simulation">Delivery Simulation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="coverage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Coverage Results
                  </CardTitle>
                  <CardDescription>
                    Analysis of facilities that can serve the selected location
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {coverageResults.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Select a location on the map to analyze coverage
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {coverageResults.map((result, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            result.isInRange && result.facility.isActive
                              ? "bg-green-50 border-green-200"
                              : "bg-gray-50 border-gray-200"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {result.isInRange && result.facility.isActive ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <div>
                              <div className="font-medium">{result.facility.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatDistance(result.distance)} • {result.travelTime} min
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={result.facility.isActive ? "default" : "secondary"}
                            >
                              {result.facility.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {selectedProduct && (
                              <Badge
                                variant={result.hasProduct ? "default" : "destructive"}
                              >
                                {result.hasProduct ? "In Stock" : "Out of Stock"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="simulation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Route className="h-5 w-5" />
                    Delivery Simulation Results
                  </CardTitle>
                  <CardDescription>
                    Find the best delivery option for the selected location
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!simulationResults ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Run a delivery simulation to see results
                    </div>
                  ) : simulationResults.success ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div className="font-semibold text-green-800">
                            Delivery Available
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm font-medium">Nearest Facility</div>
                              <div className="text-lg">{simulationResults.nearestFacility.name}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">Distance</div>
                              <div className="text-lg">{formatDistance(simulationResults.distance)}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">Travel Time</div>
                              <div className="text-lg">{simulationResults.travelTime} min</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">ETA</div>
                              <div className="text-lg">{simulationResults.eta} min</div>
                            </div>
                          </div>
                          {simulationResults.product && (
                            <div>
                              <div className="text-sm font-medium">Product</div>
                              <div>{simulationResults.product}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {simulationResults.alternativeFacilities.length > 0 && (
                        <div>
                          <div className="font-medium mb-2">Alternative Options</div>
                          <div className="space-y-2">
                            {simulationResults.alternativeFacilities.map((alt: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div>{alt.facility.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {formatDistance(alt.distance)} • {alt.travelTime} min
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <div className="font-semibold text-red-800">
                          No Delivery Available
                        </div>
                      </div>
                      <div className="text-red-700">{simulationResults.message}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Coverage;