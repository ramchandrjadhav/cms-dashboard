import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiService } from "@/services/api";
import { Loader2 } from "lucide-react";

interface SizeChart {
  id: number;
  category: {
    id: number;
    name: string;
  };
  attribute: {
    id: number;
    name: string;
    attribute_type: string;
    values: Array<{
      id: number;
      attribute: number;
      value: string;
      is_active: boolean;
      rank: number;
    }>;
  };
  name: string;
  description: string;
  is_active: boolean;
  measurements: Array<{
    id: number;
    name: string;
    unit: string;
    is_required: boolean;
    is_active: boolean;
    rank: number;
  }>;
  measurements_count: number;
}

interface SizeChartTableProps {
  categoryId: number;
  variantId?: string;
  onDataChange?: (data: Record<string, Record<string, string>>) => void;
  initialData?: Record<string, Record<string, string>>;
  existingSizeChartValues?: Array<{
    size_id?: number;
    size: string;
    measurements: Record<string, string>;
  }>;
}

export const SizeChartTable: React.FC<SizeChartTableProps> = ({
  categoryId,
  variantId,
  onDataChange,
  initialData = {},
  existingSizeChartValues = []
}) => {
  const [sizeChart, setSizeChart] = useState<SizeChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sizeChartData, setSizeChartData] = useState<Record<string, Record<string, string>>>(() => {
    console.log("SizeChartTable - existingSizeChartValues:", existingSizeChartValues);
    console.log("SizeChartTable - initialData:", initialData);
    
    // Prioritize initialData (form data) over existingSizeChartValues (API data)
    // This ensures that when switching variants, we use the form data that was properly loaded
    if (initialData && Object.keys(initialData).length > 0) {
      console.log("SizeChartTable - using initialData (form data):", initialData);
      return initialData;
    }
    
    // Fallback to existingSizeChartValues if no initialData
    if (existingSizeChartValues && existingSizeChartValues.length > 0) {
      const existingData: Record<string, Record<string, string>> = {};
      existingSizeChartValues.forEach((item) => {
        if (item.size && item.measurements) {
          existingData[item.size] = item.measurements;
        }
      });
      console.log("SizeChartTable - converted existing data:", existingData);
      return existingData;
    }
    
    console.log("SizeChartTable - using empty object");
    return {};
  });

  // Fetch size charts for the category
  useEffect(() => {
    const fetchSizeCharts = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("SizeChartTable - Fetching size charts for category:", categoryId);
        const response = await ApiService.getSizeChartsByCategory(categoryId);
        console.log("SizeChartTable - Size charts API response:", response);
        if (response.results.length > 0) {
          console.log("SizeChartTable - Found size chart:", response.results[0]);
          setSizeChart(response.results[0]); // Use the first size chart
        } else {
          console.log("SizeChartTable - No size charts found for category:", categoryId);
        }
      } catch (err) {
        console.error("SizeChartTable - Error fetching size charts:", err);
        setError("Failed to load size charts");
      } finally {
        setLoading(false);
      }
    };

    if (categoryId && categoryId > 0) {
      console.log("SizeChartTable - Category ID is valid, fetching size charts:", categoryId);
      fetchSizeCharts();
    } else {
      console.log("SizeChartTable - Category ID is invalid or missing:", categoryId);
      setLoading(false);
    }
  }, [categoryId]);

  // Update size chart data when existing values change (e.g., when switching variants)
  // Only run this if we don't have a size chart loaded yet
  useEffect(() => {
    // Prioritize initialData (form data) over existingSizeChartValues (API data)
    if (!sizeChart && initialData && Object.keys(initialData).length > 0) {
      console.log("SizeChartTable useEffect - using initialData (form data):", initialData);
      setSizeChartData(initialData);
    } else if (!sizeChart && existingSizeChartValues && existingSizeChartValues.length > 0) {
      const existingData: Record<string, Record<string, string>> = {};
      existingSizeChartValues.forEach((item) => {
        if (item.size && item.measurements) {
          existingData[item.size] = item.measurements;
        }
      });
      console.log("SizeChartTable useEffect - using existingSizeChartValues:", existingData);
      setSizeChartData(existingData);
    }
  }, [existingSizeChartValues, initialData, sizeChart]);

  // When size chart is loaded, merge existing data with the complete structure
  useEffect(() => {
    if (sizeChart && sizeChart.attribute && sizeChart.attribute.values && sizeChart.measurements) {
      const allSizes = sizeChart.attribute.values.filter(v => v.is_active).map(v => v.value);
      const allMeasurements = sizeChart.measurements.filter(m => m.is_active);
      
      // Create a mapping from measurement names to IDs
      const measurementNameToId: Record<string, string> = {};
      allMeasurements.forEach(measurement => {
        measurementNameToId[measurement.name] = measurement.id.toString();
      });
      
      // Create a complete structure with all sizes and measurements
      const completeStructure: Record<string, Record<string, string>> = {};
      
      allSizes.forEach(size => {
        completeStructure[size] = {};
        allMeasurements.forEach(measurement => {
          // Check if we have existing data for this size and measurement
          let existingValue = "";
          
          if (sizeChartData[size]) {
            // Try by measurement ID first
            existingValue = sizeChartData[size][measurement.id.toString()] || "";
            
            // If not found by ID, try by measurement name
            if (!existingValue) {
              existingValue = sizeChartData[size][measurement.name] || "";
            }
          }
          
          completeStructure[size][measurement.id.toString()] = existingValue;
        });
      });
      
      console.log("SizeChartTable - Merging existing data with complete structure:");
      console.log("Existing sizeChartData:", sizeChartData);
      console.log("Measurement name to ID mapping:", measurementNameToId);
      console.log("Complete structure:", completeStructure);
      
      // Log detailed structure for M size
      if (completeStructure.M) {
        console.log("M size structure:", completeStructure.M);
      }
      if (completeStructure.L) {
        console.log("L size structure:", completeStructure.L);
      }
      
      // Only update if we have a complete structure and it's different from current data
      if (Object.keys(completeStructure).length > 0) {
        console.log("SizeChartTable - Setting new sizeChartData:", completeStructure);
        setSizeChartData(completeStructure);
        
        // Convert the data to the correct format for the API
        // Convert measurement IDs back to measurement names
        const convertedData: Record<string, Record<string, string>> = {};
        
        Object.entries(completeStructure).forEach(([size, sizeMeasurements]) => {
          convertedData[size] = {};
          if (sizeMeasurements) {
            Object.entries(sizeMeasurements).forEach(([measurementKey, measurementValue]) => {
              // Find the measurement name for this ID
              const measurement = allMeasurements.find(m => m.id.toString() === measurementKey);
              if (measurement) {
                convertedData[size][measurement.name] = measurementValue;
              } else {
                // If we can't find the measurement, keep the original key
                convertedData[size][measurementKey] = measurementValue;
              }
            });
          }
        });
        
        onDataChange?.(convertedData);
      }
    }
  }, [sizeChart]);

  // Get attribute values (sizes) from the size chart
  const attributeValues = sizeChart?.attribute?.values?.filter(value => value.is_active) || [];
  const measurements = sizeChart?.measurements?.filter(measurement => measurement.is_active) || [];

  // Update measurement value
  const updateMeasurement = (sizeName: string, measurementId: number | string, value: string) => {
    console.log("updateMeasurement called with:", { sizeName, measurementId, value });
    console.log("Current measurements array:", measurements);
    
    const newData = {
      ...sizeChartData,
      [sizeName]: {
        ...sizeChartData[sizeName],
        [measurementId.toString()]: value
      }
    };
    setSizeChartData(newData);
    
    // Convert the data to the correct format for the API
    // Convert measurement IDs back to measurement names
    const convertedData: Record<string, Record<string, string>> = {};
    
    Object.entries(newData).forEach(([size, sizeMeasurements]) => {
      convertedData[size] = {};
      if (sizeMeasurements) {
        Object.entries(sizeMeasurements).forEach(([measurementKey, measurementValue]) => {
          // Find the measurement name for this ID
          const measurement = measurements.find(m => m.id.toString() === measurementKey);
          if (measurement) {
            convertedData[size][measurement.name] = measurementValue;
          } else {
            // If we can't find the measurement, keep the original key
            convertedData[size][measurementKey] = measurementValue;
          }
        });
      }
    });
    
    console.log("updateMeasurement - convertedData:", convertedData);
    onDataChange?.(convertedData);
  };

  // Sort measurements by rank
  const sortedMeasurements = [...measurements].sort((a, b) => a.rank - b.rank);
  
  // Sort attribute values by rank
  const sortedAttributeValues = [...attributeValues].sort((a, b) => a.rank - b.rank);
  
  // Get all sizes from attribute values only
  const allSizes = sortedAttributeValues.map(v => v.value);
  
  // Debug: Log current sizeChartData state
  console.log("SizeChartTable - Current sizeChartData state:", sizeChartData);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading size measurements...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-red-500 mb-2">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sizeChart || measurements.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-gray-500 mb-2">No size charts available for this category</p>
            <p className="text-sm text-gray-400">Please configure size charts for this category first</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Size Chart</CardTitle>
      </CardHeader>
      <CardContent>
        {allSizes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No sizes available for this size chart.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40 font-medium">Measurement</TableHead>
                  {allSizes.map((sizeName) => (
                    <TableHead key={sizeName} className="min-w-24 text-center font-medium">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="secondary">{sizeName}</Badge>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMeasurements.map((measurement) => (
                  <TableRow key={measurement.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span>{measurement.name}</span>
                          {measurement.is_required && (
                            <Badge variant="destructive" className="text-xs px-1 py-0">
                              Required
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">({measurement.unit})</span>
                      </div>
                    </TableCell>
                    {allSizes.map((sizeName) => (
                      <TableCell key={sizeName} className="text-center">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={sizeChartData[sizeName]?.[measurement.id.toString()] || ""}
                          onChange={(e) => updateMeasurement(sizeName, measurement.id, e.target.value)}
                          className={`w-full text-center ${
                            measurement.is_required && !sizeChartData[sizeName]?.[measurement.id.toString()] 
                              ? "border-red-300 focus:border-red-500" 
                              : ""
                          }`}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {allSizes.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Fields marked as "Required" must be filled for each size.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SizeChartTable;
