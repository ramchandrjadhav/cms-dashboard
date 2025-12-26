import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Search, Building, Store, Warehouse, Filter, Eye } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Facility {
  id: string;
  name: string;
  type: 'store' | 'warehouse' | 'fulfillment' | 'distribution';
  location: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  radius: number;
  status: 'active' | 'inactive' | 'maintenance';
  manager?: string;
  productCount?: number;
}

const mockFacilities: Facility[] = [
  {
    id: '1',
    name: 'Downtown Store',
    type: 'store',
    location: 'New York, NY',
    address: '123 Broadway, New York, NY 10001',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    radius: 5,
    status: 'active',
    manager: 'John Smith',
    productCount: 456
  },
  {
    id: '2',
    name: 'Central Warehouse',
    type: 'warehouse',
    location: 'Newark, NJ',
    address: '456 Industrial Ave, Newark, NJ 07102',
    coordinates: { lat: 40.7357, lng: -74.1724 },
    radius: 50,
    status: 'active',
    manager: 'Sarah Johnson',
    productCount: 1234
  },
  {
    id: '3',
    name: 'Fulfillment Center Alpha',
    type: 'fulfillment',
    location: 'Edison, NJ',
    address: '789 Logistics Blvd, Edison, NJ 08817',
    coordinates: { lat: 40.5187, lng: -74.4120 },
    radius: 25,
    status: 'active',
    manager: 'Mike Davis',
    productCount: 2150
  },
  {
    id: '4',
    name: 'Brooklyn Store',
    type: 'store',
    location: 'Brooklyn, NY',
    address: '321 Atlantic Ave, Brooklyn, NY 11201',
    coordinates: { lat: 40.6892, lng: -73.9442 },
    radius: 8,
    status: 'maintenance',
    manager: 'Lisa Chen',
    productCount: 298
  }
];

export default function FacilityMap() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [facilities] = useState<Facility[]>(mockFacilities);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(true);

  const filteredFacilities = facilities.filter(facility => {
    const matchesSearch = facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        facility.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || facility.status === statusFilter;
    const matchesType = typeFilter === 'all' || facility.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getFacilityColor = (facility: Facility) => {
    if (facility.status === 'inactive') return '#ef4444';
    if (facility.status === 'maintenance') return '#f59e0b';
    
    switch (facility.type) {
      case 'store': return '#10b981';
      case 'warehouse': return '#3b82f6';
      case 'fulfillment': return '#8b5cf6';
      case 'distribution': return '#f97316';
      default: return '#6b7280';
    }
  };

  const getFacilityIcon = (type: string) => {
    switch (type) {
      case 'store': return <Store className="h-4 w-4" />;
      case 'warehouse': return <Warehouse className="h-4 w-4" />;
      case 'fulfillment': return <Building className="h-4 w-4" />;
      case 'distribution': return <Building className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-74.0060, 40.7128],
        zoom: 10,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add markers for each facility
      filteredFacilities.forEach(facility => {
        const color = getFacilityColor(facility);
        
        // Create marker
        const marker = new mapboxgl.Marker({
          color: color,
          scale: 1.2,
        })
          .setLngLat([facility.coordinates.lng, facility.coordinates.lat])
          .addTo(map.current!);

        // Add click event to marker
        marker.getElement().addEventListener('click', () => {
          setSelectedFacility(facility);
        });
      });

      // Add delivery radius circles
      map.current.on('load', () => {
        filteredFacilities.forEach(facility => {
          const color = getFacilityColor(facility);
          
          map.current!.addSource(`radius-${facility.id}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [facility.coordinates.lng, facility.coordinates.lat],
              },
              properties: {}
            }
          });

          map.current!.addLayer({
            id: `radius-${facility.id}`,
            type: 'circle',
            source: `radius-${facility.id}`,
            paint: {
              'circle-radius': {
                stops: [
                  [0, 0],
                  [20, facility.radius * 1000 * 0.075]
                ],
                base: 2
              },
              'circle-color': color,
              'circle-opacity': 0.1,
              'circle-stroke-color': color,
              'circle-stroke-width': 2,
              'circle-stroke-opacity': 0.6
            }
          });
        });
      });

    } catch (error) {
      console.error('Mapbox initialization error:', error);
    }

    return () => {
      map.current?.remove();
    };
  }, [filteredFacilities, mapboxToken]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Facility Map"
        description="View all facilities on an interactive map"
        actions={
          <Button onClick={() => navigate('/facilities/new')}>
            <Building className="mr-2 h-4 w-4" />
            Add Facility
          </Button>
        }
      />

      {/* Mapbox Token Input */}
      {showTokenInput && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-700">
                <Building className="h-4 w-4" />
                <span className="text-sm font-medium">Mapbox Configuration Required</span>
              </div>
              <p className="text-sm text-blue-600">
                To view the facility map, please enter your Mapbox public token. 
                You can get one from <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="underline">mapbox.com</a>
              </p>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter your Mapbox public token"
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                  className="max-w-md"
                />
                <Button
                  onClick={() => setShowTokenInput(false)}
                  disabled={!mapboxToken}
                >
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filters */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search facilities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="store">Store</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="fulfillment">Fulfillment</SelectItem>
                    <SelectItem value="distribution">Distribution</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Legend</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm">Store</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Warehouse</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-sm">Fulfillment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm">Distribution</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Facility */}
          {selectedFacility && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getFacilityIcon(selectedFacility.type)}
                  {selectedFacility.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Address</div>
                  <div className="text-sm">{selectedFacility.address}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Type</div>
                  <Badge variant="outline" className="capitalize">{selectedFacility.type}</Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant={selectedFacility.status === 'active' ? 'default' : 'secondary'}>
                    {selectedFacility.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Manager</div>
                  <div className="text-sm">{selectedFacility.manager}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Products</div>
                  <div className="text-sm">{selectedFacility.productCount}</div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => navigate(`/facilities/${selectedFacility.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              {mapboxToken ? (
                <div ref={mapContainer} className="w-full h-96 rounded-lg" />
              ) : (
                <div className="w-full h-96 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center">
                    <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Enter Mapbox token to view map</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}