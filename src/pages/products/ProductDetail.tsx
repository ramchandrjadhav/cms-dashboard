import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  Package,
  Settings,
  Image as ImageIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { ApiService } from "@/services/api";
import { Product } from "@/types";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, hasRole, hasGroup } = useAuth();

  // Permission function for editing products
  const canEditProduct = () => {
    if (!user) return false;
    return (
      hasRole("master") ||
      hasGroup("CATALOG_EDITOR") ||
      hasGroup("CATALOG_ADMIN")
    );
  };

  const [product, setProduct] = useState<Product | null>(null);
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        if (id) {
          const data = await ApiService.getProduct(id);
          setProduct(data);
          setEditedProduct(data);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch product details.",
          variant: "destructive",
        });
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id, toast]);

  useEffect(() => {
    if (product && editedProduct) {
      setHasUnsavedChanges(
        JSON.stringify(product) !== JSON.stringify(editedProduct)
      );
    }
  }, [product, editedProduct]);

  const InfoField = ({
    label,
    value,
  }: {
    label: string;
    value: string | number;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="text-sm text-muted-foreground">{value}</div>
    </div>
  );

  if (loading || !editedProduct) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="text-muted-foreground">
          Loading product details...
        </span>
      </div>
    );
  }
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={editedProduct.name}
        description={`Product ID: ${editedProduct.id} • Brand: ${
          editedProduct.brand?.name || "—"
        }`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/products/list")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
            {canEditProduct() && (
              <Button onClick={() => navigate(`/products/${id}/edit`)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Product
              </Button>
            )}
          </div>
        }
      />

      {hasUnsavedChanges && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-warning-foreground">
              <Package className="h-4 w-4" />
              <span className="text-sm font-medium">
                You have unsaved changes
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Accordion
            type="multiple"
            defaultValue={["general", "images", "variants", "linked-variants"]}
            className="space-y-4"
          >
            <AccordionItem value="general">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    <span className="font-semibold">General Information</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <div className="grid gap-4 md:grid-cols-2">
                      <InfoField
                        label="Product Name"
                        value={editedProduct.name}
                      />
                      <InfoField
                        label="Category"
                        value={editedProduct.category?.name || "—"}
                      />
                      <InfoField
                        label="Brand"
                        value={editedProduct.brand?.name || "—"}
                      />
                    </div>
                    <div className="mt-4 space-y-2">
                      <Label className="text-sm font-medium">Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {editedProduct.tags && editedProduct.tags.length > 0 ? (
                          editedProduct.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="px-3 py-1"
                            >
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No tags
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label className="text-sm font-medium">Description</Label>
                      <div className="text-sm text-muted-foreground mt-2">
                        {editedProduct?.description ?? "No description"}
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            <AccordionItem value="images">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    <span className="font-semibold">Product Images</span>
                    <Badge variant="outline">
                      {editedProduct.product_images?.length || 0}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    {!editedProduct.product_images ||
                    editedProduct.product_images.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ImageIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p className="text-sm">No images uploaded</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {editedProduct.product_images.map((img, index) => (
                          <div
                            key={img.image}
                            className="relative group border rounded-lg overflow-hidden"
                          >
                            <img
                              src={img.image}
                              alt={`Product image ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            {img.is_primary && (
                              <Badge className="absolute top-2 left-2 z-10 bg-green-600 text-white">
                                Primary
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            <AccordionItem value="variants">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <span className="font-semibold">Product Variants</span>
                    <Badge variant="outline">
                      {editedProduct.variants?.length || 0}
                    </Badge>
                    <Badge variant="secondary">
                      {editedProduct.variants?.filter((v) => v.is_active)
                        .length || 0}{" "}
                      variants enabled
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    {!editedProduct.variants ||
                    editedProduct.variants.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p className="text-sm">No variants created yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">Enabled</TableHead>
                                <TableHead>Variant</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Net Qty</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {editedProduct.variants.map((variant) => (
                                <React.Fragment key={variant.id}>
                                  <TableRow
                                    key={variant.id}
                                    className={cn(
                                      "hover:bg-muted/50 cursor-pointer",
                                      !variant.is_active && "opacity-50"
                                    )}
                                  >
                                    <TableCell
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Switch
                                        disabled
                                        checked={variant.is_active}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div className="font-medium">
                                        {variant.name}
                                      </div>
                                    </TableCell>
                                    <TableCell
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Input
                                        disabled
                                        value={variant.sku || ""}
                                        placeholder="Enter SKU"
                                        className="w-32"
                                      />
                                    </TableCell>
                                    <TableCell
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground">
                                          ₹
                                        </span>
                                        <Input
                                          disabled
                                          type="number"
                                          step="0.01"
                                          value={variant.price || ""}
                                          placeholder="Price"
                                          className="w-24"
                                        />
                                      </div>
                                    </TableCell>
                                    <TableCell
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center gap-1">
                                        <Input
                                          disabled
                                          value={variant.net_qty || ""}
                                          placeholder="Net Qty"
                                          className="w-24"
                                        />
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                </React.Fragment>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {editedProduct.linked_variants &&
              editedProduct.linked_variants.length > 0 && (
                <AccordionItem value="linked-variants">
                  <Card>
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        <span className="font-semibold">Linked Variants</span>
                        <Badge variant="outline">
                          {editedProduct.linked_variants.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product Name</TableHead>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>Price</TableHead>
                                  <TableHead>MRP</TableHead>
                                  <TableHead>EAN Number</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {editedProduct.linked_variants.map(
                                  (linkedVariant) => (
                                    <TableRow key={linkedVariant.id}>
                                      <TableCell>
                                        <div className="font-medium">
                                          {linkedVariant.linked_variant.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          ID: {linkedVariant.linked_variant.id}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        {linkedVariant.linked_variant.sku ||
                                          "—"}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-muted-foreground">
                                            ₹
                                          </span>
                                          <span className="font-medium">
                                            {linkedVariant.linked_variant
                                              .price || "0"}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-muted-foreground">
                                            ₹
                                          </span>
                                          <span className="font-medium">
                                            {linkedVariant.linked_variant.mrp ||
                                              "0"}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        {linkedVariant.linked_variant
                                          .ean_number || "—"}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={
                                            linkedVariant.linked_variant
                                              .is_active
                                              ? "default"
                                              : "secondary"
                                          }
                                        >
                                          {linkedVariant.linked_variant
                                            .is_active
                                            ? "Active"
                                            : "Inactive"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  )
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </CardContent>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              )}
          </Accordion>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Published</span>
                  <Badge
                    variant={
                      editedProduct.is_published ? "success" : "secondary"
                    }
                  >
                    {editedProduct.is_published ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Visible</span>
                  <Badge
                    variant={editedProduct.is_visible ? "success" : "secondary"}
                  >
                    {editedProduct.is_visible ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {editedProduct.collections && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Collections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {editedProduct.collections.length > 0 ? (
                    editedProduct.collections.map((col: any) => (
                      <Badge key={col.id} variant="outline">
                        {col.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      No collections
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
