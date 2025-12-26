import React from 'react';
import { useProductStore, useVariantMatrix } from '@/store/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Package, Plus, Edit3, Trash2 } from 'lucide-react';

interface VariantManagerProps {
  productId: string;
}

export function VariantManager({ productId }: VariantManagerProps) {
  const { 
    variants, 
    options, 
    loading, 
    updateVariant, 
    toggleVariantEnabled, 
    deleteVariant,
    bulkUpdateVariants,
    bulkUpdateInventory
  } = useProductStore();
  
  const { toast } = useToast();
  const variantMatrix = useVariantMatrix(variants, options);

  const handleVariantUpdate = async (variantId: string, field: keyof typeof variants[0], value: any) => {
    try {
      await updateVariant(productId, variantId, { [field]: value });
      toast({
        title: "Variant Updated",
        description: "Variant has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update variant.",
        variant: "destructive",
      });
    }
  };

  const handleToggleEnabled = async (variantId: string) => {
    try {
      await toggleVariantEnabled(productId, variantId);
      toast({
        title: "Variant Updated",
        description: "Variant status has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update variant status.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (variantId: string) => {
    try {
      await deleteVariant(productId, variantId);
      toast({
        title: "Variant Deleted",
        description: "Variant has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete variant.",
        variant: "destructive",
      });
    }
  };

  const handleBulkInventoryUpdate = async (updates: Array<{ variantId: string; inventory: number }>) => {
    try {
      await bulkUpdateInventory(updates);
      toast({
        title: "Inventory Updated",
        description: `${updates.length} variants have been updated.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update inventory.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Variant Manager
          <Badge variant="outline">{variants.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {variants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No variants found</p>
            <Button className="mt-4" onClick={() => {}}>
              <Plus className="mr-2 h-4 w-4" />
              Create Variant
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Variant Matrix Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead>Option Combination</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Inventory</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variantMatrix.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.title}</div>
                        {row.impactType && (
                          <Badge 
                            variant={row.impactType === 'NEW' ? 'default' : 'destructive'}
                            className="text-xs mt-1"
                          >
                            {row.impactType}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{row.optionCombination}</div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.sku}
                          onChange={(e) => handleVariantUpdate(row.id, 'sku', e.target.value)}
                          className="w-32"
                          placeholder="SKU"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.price}
                            onChange={(e) => handleVariantUpdate(row.id, 'price', parseFloat(e.target.value))}
                            className="w-20"
                            placeholder="0.00"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.inventory}
                          onChange={(e) => handleVariantUpdate(row.id, 'inventory', parseInt(e.target.value))}
                          className="w-20"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={row.enabled}
                          onCheckedChange={() => handleToggleEnabled(row.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {}}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(row.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const updates = variants.map(v => ({
                    variantId: v.id,
                    inventory: (v.inventory || 0) + 10
                  }));
                  handleBulkInventoryUpdate(updates);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Bulk Add Inventory (+10)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const updates = variants.map(v => ({
                    variantId: v.id,
                    updates: { enabled: true }
                  }));
                  bulkUpdateVariants(updates);
                }}
              >
                Enable All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const updates = variants.map(v => ({
                    variantId: v.id,
                    updates: { enabled: false }
                  }));
                  bulkUpdateVariants(updates);
                }}
              >
                Disable All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}