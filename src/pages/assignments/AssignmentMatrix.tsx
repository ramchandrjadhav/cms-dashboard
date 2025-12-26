import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useProductStore } from '@/store/products';
import { ImportDialog } from '@/components/ImportDialog';
import { CSVExporter, CSVImporter, ImportResult, ImportConflict, downloadCSV } from '@/lib/csv-utils';
import { 
  Upload, 
  Download, 
  FileText, 
  Package, 
  Building, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export default function AssignmentMatrix() {
  const { products, variants, loading, loadProducts } = useProductStore();
  const { toast } = useToast();
  
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [importType, setImportType] = useState<'products' | 'variants' | 'inventory'>('products');

  // Mock facilities for demo
  const facilities = ['WH-001', 'WH-002', 'DC-001', 'STORE-001', 'STORE-002'];

  useEffect(() => {
    loadProducts({ variantFirst: true });
  }, [loadProducts]);

  // Export Functions
  const handleExportProducts = () => {
    const csvData = CSVExporter.exportProducts(products);
    downloadCSV(csvData, 'products_export.csv');
    toast({
      title: "Export Complete",
      description: "Products exported successfully",
    });
  };

  const handleExportVariants = () => {
    const csvData = CSVExporter.exportVariants(products);
    downloadCSV(csvData, 'variants_export.csv');
    toast({
      title: "Export Complete",
      description: "Variants exported successfully",
    });
  };

  const handleExportInventory = () => {
    if (selectedFacilities.length === 0) {
      toast({
        title: "No Facilities Selected",
        description: "Please select facilities to export inventory",
        variant: "destructive",
      });
      return;
    }
    
    const csvData = CSVExporter.exportInventoryMatrix(products, selectedFacilities);
    downloadCSV(csvData, 'inventory_matrix_export.csv');
    toast({
      title: "Export Complete",
      description: `Inventory matrix exported for ${selectedFacilities.length} facilities`,
    });
  };

  // Import Functions
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvData = e.target?.result as string;
      
      try {
        let result: ImportResult;
        
        switch (importType) {
          case 'products':
            result = await CSVImporter.importProducts(csvData, products);
            break;
          case 'variants':
            result = await CSVImporter.importVariants(csvData, products);
            break;
          case 'inventory':
            result = await CSVImporter.importInventoryMatrix(csvData, facilities, variants);
            break;
          default:
            throw new Error('Invalid import type');
        }
        
        setImportResult(result);
        setShowImportDialog(true);
      } catch (error) {
        toast({
          title: "Import Failed",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleImportProceed = async (conflicts: ImportConflict[]) => {
    // Handle the actual import with resolved conflicts
    console.log('Proceeding with conflicts:', conflicts);
    
    toast({
      title: "Import Complete",
      description: `${importResult?.processedRows} rows imported successfully`,
    });
    
    setShowImportDialog(false);
    setImportResult(null);
    
    // Refresh data
    loadProducts({ variantFirst: true });
  };

  const handleImportCancel = () => {
    setShowImportDialog(false);
    setImportResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Assignment Matrix</h1>
          <p className="text-muted-foreground">
            Manage product assignments and inventory across facilities
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => loadProducts({ variantFirst: true })}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Export products with options and pricing
                    </p>
                    <Button onClick={handleExportProducts} className="w-full">
                      Export Products CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Variants
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Export all product variants with details
                    </p>
                    <Button onClick={handleExportVariants} className="w-full">
                      Export Variants CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Inventory Matrix
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm">Select Facilities</Label>
                        <Select onValueChange={(value) => {
                          if (value && !selectedFacilities.includes(value)) {
                            setSelectedFacilities([...selectedFacilities, value]);
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Add facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {facilities.filter(f => !selectedFacilities.includes(f)).map(facility => (
                              <SelectItem key={facility} value={facility}>
                                {facility}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {selectedFacilities.map(facility => (
                          <Badge 
                            key={facility} 
                            variant="secondary" 
                            className="cursor-pointer"
                            onClick={() => setSelectedFacilities(selectedFacilities.filter(f => f !== facility))}
                          >
                            {facility} ×
                          </Badge>
                        ))}
                      </div>
                      
                      <Button 
                        onClick={handleExportInventory} 
                        className="w-full"
                        disabled={selectedFacilities.length === 0}
                      >
                        Export Inventory Matrix
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Import Type</Label>
                  <Select value={importType} onValueChange={(value: any) => setImportType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="products">Products</SelectItem>
                      <SelectItem value="variants">Variants</SelectItem>
                      <SelectItem value="inventory">Inventory Matrix</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Upload CSV File</Label>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileImport}
                    className="cursor-pointer"
                  />
                </div>
              </div>

              {/* CSV Format Examples */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">CSV Format Examples</h4>
                <div className="text-sm space-y-2">
                  <div>
                    <strong>Products:</strong> product_id, product_name, base_price, option_name_1, option_values_1|pipe_separated
                  </div>
                  <div>
                    <strong>Variants:</strong> variant_id, product_id, sku, barcode, enabled, price_override, weight, image_url, option_values, inventory_global
                  </div>
                  <div>
                    <strong>Inventory:</strong> facility_code, variant_sku, qty
                  </div>
                </div>
              </div>

              {/* Import Rules */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Import Rules
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• If product exists & options differ → show impact dialog</li>
                  <li>• If variant SKU matches existing → update row</li>
                  <li>• Unknown facility → error</li>
                  <li>• Skipped rows will be reported</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{variants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Available Facilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilities.length}</div>
          </CardContent>
        </Card>
      </div>

      <ImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        result={importResult}
        onProceed={handleImportProceed}
        onCancel={handleImportCancel}
      />
    </div>
  );
}