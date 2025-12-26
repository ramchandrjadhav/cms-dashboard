import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Edit,
  Plus,
  Package,
  GripVertical,
  Trash2,
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
import { useAuth } from "@/context/AuthContext";
import { ApiService } from "@/services/api";
import { ProductVariantPicker } from "@/components/ProductVariantPicker";
import type { ProductVariant } from "@/types";

interface ComboItem {
  id: number;
  product_variant: number;
  product_variant_name: string;
  product_variant_sku: string;
  product_name: string;
  quantity: number;
  is_active: boolean;
}

interface Combo {
  id: number;
  combo_variant: number;
  combo_variant_name: string;
  combo_variant_sku: string;
  name: string;
  description: string;
  combo_items: ComboItem[];
  items_count: number;
  is_active: boolean;
  creation_date: string;
  updation_date: string;
  base_price?: string | number;
  mrp?: string | number;
  selling_price?: string | number;
}

export default function ComboDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasRole, hasGroup } = useAuth();

  const canEditCombo = () => {
    return (
      hasRole("master") ||
      hasGroup("CATALOG_EDITOR") ||
      hasGroup("CATALOG_ADMIN")
    );
  };

  const [combo, setCombo] = useState<Combo | null>(null);
  const [editedCombo, setEditedCombo] = useState<Combo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showVariantPicker, setShowVariantPicker] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [firstProductId, setFirstProductId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    ApiService.getComboProduct(parseInt(id))
      .then((comboData) => {
        setCombo(comboData);
        setEditedCombo(comboData);
        // Try to infer firstProductId from existing combo if present
        if ((comboData as any)?.product_id) {
          setFirstProductId(Number((comboData as any).product_id));
        }
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to fetch combo details.",
          variant: "destructive",
        });
        navigate("/combosandpacks/combos");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!combo || !editedCombo) return;
    const isChanged = JSON.stringify(combo) !== JSON.stringify(editedCombo);
    setHasUnsavedChanges(isChanged);
  }, [combo, editedCombo]);

  const handleEdit = () => {
    if (!combo) return;
    if (!canEditCombo()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit combos.",
        variant: "destructive",
      });
      return;
    }
    setEditedCombo({ ...combo });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editedCombo) return;
    if (!editedCombo.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Combo name is required.",
        variant: "destructive",
      });
      return;
    }

    if (editedCombo.combo_items.length < 2) {
      toast({
        title: "Validation Error",
        description: "At least 2 product variants are required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let productIdToSend: number | undefined =
        firstProductId ?? (editedCombo.combo_items[0] as any)?.product_id;

      // If product_id is missing, fetch from the first variant
      if (!productIdToSend && editedCombo.combo_items[0]?.product_variant) {
        try {
          const firstVariantId = String(
            editedCombo.combo_items[0].product_variant
          );
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
          // Ignore; payload will be sent without product_id if unavailable
        }
      }

      // variant_name is the same as the combo name
      const variantNameToSend = editedCombo.name;

      const payload = {
        name: editedCombo.name,
        description: editedCombo.description,
        combo_items: editedCombo.combo_items.map((item) => ({
          product_variant: item.product_variant,
          quantity: item.quantity,
        })),
        is_active: editedCombo.is_active,
        base_price: parseFloat(String(editedCombo.base_price || 0)),
        mrp: parseFloat(String(editedCombo.mrp || 0)),
        selling_price: parseFloat(String(editedCombo.selling_price || 0)),
        ...(productIdToSend ? { product_id: productIdToSend } : {}),
        ...(variantNameToSend ? { variant_name: variantNameToSend } : {}),
      };

      await ApiService.updateComboProduct(editedCombo.id, payload);
      const refreshedCombo = await ApiService.getComboProduct(editedCombo.id);
      setCombo(refreshedCombo);
      setEditedCombo(refreshedCombo);
      setIsEditing(false);
      setHasUnsavedChanges(false);
      toast({
        title: "Combo Updated",
        description: "Combo details have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update combo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (
      hasUnsavedChanges &&
      !window.confirm(
        "You have unsaved changes. Are you sure you want to cancel?"
      )
    )
      return;
    if (!combo) return;
    setEditedCombo({ ...combo });
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  const handleAddVariants = async () => {
    if (!editedCombo) return;
    if (selectedVariants.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one variant.",
        variant: "destructive",
      });
      return;
    }

    try {
      const variantDetails = await Promise.all(
        selectedVariants.map(async (variantId, index) => {
          try {
            const variant = (await ApiService.getProductVariant(variantId)) as
              | ProductVariant
              | (Record<string, any> & {
                  name?: string;
                  sku?: string;
                  product?: any;
                });
            return {
              id: Date.now() + index, // Temporary ID for new items
              product_variant: parseInt(variantId),
              product_variant_name:
                (variant as any)?.name || `Variant ${variantId}`,
              product_variant_sku: (variant as any)?.sku || `SKU-${variantId}`,
              product_name:
                (variant as any)?.product?.name ||
                (variant as any)?.product_name ||
                `Product ${variantId}`,
              quantity: 1,
              is_active: true,
              // Keep any extra fields internal if backend ignores them
              product_id:
                (variant as any)?.product?.id ||
                (variant as any)?.product ||
                (variant as any)?.product_id,
            } as any;
          } catch (_) {
            return {
              id: Date.now() + index,
              product_variant: parseInt(variantId),
              product_variant_name: `Variant ${variantId}`,
              product_variant_sku: `SKU-${variantId}`,
              product_name: `Product ${variantId}`,
              quantity: 1,
              is_active: true,
            } as any;
          }
        })
      );

      setEditedCombo((prev) => ({
        ...prev!,
        combo_items: [...(prev?.combo_items || []), ...variantDetails],
      }));
      setSelectedVariants([]);
      setShowVariantPicker(false);
      toast({
        title: "Variants Added",
        description: `${selectedVariants.length} variants added to combo.`,
      });
    } catch (_) {
      toast({
        title: "Error",
        description: "Failed to fetch variant details.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveComboItem = (index: number) => {
    setEditedCombo((prev) => ({
      ...prev!,
      combo_items: (prev?.combo_items || []).filter((_, i) => i !== index),
    }));
    toast({
      title: "Variant Removed",
      description: "Variant has been removed from combo.",
    });
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    if (quantity < 1) return;

    setEditedCombo((prev) => ({
      ...prev!,
      combo_items: (prev?.combo_items || []).map((item, i) =>
        i === index ? { ...item, quantity } : item
      ),
    }));
  };

  const handleMoveComboItem = (index: number, direction: "up" | "down") => {
    setEditedCombo((prev) => {
      if (!prev) return prev;
      const items = [...prev.combo_items];
      const newIndex = direction === "up" ? index - 1 : index + 1;

      if (newIndex < 0 || newIndex >= items.length) return prev;

      [items[index], items[newIndex]] = [items[newIndex], items[index]];

      return { ...prev, combo_items: items };
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading combo details...
      </div>
    );
  }

  if (!combo) {
    return (
      <div className="text-center py-12 text-destructive">Combo not found.</div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={editedCombo?.name || "Combo"}
        description={editedCombo?.description || ""}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/combosandpacks/combos")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Combos
            </Button>
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </>
            ) : (
              canEditCombo() && (
                <Button onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Combo
                </Button>
              )
            )}
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
                          <Label htmlFor="name">Combo Name</Label>
                          {isEditing ? (
                            <Input
                              id="name"
                              value={editedCombo?.name || ""}
                              onChange={(e) =>
                                setEditedCombo((prev) => ({
                                  ...prev!,
                                  name: e.target.value,
                                }))
                              }
                              placeholder="Enter combo name"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {combo?.name}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          {isEditing ? (
                            <Textarea
                              id="description"
                              value={editedCombo?.description || ""}
                              onChange={(e) =>
                                setEditedCombo((prev) => ({
                                  ...prev!,
                                  description: e.target.value,
                                }))
                              }
                              placeholder="Enter combo description"
                              rows={4}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {combo?.description}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="base_price">Base Price</Label>
                            {isEditing ? (
                              <Input
                                id="base_price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={editedCombo?.base_price || ""}
                                onChange={(e) =>
                                  setEditedCombo((prev) => ({
                                    ...prev!,
                                    base_price: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                placeholder="0.00"
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {combo?.base_price || "0.00"}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="mrp">MRP</Label>
                            {isEditing ? (
                              <Input
                                id="mrp"
                                type="number"
                                step="0.01"
                                min="0"
                                value={editedCombo?.mrp || ""}
                                onChange={(e) =>
                                  setEditedCombo((prev) => ({
                                    ...prev!,
                                    mrp: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                placeholder="0.00"
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {combo?.mrp || "0.00"}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="selling_price">Selling Price</Label>
                            {isEditing ? (
                              <Input
                                id="selling_price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={editedCombo?.selling_price || ""}
                                onChange={(e) =>
                                  setEditedCombo((prev) => ({
                                    ...prev!,
                                    selling_price:
                                      parseFloat(e.target.value) || 0,
                                  }))
                                }
                                placeholder="0.00"
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {combo?.selling_price || "0.00"}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Status</Label>
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="is_active"
                                checked={editedCombo?.is_active || false}
                                onCheckedChange={(checked) =>
                                  setEditedCombo((prev) => ({
                                    ...prev!,
                                    is_active: checked,
                                  }))
                                }
                              />
                              <Label htmlFor="is_active">Active</Label>
                            </div>
                          ) : (
                            <div className="mt-1">
                              <Badge
                                variant={
                                  combo?.is_active ? "default" : "secondary"
                                }
                              >
                                {combo?.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Created At</Label>
                          <p className="text-sm text-muted-foreground">
                            {combo?.creation_date
                              ? new Date(combo.creation_date).toLocaleString()
                              : "-"}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Last Updated</Label>
                          <p className="text-sm text-muted-foreground">
                            {combo?.updation_date
                              ? new Date(combo.updation_date).toLocaleString()
                              : "-"}
                          </p>
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
                      {editedCombo?.combo_items.length || 0}
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

                        {isEditing && canEditCombo() && (
                          <Button onClick={() => setShowVariantPicker(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Variants
                          </Button>
                        )}
                      </div>

                      {editedCombo?.combo_items.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No variants in this combo yet.</p>
                          <p className="text-sm">
                            Click "Add Variants" to get started.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {editedCombo?.combo_items.map((item, index) => (
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
                                  {item.product_name ||
                                    `Variant ID: ${item.product_variant}`}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  SKU:{" "}
                                  {item.product_variant_sku ||
                                    `SKU-${item.product_variant}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Quantity: {item.quantity}
                                </p>
                              </div>

                              {isEditing && canEditCombo() && (
                                <>
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
                                        index ===
                                        (editedCombo?.combo_items.length || 0) -
                                          1
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
                                </>
                              )}
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
                <p className="text-2xl font-bold">
                  {editedCombo?.combo_items.length || 0}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Total Quantity</Label>
                <p className="text-2xl font-bold">
                  {editedCombo?.combo_items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  ) || 0}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="mt-1">
                  <Badge
                    variant={editedCombo?.is_active ? "default" : "secondary"}
                  >
                    {editedCombo?.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Created At</Label>
                <p className="text-sm text-muted-foreground">
                  {combo?.creation_date
                    ? new Date(combo.creation_date).toLocaleString()
                    : "-"}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Last Updated</Label>
                <p className="text-sm text-muted-foreground">
                  {combo?.updation_date
                    ? new Date(combo.updation_date).toLocaleString()
                    : "-"}
                </p>
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
