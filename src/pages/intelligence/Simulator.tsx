import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
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
  Building,
  Truck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  Gauge
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Mock data for facilities
const mockFacilities = [
  {
    id: '1',
    name: 'Central Warehouse',
    type: 'warehouse',
    address: '123 Main St, Downtown',
    coordinates: [40.7128, -74.0060] as [number, number],
    radius: 5000,
    isActive: true,
    products: ['Product A', 'Product B', 'Product C'],
    capacity: 1000,
    currentLoad: 750,
    avgDeliveryTime: 25
  },
  {
    id: '2',
    name: 'North Distribution Center',
    type: 'distribution',
    address: '456 North Ave, Uptown',
    coordinates: [40.7580, -73.9855] as [number, number],
    radius: 3000,
    isActive: true,
    products: ['Product A', 'Product D', 'Product E'],
    capacity: 800,
    currentLoad: 600,
    avgDeliveryTime: 20
  },
  {
    id: '3',
    name: 'East Store',
    type: 'store',
    address: '789 East St, Eastside',
    coordinates: [40.7282, -73.9942] as [number, number],
    radius: 2000,
    isActive: true,
    products: ['Product B', 'Product C', 'Product F'],
    capacity: 500,
    currentLoad: 300,
    avgDeliveryTime: 15
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

const orderTypes = [
  'Standard Delivery',
  'Express Delivery',
  'Same Day Delivery',
  'Scheduled Delivery'
];

interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

const Simulator: React.FC = () => {
  const { toast } = useToast();
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [orderType, setOrderType] = useState('Standard Delivery');
  const [orderQuantity, setOrderQuantity] = useState([1]);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationHistory, setSimulationHistory] = useState<any[]>([]);

  const handleAddressSearch = async () => {
    if (!customerAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter a customer address",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customerAddress)}&limit=1`
      );
      const data: GeocodeResult[] = await response.json();

      if (data.length > 0) {
        const { lat, lng } = data[0];
        setSelectedPoint([lat, lng]);
        toast({
          title: "Location Found",
          description: `Customer address located successfully`
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
        description: "Failed to geocode customer address",
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

  const calculateDeliveryTime = (distance: number, orderType: string, facilityLoad: number): number => {
    const baseTime = Math.round(distance / 1000 * 3); // 3 min per km
    const loadFactor = facilityLoad > 80 ? 1.5 : 1.2; // Adjust for facility load
    
    let typeMultiplier = 1;
    switch (orderType) {
      case 'Express Delivery':
        typeMultiplier = 0.7;
        break;
      case 'Same Day Delivery':
        typeMultiplier = 1.2;
        break;
      case 'Scheduled Delivery':
        typeMultiplier = 1.5;
        break;
      default:
        typeMultiplier = 1;
    }

    return Math.round(baseTime * loadFactor * typeMultiplier);
  };

  const runDeliverySimulation = async () => {
    if (!selectedPoint) {
      toast({
        title: "No Location Selected",
        description: "Please enter and search for a customer address first",
        variant: "destructive"
      });
      return;
    }

    setIsSimulating(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const facilityResults = mockFacilities.map(facility => {
        const distance = calculateDistance(selectedPoint, facility.coordinates);
        const isInRange = distance <= facility.radius;
        const loadPercentage = (facility.currentLoad / facility.capacity) * 100;
        const deliveryTime = calculateDeliveryTime(distance, orderType, loadPercentage);
        const hasProduct = selectedProduct === 'all' || facility.products.includes(selectedProduct);

        return {
          facility,
          distance,
          isInRange,
          deliveryTime,
          hasProduct,
          loadPercentage,
          canFulfill: facility.isActive && isInRange && hasProduct
        };
      });

      const availableFacilities = facilityResults
        .filter(r => r.canFulfill)
        .sort((a, b) => a.deliveryTime - b.deliveryTime);

      const simulationResult = {
        timestamp: new Date().toISOString(),
        customerAddress,
        selectedPoint,
        orderType,
        product: selectedProduct === 'all' ? 'Any Product' : selectedProduct,
        quantity: orderQuantity[0],
        success: availableFacilities.length > 0,
        bestOption: availableFacilities[0] || null,
        alternatives: availableFacilities.slice(1, 3),
        allFacilities: facilityResults
      };

      setSimulationResults(simulationResult);
      setSimulationHistory(prev => [simulationResult, ...prev.slice(0, 4)]);

      if (availableFacilities.length === 0) {
        toast({
          title: "No Delivery Options",
          description: "No facilities can fulfill this order",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Simulation Complete",
          description: `Found ${availableFacilities.length} delivery option(s)`
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
      default: return Building;
    }
  };

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case 'Express Delivery': return 'destructive';
      case 'Same Day Delivery': return 'default';
      case 'Scheduled Delivery': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Simulator</h1>
          <p className="text-muted-foreground">
            Simulate customer orders and find optimal delivery routes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Configuration */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer-address">Customer Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="customer-address"
                    placeholder="Enter customer address..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
                  />
                  <Button onClick={handleAddressSearch} size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Product</SelectItem>
                    {mockProducts.map(product => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Order Type</Label>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select order type" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity: {orderQuantity[0]}</Label>
                <Slider
                  value={orderQuantity}
                  onValueChange={setOrderQuantity}
                  max={50}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              {selectedPoint && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="font-medium text-sm mb-1">Customer Location</div>
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
                <Zap className="h-5 w-5" />
                Simulation Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={runDeliverySimulation}
                disabled={!selectedPoint || isSimulating}
                className="w-full"
                size="lg"
              >
                {isSimulating ? (
                  <>
                    <Gauge className="h-4 w-4 mr-2 animate-spin" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4 mr-2" />
                    Run Delivery Simulation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Simulation Results */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Simulation Results
              </CardTitle>
              <CardDescription>
                Best delivery option for the current order
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!simulationResults ? (
                <div className="text-center py-12">
                  <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Simulate</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure your order and run a simulation to see delivery options
                  </p>
                </div>
              ) : simulationResults.success ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">Delivery Available</span>
                    <Badge variant={getOrderTypeColor(orderType)}>{orderType}</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">Best Option</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Facility:</span>
                          <span className="text-sm">{simulationResults.bestOption.facility.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Distance:</span>
                          <span className="text-sm">{formatDistance(simulationResults.bestOption.distance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">ETA:</span>
                          <span className="text-sm">{simulationResults.bestOption.deliveryTime} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Load:</span>
                          <span className="text-sm">{simulationResults.bestOption.loadPercentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">Order Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Product:</span>
                          <span className="text-sm">{simulationResults.product}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Quantity:</span>
                          <span className="text-sm">{simulationResults.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Type:</span>
                          <span className="text-sm">{simulationResults.orderType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Address:</span>
                          <span className="text-sm truncate">{simulationResults.customerAddress}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {simulationResults.alternatives.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Alternative Options</h4>
                      <div className="space-y-2">
                        {simulationResults.alternatives.map((alt: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{index + 2}</Badge>
                              <span>{alt.facility.name}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatDistance(alt.distance)}</span>
                              <span>{alt.deliveryTime} min</span>
                              <span>{alt.loadPercentage.toFixed(1)}% load</span>
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
                    <span className="font-semibold text-red-800">No Delivery Available</span>
                  </div>
                  <p className="text-red-700 text-sm">
                    No facilities can fulfill this order. Try adjusting the product selection or order type.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Simulation History */}
          {simulationHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Simulations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {simulationHistory.map((sim, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {sim.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <div>
                            <div className="font-medium text-sm">{sim.product}</div>
                            <div className="text-xs text-muted-foreground">
                              {sim.orderType} • Qty: {sim.quantity}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(sim.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Simulator;