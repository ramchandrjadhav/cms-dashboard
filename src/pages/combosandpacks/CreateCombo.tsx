import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Plus,
  Package,
  GripVertical,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/api";
import { ProductVariantPicker } from "@/components/ProductVariantPicker";
import type { ProductVariant } from "@/types";

interface ComboItem {
  product_variant: number;
  quantity: number;
  base_price?: number;
  mrp?: number;
  selling_price?: number;
  variant_name?: string;
  variant_sku?: string;
  product_id?: number;
}

interface Combo {
  name: string;
  description: string;
  combo_items: ComboItem[];
  is_active: boolean;
  base_price?: number;
  mrp?: number;
  selling_price?: number;
}

export default function CreateCombo() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [combo, setCombo] = useState<Combo>({
    name: "",
    description: "",
    combo_items: [],
    is_active: true,
    base_price: 0,
    mrp: 0,
    selling_price: 0,
  });

  const [showVariantPicker, setShowVariantPicker] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstProductId, setFirstProductId] = useState<number | null>(null);

  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [combo]);

  const handleSave = async () => {
    if (!combo.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Combo name is required.",
        variant: "destructive",
      });
      return;
    }

    if (combo.combo_items.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one product variant is required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let productIdToSend: number | undefined =
        firstProductId ?? combo.combo_items[0]?.product_id;
      // If product_id is still missing, fetch it from the first variant
      if (!productIdToSend && combo.combo_items[0]?.product_variant) {
        try {
          const firstVariantId = String(combo.combo_items[0].product_variant);
          const firstVariant = await ApiService.getProductVariant(
            firstVariantId
          );
          const extractedProductId =
            (firstVariant as any)?.product?.id ||
            (firstVariant as any)?.product ||
            (firstVariant as any)?.product_id;
          if (extractedProductId) {
            productIdToSend = Number(extractedProductId);
          }
        } catch (_) {
          // ignore, we'll attempt create without if unavailable (backend may reject)
        }
      }

      // variant_name is the same as the combo name
      const variantNameToSend = combo.name;

      const payload = {
        name: combo.name,
        description: combo.description,
        combo_items: combo.combo_items.map((item) => ({
          product_variant: item.product_variant,
          quantity: item.quantity,
        })),
        is_active: combo.is_active,
        variant_data: {
          base_price: combo.base_price || 0,
          mrp: combo.mrp || 0,
          selling_price: combo.selling_price || 0,
        },
        ...(productIdToSend ? { product_id: productIdToSend } : {}),
        ...(variantNameToSend ? { variant_name: variantNameToSend } : {}),
      } as any;

      await ApiService.createComboProduct(payload);
      toast({
        title: "Combo Created",
        description: "Combo has been created successfully.",
      });
      navigate("/combosandpacks/combos");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create combo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariants = async () => {
    if (selectedVariants.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one variant.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch variant details for each selected variant
      const variantDetails = await Promise.all(
        selectedVariants.map(async (variantId) => {
          try {
            const variant = await ApiService.getProductVariant(variantId);
            return {
              product_variant: parseInt(variantId),
              quantity: 1,
              base_price: variant.base_price,
              mrp: variant.mrp,
              selling_price: variant.selling_price,
              variant_name: variant.name,
              variant_sku: variant.sku,
              product_id:
                (variant as any)?.product?.id ||
                (variant as any)?.product ||
                (variant as any)?.product_id,
            };
          } catch (error) {
            // Fallback if variant details can't be fetched
            return {
              product_variant: parseInt(variantId),
              quantity: 1,
              base_price: parseInt(variantId) * 0.1, // Fallback calculation
              mrp: parseInt(variantId) * 0.1,
              selling_price: parseInt(variantId) * 0.1,
              variant_name: `Variant ${variantId}`,
              variant_sku: `SKU-${variantId}`,
            };
          }
        })
      );

      // Capture first product_id if not already set
      if (!firstProductId) {
        const maybeFirstProductId = variantDetails[0]?.product_id;
        if (maybeFirstProductId) setFirstProductId(Number(maybeFirstProductId));
      }

      setCombo((prev) => ({
        ...prev,
        combo_items: [...prev.combo_items, ...variantDetails],
      }));
      setSelectedVariants([]);
      setShowVariantPicker(false);
      toast({
        title: "Variants Added",
        description: `${selectedVariants.length} variants added to combo.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch variant details.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveComboItem = (index: number) => {
    setCombo((prev) => ({
      ...prev,
      combo_items: prev.combo_items.filter((_, i) => i !== index),
    }));
    toast({
      title: "Variant Removed",
      description: "Variant has been removed from combo.",
    });
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    if (quantity < 1) return;

    setCombo((prev) => ({
      ...prev,
      combo_items: prev.combo_items.map((item, i) =>
        i === index ? { ...item, quantity } : item
      ),
    }));
  };

  const handleMoveComboItem = (index: number, direction: "up" | "down") => {
    setCombo((prev) => {
      const items = [...prev.combo_items];
      const newIndex = direction === "up" ? index - 1 : index + 1;

      if (newIndex < 0 || newIndex >= items.length) return prev;

      [items[index], items[newIndex]] = [items[newIndex], items[index]];

      return { ...prev, combo_items: items };
    });
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Create Combo"
        description="Create a new product combo"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (hasUnsavedChanges) {
                  const confirm = window.confirm(
                    "You have unsaved changes. Are you sure you want to leave?"
                  );
                  if (!confirm) return;
                }
                navigate("/combosandpacks/combos");
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Combos
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Creating..." : "Create Combo"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Accordion
            type="multiple"
            defaultValue={["basic", "products"]}
            className="space-y-4"
          >
            {/* Basic Information */}
            <AccordionItem value="basic">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    <span className="font-semibold">Basic Information</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Combo Name *</Label>
                          <Input
                            id="name"
                            value={combo.name}
                            onChange={(e) =>
                              setCombo((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            placeholder="Enter combo name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={combo.description}
                            onChange={(e) =>
                              setCombo((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Enter combo description"
                            rows={4}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="base_price">Base Price</Label>
                            <Input
                              id="base_price"
                              type="number"
                              step="0.01"
                              min="0"
                              value={combo.base_price || ""}
                              onChange={(e) =>
                                setCombo((prev) => ({
                                  ...prev,
                                  base_price: parseFloat(e.target.value) || 0,
                                }))
                              }
                              placeholder="0.00"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="mrp">MRP</Label>
                            <Input
                              id="mrp"
                              type="number"
                              step="0.01"
                              min="0"
                              value={combo.mrp || ""}
                              onChange={(e) =>
                                setCombo((prev) => ({
                                  ...prev,
                                  mrp: parseFloat(e.target.value) || 0,
                                }))
                              }
                              placeholder="0.00"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="selling_price">Selling Price</Label>
                            <Input
                              id="selling_price"
                              type="number"
                              step="0.01"
                              min="0"
                              value={combo.selling_price || ""}
                              onChange={(e) =>
                                setCombo((prev) => ({
                                  ...prev,
                                  selling_price:
                                    parseFloat(e.target.value) || 0,
                                }))
                              }
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="is_active"
                            checked={combo.is_active}
                            onCheckedChange={(checked) =>
                              setCombo((prev) => ({
                                ...prev,
                                is_active: checked,
                              }))
                            }
                          />
                          <Label htmlFor="is_active">Active</Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Combo Items */}
            <AccordionItem value="products">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    <span className="font-semibold">Combo Items</span>
                    <Badge variant="secondary">
                      {combo.combo_items.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Add and manage product variants in this combo
                        </p>
                        <Button onClick={() => setShowVariantPicker(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Variants
                        </Button>
                      </div>

                      {combo.combo_items.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No variants in this combo yet.</p>
                          <p className="text-sm">
                            Click "Add Variants" to get started.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {combo.combo_items.map((item, index) => (
                            <div
                              key={`${item.product_variant}-${index}`}
                              className="flex items-center gap-4 p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                {/* <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" /> */}
                                <span className="text-sm text-muted-foreground">
                                  #{index + 1}
                                </span>
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium">
                                  Variant ID: {item.product_variant}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Quantity: {item.quantity}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor={`quantity-${index}`}
                                  className="text-sm"
                                >
                                  Qty:
                                </Label>
                                <Input
                                  id={`quantity-${index}`}
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      index,
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="w-20"
                                />
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleMoveComboItem(index, "up")
                                  }
                                  disabled={index === 0}
                                >
                                  ↑
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleMoveComboItem(index, "down")
                                  }
                                  disabled={
                                    index === combo.combo_items.length - 1
                                  }
                                >
                                  ↓
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Remove Variant
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove this
                                        variant from the combo?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          handleRemoveComboItem(index)
                                        }
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Combo Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Variants</Label>
                <p className="text-2xl font-bold">{combo.combo_items.length}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Total Quantity</Label>
                <p className="text-2xl font-bold">
                  {combo.combo_items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  )}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="mt-1">
                  <Badge variant={combo.is_active ? "default" : "secondary"}>
                    {combo.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Variant Picker */}
      <ProductVariantPicker
        open={showVariantPicker}
        onOpenChange={setShowVariantPicker}
        title="Add Variants to Combo"
        description="Search and select product variants to add to your combo"
        assignedProducts={[]}
        selectedProducts={selectedVariants}
        onSelectionChange={setSelectedVariants}
        onConfirm={handleAddVariants}
        onCancel={() => setSelectedVariants([])}
        loading={loading}
        confirmText="Add Variants"
        cancelText="Cancel"
        searchPlaceholder="Search variants by name or SKU..."
      />
    </div>
  );
}
