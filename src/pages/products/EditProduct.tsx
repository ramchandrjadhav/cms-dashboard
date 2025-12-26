import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Upload,
  X,
  Package,
  DollarSign,
  Warehouse,
  Settings,
  AlertTriangle,
  Image as ImageIcon,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  Eye,
  EyeOff,
  MoreHorizontal,
  Edit,
  Copy,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { VariantBuilderModal } from "@/components/VariantBuilderModal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { ApiService } from "@/services/api";
import { WhatsAppApiService } from "@/services/whatsapp-api";
import {
  GenericSearchableDropdown,
  SearchableOption,
} from "@/components/ui/generic-searchable-dropdown";
import {
  LevelCategoryDropdown,
  LevelCategory,
} from "@/components/ui/level-category-dropdown";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

// Types and constants (copy from CreateEditProduct)
interface ProductOptionValue {
  id: string;
  value: string;
  sort: number;
}

interface ProductOption {
  id: string;
  name: string;
  values: ProductOptionValue[];
  sort: number;
  expanded?: boolean;
}

interface ProductVariant {
  id?: string;
  optionValueIds?: string[];
  customTitle?: string;
  sku?: string; // Optional SKU field
  name: string;
  price: number;
  mrp: number;
  csp: number;
  cust_discount: number;
  stock_quantity: number;
  max_purchase_limit: number;
  outofstock_threshold: number;
  ean_number: string;
  ran_number?: string; // RAN number as alternative to EAN
  hsn_code?: string; // HSN code from third party vendor
  tax_percentage?: number; // Tax percentage from third party vendor
  size: string;
  color: string;
  weight: number;
  net_qty?: string;
  is_active?: boolean;
}

interface CategoryOption extends SearchableOption {
  id: string;
  label: string;
  value: string;
  name: string;
  description?: string;
  is_active: boolean;
  category?: number; // For subcategories
  subcategory?: number; // For subsubcategories
}

interface ProductFormData {
  name: string;
  description: string;
  category: string; // Will store the selected leaf category ID
  brand: string;
  is_visible: boolean;
  is_published: boolean;
  is_active: boolean;
  tax: string;
  slug: string;
  collections: string[]; // Add collections array
  variants: ProductVariant[];
  product_images: {
    priority: number;
    image: string;
    alt_text: string;
    is_primary: boolean;
  }[];
  tags: string[];
  linked_variants?: { id?: number; linked_variant: { id: number } }[];
}

const MAX_OPTIONS = 5;
const MAX_VARIANTS_WARNING = 100;

const initialFormData: ProductFormData = {
  name: "",
  description: "",
  category: "",
  brand: "",
  is_visible: true,
  is_published: true,
  is_active: true,
  tax: "",
  slug: "",
  collections: [], // Initialize empty collections array
  variants: [],
  product_images: [],
  tags: [],
  linked_variants: [],
};

export default function EditProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [formData, setFormData] = useState(initialFormData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [collections, setCollections] = useState<CategoryOption[]>([]); // Add collections state
  const [selectedCategory, setSelectedCategory] =
    useState<LevelCategory | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<CategoryOption | null>(
    null
  );
  const [showCollectionsDropdown, setShowCollectionsDropdown] = useState(false); // Add collections dropdown state
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [selectedImages, setSelectedImages] = useState<
    { url: string; preview: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    async function fetchDropdowns() {
      try {
        const [brandsData, collectionsData] = await Promise.all([
          ApiService.getBrandsWithPagination(1, 1000),
          ApiService.getCollectionsWithPagination(1, 1000), // Add collections fetch
        ]);

        // Transform brands data to match CategoryOption interface
        const transformedBrands: CategoryOption[] = brandsData?.results.map(
          (brand: any) => ({
            id: brand.id.toString(),
            label: brand.name,
            value: brand.name.toLowerCase().replace(/\s+/g, "-"),
            name: brand.name,
            description: brand.description,
            is_active: brand.is_active,
          })
        );

        // Transform collections data to match CategoryOption interface
        const transformedCollections: CategoryOption[] =
          collectionsData?.results.map((collection: any) => ({
            id: collection.id.toString(),
            label: collection.name,
            value: collection.name.toLowerCase().replace(/\s+/g, "-"),
            name: collection.name,
            description: collection.description,
            is_active: collection.is_active,
          }));

        setBrands(transformedBrands);
        setCollections(transformedCollections); // Set collections
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to fetch brands or collections.",
          variant: "destructive",
        });
      }
    }
    fetchDropdowns();
  }, []);

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;
      setLoading(true);
      try {
        const product = await ApiService.getProduct(id);
        if (product) {
          console.log("Product data:", product);
          console.log("Product collections:", product.collections);

          const collectionsIds =
            product.collections?.map((c: any) => c.id?.toString()) || [];
          console.log("Collections IDs:", collectionsIds);

          setFormData({
            ...initialFormData,
            name: product.name || "",
            description: product.description || "",
            category: product.category?.id?.toString() || "",
            brand: product.brand?.id?.toString() || "",
            is_visible: product.is_visible ?? true,
            is_published: product.is_published ?? true,
            is_active: product.is_active ?? true,
            tax: product.tax || "",
            slug: product.slug || "",
            collections: collectionsIds,

            variants: (product.variants || []).map((v: any) => ({
              price: v.price ?? 0,
              weight: v.weight ?? 0,
              is_active: v.is_active ?? true,
              csp: v.csp ?? 0,
              cust_discount: v.cust_discount ?? 0,
              stock_quantity: v.stock_quantity ?? 0,
              max_purchase_limit: v.max_purchase_limit ?? 0,
              outofstock_threshold: v.outofstock_threshold ?? 0,
              ran_number: v.ran_number || "",
              hsn_code: v.hsn_code || "",
              tax_percentage: v.tax_percentage,
              ...v,
            })),
            product_images: product.product_images || [],
            tags: product.tags || [],
            linked_variants: product.linked_variants || [],
          });
          setSelectedImages(
            (product.product_images || []).map((img) => ({
              url: img.image,
              preview: img.image,
            }))
          );

          // Set the selected category if it exists
          if (product.category) {
            // We'll need to fetch the full category tree to set the selected category
            // For now, we'll set a placeholder that will be updated when categories are fetched
            setSelectedCategory({
              id: product.category.id.toString(),
              name: product.category.name,
              
            } as LevelCategory);
          }

          // Extract options from variants
          function extractOptionsFromVariants(variants) {
            const optionMap = {
              color: new Set(),
              size: new Set(),
              weight: new Set(),
            };
            variants.forEach((variant) => {
              if (variant.color && variant.color !== "")
                optionMap.color.add(variant.color);
              if (variant.size && variant.size !== "")
                optionMap.size.add(variant.size);
              if (
                variant.weight &&
                variant.weight !== "" &&
                variant.weight !== "0"
              )
                optionMap.weight.add(variant.weight);
            });
            const options = [];
            let sort = 0;
            for (const key of ["color", "size", "weight"]) {
              if (optionMap[key].size > 0) {
                options.push({
                  id: `option-${key}`,
                  name: key,
                  values: Array.from(optionMap[key]).map((val, idx) => ({
                    id: `value-${key}-${val}`,
                    value: val,
                    sort: idx,
                  })),
                  sort: sort++,
                });
              }
            }
            return options;
          }
          setOptions(extractOptionsFromVariants(product.variants || []));
        }
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to fetch product info.",
          variant: "destructive",
        });
      }
      setLoading(false);
    }
    fetchProduct();
  }, [id]);

  // Sync selected dropdown values with formData
  useEffect(() => {
    if (brands.length > 0 && formData.brand) {
      const brandOption = brands.find((brand) => brand.id == formData.brand);
      setSelectedBrand(brandOption || null);
    }
  }, [brands, formData.brand]);

  // Sync selectedCategory with formData.category
  useEffect(() => {
    if (selectedCategory) {
      handleInputChange("category", selectedCategory.id);
    }
  }, [selectedCategory]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      product_images: selectedImages.map((img, idx) => ({
        priority: idx + 1,
        image: img.url,
        alt_text: `Product image ${idx + 1}`,
        is_primary: idx === 0,
      })),
    }));
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      selectedImages.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [selectedImages]);

  const handleInputChange = (field: string, value: any) => {
    if (["brand"].includes(field)) {
      value = value ? value.toString() : "";
    }
    setFormData((prev) => {
      let updated = { ...prev, [field]: value };
      return updated;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    setHasUnsavedChanges(true);
  };

  // 1. Update handleImageUpload to upload images to the server and use returned URLs
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      // Upload files and get URLs
      const uploadRes = await ApiService.uploadImages(files);
      // Prefix file_path with API_BASE_URL (no /api at end)
      const RAW_API_BASE_URL = import.meta.env.VITE_MAIN_ROZANA_URL;
      const API_BASE_URL = RAW_API_BASE_URL.endsWith("/api")
        ? RAW_API_BASE_URL.slice(0, -4)
        : RAW_API_BASE_URL;
      const newImages = uploadRes.map((item: any, idx: number) => ({
        url: `${API_BASE_URL}${item.file_path}`,
        preview: URL.createObjectURL(files[idx]),
      }));
      setSelectedImages((prev) => [...prev, ...newImages]);
      if (imageInputRef.current)
        (imageInputRef.current as HTMLInputElement).value = "";
    } catch (err) {
      // Optionally show a toast
      toast({
        title: "Image Upload Failed",
        description: "Could not upload images. Please try again.",
        variant: "destructive",
      });
    }
    setHasUnsavedChanges(true);
  };

  // 2. Remove image: revoke object URL and remove from array
  const removeImage = (index: number) => {
    setSelectedImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
    setHasUnsavedChanges(true);
  };

  // 3. Make image primary: reorder array so primary is first
  const makePrimary = (index: number) => {
    if (index === 0) return;
    setSelectedImages((prev) => {
      const newArr = [...prev];
      const [img] = newArr.splice(index, 1);
      newArr.unshift(img);
      return newArr;
    });
    setHasUnsavedChanges(true);
  };

  const handleAddOption = () => {
    if (options.length >= MAX_OPTIONS) {
      toast({
        title: "Maximum Options Reached",
        description: `You can only have ${MAX_OPTIONS} options.`,
        variant: "destructive",
      });
      return;
    }
    setOptions((prev) => [
      ...prev,
      { id: `option-${Date.now()}`, name: "", values: [], sort: prev.length },
    ]);
    setHasUnsavedChanges(true);
  };

  const handleDeleteOption = (optionId: string) => {
    setOptions((prev) => prev.filter((opt) => opt.id !== optionId));
    setHasUnsavedChanges(true);
  };

  const handleOptionNameChange = (optionId: string, name: string) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.id === optionId ? { ...opt, name } : opt))
    );
    setHasUnsavedChanges(true);
  };

  const handleAddOptionValue = (optionId: string, value: string) => {
    setOptions((prev) =>
      prev.map((opt) =>
        opt.id === optionId
          ? {
              ...opt,
              values: [
                ...opt.values,
                { id: `value-${Date.now()}`, value, sort: opt.values.length },
              ],
            }
          : opt
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleDeleteOptionValue = (optionId: string, valueId: string) => {
    setOptions((prev) =>
      prev.map((opt) =>
        opt.id === optionId
          ? {
              ...opt,
              values: opt.values.filter((val) => val.id !== valueId),
            }
          : opt
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleApplyVariants = (newVariants: ProductVariant[]) => {
    // Use variant name for duplicate detection
    const existingNames = new Set(
      (formData.variants || []).map((v) => v.name.trim().toLowerCase())
    );
    const trulyNewVariants = newVariants.filter(
      (v) => !existingNames.has(v.name.trim().toLowerCase())
    );
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, ...trulyNewVariants],
    }));
    setHasUnsavedChanges(true);
  };

  const [showVariantBuilder, setShowVariantBuilder] = useState(false);
  const [showVariantGuard, setShowVariantGuard] = useState(false);
  const [bulkPriceDialogOpen, setBulkPriceDialogOpen] = useState(false);
  const [bulkInventoryDialogOpen, setBulkInventoryDialogOpen] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(
    new Set()
  );
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(
    null
  );
  const [variantDrawerOpen, setVariantDrawerOpen] = useState(false);
  const [optionsImpactDialog, setOptionsImpactDialog] = useState(false);
  const [pendingOptionsChange, setPendingOptionsChange] = useState<
    ProductOption[] | null
  >(null);
  const [optionsImpact, setOptionsImpact] = useState<any>(null);

  const toggleOptionExpanded = (optionId: string) => {
    setOptions((prev) =>
      prev.map((opt) =>
        opt.id === optionId ? { ...opt, expanded: !opt.expanded } : opt
      )
    );
  };

  const handleVariantUpdate = (
    variantId: string,
    field: string,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v) =>
        v.id === variantId ? { ...v, [field]: value } : v
      ),
    }));
    setHasUnsavedChanges(true);
  };

  const handleVariantGuardAction = async (
    action: "cancel" | "keep" | "rebuild"
  ) => {
    if (action === "cancel") {
      setShowVariantGuard(false);
      return;
    }

    if (action === "keep") {
      setShowVariantGuard(false);
      return;
    }

    if (action === "rebuild") {
      setShowVariantGuard(false);
      setShowVariantBuilder(true);
      return;
    }
  };

  const generateAutoTitle = (
    variant: ProductVariant,
    options: ProductOption[]
  ) => {
    const optionValues = variant.optionValueIds?.map((valueId) => {
      const option = options.find((opt) =>
        opt.values.some((val) => val.id === valueId)
      );
      const value = option?.values.find((val) => val.id === valueId);
      return value?.value;
    });
    return optionValues.filter(Boolean).join(" / ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors: Record<string, string> = {};

    if (!formData.name) {
      formErrors.name = "Product name is required.";
    }
    if (!selectedCategory) {
      formErrors.category = "Category is required.";
    }
    // if (!formData.brand) {
    //   formErrors.brand = "Brand is required.";
    // }

    formData.variants.forEach((variant, idx) => {
      if (!variant.ean_number) {
        formErrors[`variant_ean_${variant.id || idx}`] =
          "EAN Number is required for all variants.";
      }
    });

    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(formData.variants);
      // Prepare product_variants: only include id for existing variants, omit id for new variants, and omit optionValueIds
      const cleanVariants = formData.variants.map((variant) => {
        const { optionValueIds, ...rest } = variant;
        // Only include id if it's a real database ID (not a temporary one starting with 'var-')
        if (rest.id && !rest.id.toString().startsWith("var-")) {
          return rest;
        } else {
          // For new variants, omit the id field entirely
          const { id, ...newVariant } = rest;
          return newVariant;
        }
      });
      const payload = {
        ...formData,
        category: selectedCategory?.id || "",
        variants: cleanVariants,
        linked_variants:
          formData.linked_variants.length > 0
            ? formData.linked_variants?.map((lv) => lv.id)
            : [],
      };
      const productResponse = await ApiService.updateProduct(
        id,
        payload as any
      );

      // Upload to WhatsApp catalog after successful product update
      try {
        // Get brand name from brands list
        const brandName =
          brands.find((brand) => brand.id === productResponse?.brand)?.name ||
          "Unknown Brand";

        // Get primary image URL
        const primaryImage =
          productResponse.product_images.length > 0
            ? productResponse.product_images[0].image
            : "";

        // Get first variant price or use main price
        const firstVariant = productResponse.variants?.[0];
        const price = firstVariant?.mrp || 0;
        const salePrice = firstVariant?.price || 0; // You can adjust this logic as needed

        // Determine availability based on stock
        const availability = productResponse?.is_active
          ? "in stock"
          : "out of stock";

        const whatsappPayload = {
          retailer_id: productResponse.id.toString(),
          name: productResponse.name,
          description: productResponse.description,
          brand: brandName,
          availability: availability,
          image_url: primaryImage,
          link: "https://rozana-catalog-management-admin.lovable.app/",
          currency: "INR",
          price: price.toString(),
          sale_price: salePrice.toString(),
        };

        await WhatsAppApiService.uploadProduct(whatsappPayload);

        toast({
          title: "Product Updated & Uploaded",
          description:
            "Product has been updated and uploaded to WhatsApp catalog successfully.",
          variant: "default",
        });
      } catch (whatsappError) {
        console.error("WhatsApp upload failed:", whatsappError);
        toast({
          title: "Product Updated",
          description:
            "Product has been updated successfully, but WhatsApp upload failed.",
          variant: "default",
        });
      }
      navigate("/products/list");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update product.",
        variant: "destructive",
      });
    }
  };

  // Collections selection handlers
  const handleCollectionToggle = (collectionId: string) => {
    console.log("Toggling collection:", collectionId);
    setFormData((prev) => {
      const newCollections = prev.collections.includes(collectionId)
        ? prev.collections.filter((id) => id !== collectionId)
        : [...prev.collections, collectionId];
      console.log("New collections:", newCollections);
      return {
        ...prev,
        collections: newCollections,
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleRemoveCollection = (collectionId: string) => {
    console.log("Removing collection:", collectionId);
    setFormData((prev) => {
      const newCollections = prev.collections.filter(
        (id) => id !== collectionId
      );
      console.log("New collections after removal:", newCollections);
      return {
        ...prev,
        collections: newCollections,
      };
    });
    setHasUnsavedChanges(true);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading product info...
      </div>
    );
  }

  const potentialVariantCount = options.reduce(
    (sum, option) => sum + option.values.length,
    0
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Edit Product"
        description={`Edit ${formData.name}`}
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
                navigate("/products/list");
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
            <Button onClick={handleSubmit} disabled={!hasUnsavedChanges}>
              <Save className="mr-2 h-4 w-4" />
              Update Product
            </Button>
          </div>
        }
      />

      {/* {hasUnsavedChanges && (
        <Card className="border-warning bg-warning-light">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                You have unsaved changes
              </span>
            </div>
          </CardContent>
        </Card>
      )} */}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Accordion
              type="multiple"
              defaultValue={["general", "options", "variants", "images"]}
              className="space-y-4"
            >
              {/* General Information */}
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
                        <div className="space-y-2">
                          <Label htmlFor="name">Product Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) =>
                              handleInputChange("name", e.target.value)
                            }
                            placeholder="Enter product name"
                            className={errors.name ? "border-destructive" : ""}
                          />
                          {errors.name && (
                            <p className="text-sm text-destructive">
                              {errors.name}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category">Category *</Label>
                          <LevelCategoryDropdown
                            value={selectedCategory}
                            onValueChange={setSelectedCategory}
                            placeholder="Select category (SS-Cat & SSS-Cat only)"
                            searchPlaceholder="Search categories..."
                            emptyMessage="No SS-Cat or SSS-Cat categories found."
                            triggerClassName={errors.category ? "border-destructive" : ""}
                          />
                          {errors.category && (
                            <p className="text-sm text-destructive">
                              {errors.category}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="brand">Brand</Label>
                          <GenericSearchableDropdown
                            options={brands}
                            value={selectedBrand}
                            onValueChange={(value) => {
                              setSelectedBrand(value as CategoryOption | null);
                              handleInputChange("brand", value?.id || "");
                            }}
                            placeholder="Select brand"
                            searchPlaceholder="Search brands..."
                            triggerClassName={
                              errors.brand ? "border-destructive" : ""
                            }
                          />
                          {errors.brand && (
                            <p className="text-sm text-destructive">
                              {errors.brand}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={formData.is_active ? "true" : "false"}
                            onValueChange={(value) =>
                              handleInputChange("is_active", value === "true")
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Active</SelectItem>
                              <SelectItem value="false">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) =>
                            handleInputChange("description", e.target.value)
                          }
                          placeholder="Enter product description"
                          rows={4}
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <Label htmlFor="featured">Featured Product</Label>
                        <Switch
                          id="featured"
                          checked={formData.is_published}
                          onCheckedChange={(checked) =>
                            handleInputChange("is_published", checked)
                          }
                        />
                      </div>

                      <div className="mt-4 space-y-2">
                        <Label htmlFor="tags">Tags</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {formData.tags.map((tag, idx) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="px-3 py-1 flex items-center gap-1"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    tags: prev.tags.filter((t) => t !== tag),
                                  }));
                                }}
                                className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <Input
                          id="tags"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              (e.key === "Enter" || e.key === ",") &&
                              tagInput.trim()
                            ) {
                              e.preventDefault();
                              const newTag = tagInput.trim();
                              if (!formData.tags.includes(newTag)) {
                                setFormData((prev) => ({
                                  ...prev,
                                  tags: [...prev.tags, newTag],
                                }));
                              }
                              setTagInput("");
                            }
                            if (
                              e.key === "Backspace" &&
                              !tagInput &&
                              formData.tags.length > 0
                            ) {
                              // Remove last tag on backspace if input is empty
                              setFormData((prev) => ({
                                ...prev,
                                tags: prev.tags.slice(0, -1),
                              }));
                            }
                          }}
                          placeholder="Type a tag and press Enter"
                          className="w-full"
                        />
                      </div>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Product Images */}
              <AccordionItem value="images">
                <Card>
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      <span className="font-semibold">Product Images</span>
                      <Badge variant="outline">{selectedImages.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Image Upload */}
                        <div
                          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition"
                          onClick={() => imageInputRef.current?.click()}
                        >
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">
                            Drop images here or click to upload
                          </p>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload"
                            ref={imageInputRef}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-4"
                            onClick={(e) => {
                              e.stopPropagation();
                              imageInputRef.current?.click();
                            }}
                          >
                            Choose Files
                          </Button>
                        </div>

                        {/* Image Grid */}
                        {(selectedImages || []).length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {(selectedImages || []).map((img, index) => (
                              <div
                                key={img.preview}
                                className="relative group border rounded-lg overflow-hidden"
                              >
                                <img
                                  src={img.preview}
                                  alt={`Product image ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border"
                                />
                                {index === 0 ? (
                                  <Badge className="absolute top-2 left-2 z-10 bg-green-600 text-white">
                                    Primary
                                  </Badge>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="absolute top-2 left-2 z-10 text-xs px-2 py-1"
                                    onClick={() => makePrimary(index)}
                                  >
                                    Make Primary
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => removeImage(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Product Options */}
              <AccordionItem value="options">
                <Card>
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      <span className="font-semibold">Product Options</span>
                      <Badge variant="outline">
                        {(options || []).length}/{MAX_OPTIONS}
                      </Badge>
                      {potentialVariantCount > 0 && (
                        <Badge
                          variant={
                            potentialVariantCount > MAX_VARIANTS_WARNING
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {potentialVariantCount} variants
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0 space-y-4">
                      {(options || []).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Settings className="mx-auto h-12 w-12 mb-4 opacity-50" />
                          <p className="text-sm">No options created yet</p>
                          <p className="text-xs">
                            Options like Size, Color, etc. will generate product
                            variants
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(options || []).map((option, optionIndex) => (
                            <OptionEditor
                              key={option.id}
                              option={option}
                              optionIndex={optionIndex}
                              isExpanded={option.expanded}
                              onToggleExpanded={() =>
                                toggleOptionExpanded(option.id)
                              }
                              onNameChange={(name) =>
                                handleOptionNameChange(option.id, name)
                              }
                              onAddValue={(value) =>
                                handleAddOptionValue(option.id, value)
                              }
                              onDeleteValue={(valueId) =>
                                handleDeleteOptionValue(option.id, valueId)
                              }
                              onDelete={() => handleDeleteOption(option.id)}
                              errors={errors}
                            />
                          ))}
                        </div>
                      )}

                      <div className="pt-4 border-t">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddOption}
                            disabled={(options || []).length >= MAX_OPTIONS}
                            className="flex-1"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Option{" "}
                            {(options || []).length > 0 &&
                              `(${(options || []).length}/${MAX_OPTIONS})`}
                          </Button>

                          {(options || []).length > 0 && (
                            <Button
                              type="button"
                              onClick={() => setShowVariantBuilder(true)}
                              className="flex-1"
                            >
                              <Grid3X3 className="mr-2 h-4 w-4" />
                              Generate Variants
                            </Button>
                          )}
                        </div>
                      </div>

                      {errors.options && (
                        <p className="text-sm text-destructive">
                          {errors.options}
                        </p>
                      )}
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Product Variants */}
              <AccordionItem value="variants">
                <Card>
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      <span className="font-semibold">Product Variants</span>
                      <Badge variant="outline">
                        {(formData.variants || []).length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {(formData.variants || []).length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p className="text-sm">No variants created yet</p>
                            <p className="text-xs">
                              Use "Generate Variants" in the Options section to
                              create variants
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Bulk Actions Bar */}
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                              <div className="flex items-center gap-2">
                                {/* <Checkbox
                                  checked={
                                    selectedVariants.size ===
                                      (formData.variants || []).length &&
                                    (formData.variants || []).length > 0
                                  }
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedVariants(
                                        new Set(
                                          (formData.variants || []).map(
                                            (v) => v.id
                                          )
                                        )
                                      );
                                    } else {
                                      setSelectedVariants(new Set());
                                    }
                                  }}
                                /> */}
                                <span className="text-sm font-medium">
                                  {/* {selectedVariants.size > 0
                                    ? `${selectedVariants.size} selected`
                                    : "Select all"} */}
                                </span>
                              </div>

                              {/* {(selectedVariants || []).size > 0 && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const updatedVariants = (
                                        formData.variants || []
                                      ).map((variant) =>
                                        selectedVariants.has(variant.id)
                                          ? { ...variant, enabled: true }
                                          : variant
                                      );
                                      handleInputChange(
                                        "variants",
                                        updatedVariants
                                      );
                                    }}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Enable
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const updatedVariants = (
                                        formData.variants || []
                                      ).map((variant) =>
                                        selectedVariants.has(variant.id)
                                          ? { ...variant, enabled: false }
                                          : variant
                                      );
                                      handleInputChange(
                                        "variants",
                                        updatedVariants
                                      );
                                    }}
                                  >
                                    <EyeOff className="h-3 w-3 mr-1" />
                                    Disable
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setBulkPriceDialogOpen(true)}
                                  >
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    Set Price
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setBulkInventoryDialogOpen(true)
                                    }
                                  >
                                    <Package className="h-3 w-3 mr-1" />
                                    Set Inventory
                                  </Button>
                                </div>
                              )} */}
                            </div>

                            {/* Variants Grid */}
                            <div className="border rounded-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    {/* <TableHead className="w-12">
                                      <Checkbox
                                        checked={
                                          selectedVariants.size ===
                                            (formData.variants || []).length &&
                                          (formData.variants || []).length > 0
                                        }
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedVariants(
                                              new Set(
                                                (formData.variants || []).map(
                                                  (v) => v.id
                                                )
                                              )
                                            );
                                          } else {
                                            setSelectedVariants(new Set());
                                          }
                                        }}
                                      />
                                    </TableHead> */}
                                    <TableHead className="w-16">
                                      Enabled
                                    </TableHead>
                                    <TableHead>Variant</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>EAN Number</TableHead>
                                    <TableHead>RAN Number</TableHead>
                                    <TableHead>HSN Code</TableHead>
                                    <TableHead>Tax %</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>MRP</TableHead>
                                    <TableHead>Net Qty</TableHead>
                                    <TableHead className="w-16">
                                      Actions
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(formData.variants || []).map(
                                    (variant, idx) => (
                                      <TableRow
                                        key={variant.id}
                                        className={`cursor-pointer hover:bg-muted/50 ${
                                          !variant.is_active ? "opacity-60" : ""
                                        }`}
                                        onClick={(e) => {
                                          const target =
                                            e.target as HTMLElement;
                                          if (
                                            target instanceof
                                              HTMLInputElement ||
                                            target instanceof
                                              HTMLButtonElement ||
                                            target.closest("button") ||
                                            target.closest("input")
                                          ) {
                                            return;
                                          }
                                          setEditingVariant(variant);
                                          setVariantDrawerOpen(true);
                                        }}
                                      >
                                        {/* <TableCell
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Checkbox
                                          checked={selectedVariants.has(
                                            variant.id
                                          )}
                                          onCheckedChange={(checked) => {
                                            const newSelected = new Set(
                                              selectedVariants
                                            );
                                            if (checked) {
                                              newSelected.add(variant.id);
                                            } else {
                                              newSelected.delete(variant.id);
                                            }
                                            setSelectedVariants(newSelected);
                                          }}
                                        />
                                      </TableCell> */}
                                        <TableCell
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Switch
                                            checked={variant.is_active}
                                            onCheckedChange={(checked) => {
                                              handleVariantUpdate(
                                                variant.id,
                                                "is_active",
                                                checked
                                              );
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <div className="max-w-48">
                                            <div className="flex items-center gap-2">
                                              {variant.name}
                                            </div>
                                            {variant.optionValueIds &&
                                              variant.optionValueIds.length >
                                                0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                  {variant.optionValueIds
                                                    .slice(0, 2)
                                                    .map((valueId) => {
                                                      const option =
                                                        options.find((opt) =>
                                                          opt.values.some(
                                                            (val) =>
                                                              val.id === valueId
                                                          )
                                                        );
                                                      const value =
                                                        option?.values.find(
                                                          (val) =>
                                                            val.id === valueId
                                                        );
                                                      return value ? (
                                                        <Badge
                                                          key={valueId}
                                                          variant="outline"
                                                          className="text-xs"
                                                        >
                                                          {value.value}
                                                        </Badge>
                                                      ) : null;
                                                    })}
                                                  {variant.optionValueIds
                                                    .length > 2 && (
                                                    <Badge
                                                      variant="outline"
                                                      className="text-xs"
                                                    >
                                                      +
                                                      {variant.optionValueIds
                                                        .length - 2}
                                                    </Badge>
                                                  )}
                                                </div>
                                              )}
                                          </div>
                                        </TableCell>
                                        <TableCell
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Input
                                            value={variant.sku || ""}
                                            onChange={(e) =>
                                              handleVariantUpdate(
                                                variant.id,
                                                "sku",
                                                e.target.value
                                              )
                                            }
                                            placeholder="SKU"
                                            className="w-24 h-8"
                                          />
                                        </TableCell>
                                        <TableCell
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Input
                                            value={variant.ean_number || ""}
                                            onChange={(e) =>
                                              handleVariantUpdate(
                                                variant.id,
                                                "ean_number",
                                                e.target.value
                                              )
                                            }
                                            placeholder="EAN Number"
                                            className={`w-28 h-8${
                                              errors[
                                                `variant_ean_${
                                                  variant.id || idx
                                                }`
                                              ]
                                                ? " border-destructive"
                                                : ""
                                            }`}
                                          />
                                          {errors[
                                            `variant_ean_${variant.id || idx}`
                                          ] && (
                                            <p className="text-xs text-destructive mt-1">
                                              {
                                                errors[
                                                  `variant_ean_${
                                                    variant.id || idx
                                                  }`
                                                ]
                                              }
                                            </p>
                                          )}
                                        </TableCell>
                                        <TableCell
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Input
                                            value={variant.ran_number || ""}
                                            onChange={(e) =>
                                              handleVariantUpdate(
                                                variant.id,
                                                "ran_number",
                                                e.target.value
                                              )
                                            }
                                            placeholder="RAN Number"
                                            className="w-28 h-8"
                                          />
                                        </TableCell>
                                        <TableCell
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Input
                                            value={variant.hsn_code || ""}
                                            onChange={(e) =>
                                              handleVariantUpdate(
                                                variant.id,
                                                "hsn_code",
                                                e.target.value
                                              )
                                            }
                                            placeholder="HSN Code"
                                            className="w-24 h-8"
                                          />
                                        </TableCell>
                                        <TableCell
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="flex items-center gap-1">
                                            <Input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              max="100"
                                              value={
                                                variant.tax_percentage || ""
                                              }
                                              onChange={(e) =>
                                                handleVariantUpdate(
                                                  variant.id,
                                                  "tax_percentage",
                                                  e.target.value
                                                    ? parseFloat(e.target.value)
                                                    : undefined
                                                )
                                              }
                                              placeholder="0.00"
                                              className="w-20 h-8"
                                            />
                                            <span className="text-sm text-muted-foreground">
                                              %
                                            </span>
                                          </div>
                                        </TableCell>
                                        <TableCell
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="flex items-center gap-1">
                                            <span className="text-sm text-muted-foreground">
                                              ₹
                                            </span>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={variant.price || ""}
                                              onChange={(e) =>
                                                handleVariantUpdate(
                                                  variant.id,
                                                  "price",
                                                  e.target.value
                                                    ? parseFloat(e.target.value)
                                                    : undefined
                                                )
                                              }
                                              placeholder={variant.price.toString()}
                                              className="w-20 h-8"
                                            />
                                          </div>
                                        </TableCell>
                                        <TableCell
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="flex items-center gap-1">
                                            <span className="text-sm text-muted-foreground">
                                              ₹
                                            </span>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={variant.mrp || ""}
                                              onChange={(e) =>
                                                handleVariantUpdate(
                                                  variant.id,
                                                  "mrp",
                                                  e.target.value
                                                    ? parseFloat(e.target.value)
                                                    : undefined
                                                )
                                              }
                                              placeholder={variant.mrp?.toString()}
                                              className="w-20 h-8"
                                            />
                                          </div>
                                        </TableCell>
                                        <TableCell
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <NetQtyCell
                                            variant={variant}
                                            onChange={(net_qty) =>
                                              handleVariantUpdate(
                                                variant.id,
                                                "net_qty",
                                                net_qty
                                              )
                                            }
                                          />
                                        </TableCell>

                                        <TableCell
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="sm">
                                                <MoreHorizontal className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingVariant(variant);
                                                  setVariantDrawerOpen(true);
                                                }}
                                              >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit Details
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleInputChange(
                                                    "variants",
                                                    (
                                                      formData.variants || []
                                                    ).filter(
                                                      (v) => v.id !== variant.id
                                                    )
                                                  );
                                                }}
                                              >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </TableCell>
                                      </TableRow>
                                    )
                                  )}
                                </TableBody>
                              </Table>
                            </div>
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
            {/* Status Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Status Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Product Status</span>
                  <Badge variant={formData.is_active ? "default" : "secondary"}>
                    {formData.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Featured</span>
                  <Badge
                    variant={formData.is_published ? "success" : "outline"}
                  >
                    {formData.is_published ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Images</span>
                  <Badge variant="outline">{selectedImages.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Options</span>
                  <Badge variant="outline">{(options || []).length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Potential Variants</span>
                  <Badge
                    variant={
                      potentialVariantCount > MAX_VARIANTS_WARNING
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {potentialVariantCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Variants</span>
                  <Badge variant="outline">
                    {(formData.variants || []).length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Collections Selection */}
            {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Collections
                  <Badge variant="outline">{formData.collections.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Add this product to collections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Popover
                    open={showCollectionsDropdown}
                    onOpenChange={setShowCollectionsDropdown}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={showCollectionsDropdown}
                        className="w-full justify-between"
                      >
                        Select collections...
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-1"
                      align="start"
                    >
                      <Command className="max-h-60">
                        <CommandInput placeholder="Search collections..." />
                        <CommandList>
                          <CommandEmpty>No collections found.</CommandEmpty>
                          <CommandGroup>
                            {collections.map((collection) => (
                              <CommandItem
                                key={collection.id}
                                onSelect={() =>
                                  handleCollectionToggle(collection.id)
                                }
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  checked={formData.collections.includes(
                                    collection.id
                                  )}
                                  onCheckedChange={() =>
                                    handleCollectionToggle(collection.id)
                                  }
                                  className="mr-2"
                                />
                                <span>{collection.label}</span>
                                {collection.description && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {collection.description}
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {formData.collections.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Selected Collections ({formData.collections.length})
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.collections.map((collectionId) => {
                        const collection = collections.find(
                          (c) => c.id === collectionId
                        );
                        console.log(
                          "Rendering collection badge:",
                          collectionId,
                          collection
                        );
                        return collection ? (
                          <Badge
                            key={collectionId}
                            variant="secondary"
                            className="px-3 py-1 flex items-center gap-1"
                          >
                            {collection.label}
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveCollection(collectionId)
                              }
                              className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ) : (
                          <Badge
                            key={collectionId}
                            variant="destructive"
                            className="px-3 py-1 flex items-center gap-1"
                          >
                            Unknown Collection ({collectionId})
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveCollection(collectionId)
                              }
                              className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card> */}
          </div>
        </div>
      </form>

      {/* Variant Builder Modal */}
      <VariantBuilderModal
        open={showVariantBuilder}
        onOpenChange={setShowVariantBuilder}
        options={options}
        existingVariants={formData.variants}
        onApplyVariants={handleApplyVariants}
      />

      {/* Variant Guard Dialog */}
      <AlertDialog open={showVariantGuard} onOpenChange={setShowVariantGuard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Product Options</AlertDialogTitle>
            <AlertDialogDescription>
              This product already has variants. Changing options will affect
              existing variants. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={() => handleVariantGuardAction("cancel")}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleVariantGuardAction("keep")}
            >
              Keep Existing Variants
            </Button>
            <AlertDialogAction
              onClick={() => handleVariantGuardAction("rebuild")}
            >
              Rebuild Variants
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Variant Edit Drawer */}
      <Drawer open={variantDrawerOpen} onOpenChange={setVariantDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Variant</DrawerTitle>
            <DrawerDescription>
              Modify the details of this product variant
            </DrawerDescription>
          </DrawerHeader>

          {editingVariant && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Custom Title Section */}
                <div className="space-y-2">
                  <Label htmlFor="customTitle">Custom Title (optional)</Label>
                  <Input
                    id="customTitle"
                    value={editingVariant.customTitle || ""}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setEditingVariant((prev) =>
                        prev ? { ...prev, customTitle: newTitle } : null
                      );
                    }}
                    placeholder={`Auto: ${editingVariant.name}`}
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave blank to use auto-generated title: "
                    {editingVariant.name}"
                  </p>
                </div>

                {/* SKU */}
                <div className="space-y-2">
                  <Label htmlFor="variantSku">SKU</Label>
                  <Input
                    id="variantSku"
                    value={editingVariant.sku || ""}
                    onChange={(e) => {
                      const newSku = e.target.value;
                      setEditingVariant((prev) =>
                        prev ? { ...prev, sku: newSku } : null
                      );
                    }}
                    placeholder="Enter variant SKU"
                  />
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <Label htmlFor="variantPrice">Price</Label>
                  <Input
                    id="variantPrice"
                    type="number"
                    step="0.01"
                    value={editingVariant.price || ""}
                    onChange={(e) => {
                      const newPrice = e.target.value
                        ? parseFloat(e.target.value)
                        : undefined;
                      setEditingVariant((prev) =>
                        prev ? { ...prev, price: newPrice } : null
                      );
                    }}
                    placeholder="Enter price"
                  />
                </div>

                {/* Weight */}
                <div className="space-y-2">
                  <Label htmlFor="variantWeight">Weight (g)</Label>
                  <Input
                    id="variantWeight"
                    type="number"
                    step="0.01"
                    value={editingVariant.weight || ""}
                    onChange={(e) => {
                      const newWeight = e.target.value
                        ? parseFloat(e.target.value)
                        : undefined;
                      setEditingVariant((prev) =>
                        prev ? { ...prev, weight: newWeight } : null
                      );
                    }}
                    placeholder="Enter weight"
                  />
                </div>

                {/* RAN Number */}
                <div className="space-y-2">
                  <Label htmlFor="variantRan">RAN Number</Label>
                  <Input
                    id="variantRan"
                    value={editingVariant.ran_number || ""}
                    onChange={(e) => {
                      const newRan = e.target.value;
                      setEditingVariant((prev) =>
                        prev ? { ...prev, ran_number: newRan } : null
                      );
                    }}
                    placeholder="Enter RAN Number"
                  />
                </div>

                {/* HSN Code */}
                <div className="space-y-2">
                  <Label htmlFor="variantHsn">HSN Code</Label>
                  <Input
                    id="variantHsn"
                    value={editingVariant.hsn_code || ""}
                    onChange={(e) => {
                      const newHsn = e.target.value;
                      setEditingVariant((prev) =>
                        prev ? { ...prev, hsn_code: newHsn } : null
                      );
                    }}
                    placeholder="HSN Code (from vendor)"
                  />
                </div>

                {/* Tax Percentage */}
                <div className="space-y-2">
                  <Label htmlFor="variantTax">Tax %</Label>
                  <Input
                    id="variantTax"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={editingVariant.tax_percentage || ""}
                    onChange={(e) => {
                      const newTax = e.target.value
                        ? parseFloat(e.target.value)
                        : undefined;
                      setEditingVariant((prev) =>
                        prev ? { ...prev, tax_percentage: newTax } : null
                      );
                    }}
                    placeholder="Tax percentage"
                  />
                </div>
              </div>

              {/* Option Values Display */}
              <div className="space-y-2">
                <Label>Option Values</Label>
                <div className="flex flex-wrap gap-2">
                  {(editingVariant.optionValueIds || []).map((valueId) => {
                    const option = options.find((opt) =>
                      opt.values.some((val) => val.id === valueId)
                    );
                    const value = option?.values.find(
                      (val) => val.id === valueId
                    );
                    return (
                      <Badge key={valueId} variant="outline">
                        {option?.name}: {value?.value}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DrawerFooter>
            <Button
              onClick={() => {
                if (editingVariant) {
                  // Update the variant in the form data
                  setFormData((prev) => ({
                    ...prev,
                    variants: prev.variants.map((v) =>
                      v.id === editingVariant.id
                        ? {
                            ...editingVariant,
                            // Update the display title based on custom title
                            title:
                              editingVariant.customTitle ||
                              generateAutoTitle(editingVariant, options),
                          }
                        : v
                    ),
                  }));
                  setVariantDrawerOpen(false);
                  setEditingVariant(null);
                }
              }}
            >
              Save Changes
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Options Change Impact Dialog */}
      <AlertDialog
        open={optionsImpactDialog}
        onOpenChange={setOptionsImpactDialog}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Options Change Impact
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Your changes to product options will affect existing variants:
                </p>

                {optionsImpact && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {(optionsImpact.newCombos || []).length}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            New Combinations
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {(optionsImpact.orphanedVariants || []).length}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Orphaned Variants
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {optionsImpact.titleUpdatesNeeded || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Title Updates
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="text-sm space-y-2">
                      <div>
                        <strong>Change Type:</strong>{" "}
                        {optionsImpact.changeType.replace("_", " ")}
                      </div>

                      {(optionsImpact.newCombos || []).length > 0 && (
                        <div>
                          <strong>New combinations will be created:</strong>
                          <ul className="list-disc pl-6 mt-1">
                            {(optionsImpact.newCombos || [])
                              .slice(0, 3)
                              .map((variant, idx) => (
                                <li key={idx} className="text-muted-foreground">
                                  {(variant.optionValueIds || [])
                                    .map((id) => {
                                      const option = pendingOptionsChange?.find(
                                        (opt) =>
                                          opt.values.some(
                                            (val) => val.id === id
                                          )
                                      );
                                      const value = option?.values.find(
                                        (val) => val.id === id
                                      );
                                      return value?.value;
                                    })
                                    .filter(Boolean)
                                    .join(" / ")}
                                </li>
                              ))}
                            {(optionsImpact.newCombos || []).length > 3 && (
                              <li className="text-muted-foreground">
                                ...and{" "}
                                {(optionsImpact.newCombos || []).length - 3}{" "}
                                more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {(optionsImpact.orphanedVariants || []).length > 0 && (
                        <div>
                          <strong>
                            Orphaned variants (contain removed values):
                          </strong>
                          <ul className="list-disc pl-6 mt-1">
                            {(optionsImpact.orphanedVariants || [])
                              .slice(0, 3)
                              .map((variant, idx) => (
                                <li key={idx} className="text-muted-foreground">
                                  {variant.name}
                                </li>
                              ))}
                            {(optionsImpact.orphanedVariants || []).length >
                              3 && (
                              <li className="text-muted-foreground">
                                ...and{" "}
                                {(optionsImpact.orphanedVariants || []).length -
                                  3}{" "}
                                more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              onClick={() => {
                setOptionsImpactDialog(false);
                setPendingOptionsChange(null);
                setOptionsImpact(null);
              }}
            >
              Cancel
            </AlertDialogCancel>

            <Button
              variant="outline"
              onClick={() => {
                // handleSmartMerge(); // This function is not implemented
              }}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            >
              Smart Merge
            </Button>

            <AlertDialogAction
              onClick={() => {
                // handleRegenerateAll(); // This function is not implemented
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Regenerate All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Option Editor Component
interface OptionEditorProps {
  option: ProductOption;
  optionIndex: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onNameChange: (name: string) => void;
  onAddValue: (value: string) => void;
  onDeleteValue: (valueId: string) => void;
  onDelete: () => void;
  errors: Record<string, string>;
}

function OptionEditor({
  option,
  optionIndex,
  isExpanded,
  onToggleExpanded,
  onNameChange,
  onAddValue,
  onDeleteValue,
  onDelete,
  errors,
}: OptionEditorProps) {
  const [newValue, setNewValue] = useState("");

  const handleAddValue = () => {
    if (newValue.trim()) {
      onAddValue(newValue.trim());
      setNewValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddValue();
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        <Select value={option.name} onValueChange={onNameChange}>
          <SelectTrigger
            className={cn(
              "flex-1",
              errors[`option_${optionIndex}_name`] && "border-destructive"
            )}
          >
            <SelectValue placeholder="Select option type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="color">Color</SelectItem>
            <SelectItem value="size">Size</SelectItem>
            <SelectItem value="weight">Weight</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleExpanded}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {errors[`option_${optionIndex}_name`] && (
        <p className="text-sm text-destructive">
          {errors[`option_${optionIndex}_name`]}
        </p>
      )}

      {isExpanded && (
        <div className="space-y-3 pl-7">
          <div className="flex flex-wrap gap-2">
            {(option.values || []).map((value) => (
              <div key={value.id} className="flex items-center gap-1">
                <Badge variant="secondary" className="px-3 py-1">
                  {value.value}
                  <button
                    type="button"
                    onClick={() => onDeleteValue(value.id)}
                    className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add value (e.g., Small, Red)"
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddValue}
              disabled={!newValue.trim()}
            >
              Add
            </Button>
          </div>

          {errors[`option_${optionIndex}_values`] && (
            <p className="text-sm text-destructive">
              {errors[`option_${optionIndex}_values`]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function NetQtyCell({
  variant,
  onChange,
}: {
  variant: any;
  onChange: (val: string) => void;
}) {
  const [qtyValue, setQtyValue] = useState("");
  const [qtyUnit, setQtyUnit] = useState("pc");

  // Sync local state from variant.net_qty
  useEffect(() => {
    if (variant.net_qty) {
      const match = variant.net_qty.match(/^(\d+(?:\.\d+)?)\s*(\w+)$/);
      if (match) {
        setQtyValue(match[1]);
        setQtyUnit(match[2]);
      } else {
        setQtyValue("");
        setQtyUnit("pc");
      }
    } else {
      setQtyValue("");
      setQtyUnit("pc");
    }
  }, [variant.id]);

  // Update parent when either value or unit changes
  useEffect(() => {
    if (qtyValue) {
      onChange(`${qtyValue} ${qtyUnit}`);
    } else {
      onChange("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qtyValue, qtyUnit]);

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min="0"
        value={qtyValue}
        onChange={(e) => setQtyValue(e.target.value)}
        placeholder="Qty"
        className="w-16 h-8"
      />
      <Select value={qtyUnit} onValueChange={setQtyUnit}>
        <SelectTrigger className="w-20 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pc">pc</SelectItem>
          <SelectItem value="kg">kg</SelectItem>
          <SelectItem value="gms">gms</SelectItem>
          <SelectItem value="ltr">ltr</SelectItem>
          <SelectItem value="ml">ml</SelectItem>
          <SelectItem value="pack">pack</SelectItem>
          <SelectItem value="dozen">dozen</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
