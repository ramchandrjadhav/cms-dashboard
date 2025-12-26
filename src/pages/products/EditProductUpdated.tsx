import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FixedSizeList as List } from "react-window";
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
  Loader2,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GenericSearchableDropdown } from "@/components/ui/generic-searchable-dropdown";
import {
  LevelCategory,
  LevelCategoryDropdown,
} from "@/components/ui/level-category-dropdown";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ApiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import EditProductVariant from "./EditProductVariant";

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  brand: string;
  is_visible: boolean;
  is_published: boolean;
  is_active: boolean;
  collections: string[];
  facilities: string[];
  tags: string[];
  variants: any[];
  //   product_images: {
  //     priority: number;
  //     image: string;
  //     alt_text: string;
  //     is_primary: boolean;
  //   }[];
}

interface CategoryOption {
  id: string;
  label: string;
  value: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export default function EditProductUpdated() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const rejected: boolean | null = searchParams.get("rejected") === "true" ? true : null;
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    category: "",
    brand: "",
    is_visible: true,
    is_published: true,
    is_active: true,
    collections: [],
    facilities: [],
    tags: [],
    variants: [],
    // product_images: [],
  });

  const [selectedImages, setSelectedImages] = useState<
    Array<{
      file: File;
      preview: string;
    }>
  >([]);

  const [selectedCategory, setSelectedCategory] =
    useState<LevelCategory | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<CategoryOption | null>(
    null
  );
  const [collections, setCollections] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [showFacilitiesDropdown, setShowFacilitiesDropdown] = useState(false);

  // Pagination state for brands
  const [brandsPage, setBrandsPage] = useState(1);
  const [hasMoreBrands, setHasMoreBrands] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [brandsSearchTerm, setBrandsSearchTerm] = useState("");

  // Pagination state for facilities
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<any[]>([]);
  const [facilitiesPage, setFacilitiesPage] = useState(1);
  const [hasMoreFacilities, setHasMoreFacilities] = useState(false);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [facilitiesSearchTerm, setFacilitiesSearchTerm] = useState("");

  // Load product data
  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchDropdowns();
    }
  }, [id]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [formData]);

  const fetchProduct = async () => {
    try {
      const product = await ApiService.getProduct(id!, rejected);
      if (product) {
        console.log("Product data:", product);
        console.log("Product collections:", product.collections);

        const collectionsIds =
          product.collections?.map((c: any) => c.id?.toString()) || [];
        console.log("Collections IDs:", collectionsIds);

        const facilitiesIds =
          product.assigned_facilities?.map((f: any) => f.id?.toString()) || [];
        console.log("Facilities IDs:", facilitiesIds);
        
        // Store the full facility objects for selected facilities
        const selectedFacilities = product.assigned_facilities?.map((f: any) => ({
          id: f.id?.toString(),
          label: f.name || f.label || "",
          value: f.id?.toString(),
          name: f.name || f.label || "",
          is_active: f.is_active ?? true,
        })) || [];
        console.log("Selected Facilities:", selectedFacilities);

        setFormData({
          name: product.name || "",
          description: product.description || "",
          category: product.category?.id?.toString() || "",
          brand: product.brand?.id?.toString() || "",
          is_visible: product.is_visible ?? true,
          is_published: product.is_published ?? true,
          is_active: product.is_active ?? true,
          collections: collectionsIds || [],
          facilities: facilitiesIds || [],
          tags: product.tags || [],
          variants: product.variants || [],
          //   product_images: product.product_images || [],
        });
        
        // Set selected facilities for display
        setSelectedFacilities(selectedFacilities);

        // Set selected category and brand
        if (product.category) {
          setSelectedCategory({
            id: product.category.id.toString(),
            name: product.category.name,
          } as LevelCategory);
        }

        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast({
        title: "Error",
        description: "Failed to load product data",
        variant: "destructive",
      });
    }
  };

  // Sync selected dropdown values with formData
  useEffect(() => {
    if (brands.length > 0 && formData.brand) {
      const brandOption = brands.find((brand) => brand.id == formData.brand);
      setSelectedBrand(brandOption || null);
    }
  }, [brands, formData.brand]);

  const fetchDropdowns = async () => {
    try {
      const collectionsRes = await ApiService.getCollections();

      setCollections(
        collectionsRes.map((item: any) => ({
          id: item.id.toString(),
          label: String(item.name || item.label || ""),
          value: item.id.toString(),
          name: String(item.name || item.label || ""),
          is_active: true,
        }))
      );

      // Load first page of brands and facilities
      await Promise.all([loadBrands(1), loadFacilities(1)]);
    } catch (error) {
      console.error("Error fetching dropdowns:", error);
    }
  };

  const loadBrands = async (page: number, searchTerm: string = "") => {
    try {
      setLoadingBrands(true);
      const brandsRes = await ApiService.getBrandsWithPagination(
        page,
        20,
        searchTerm
      );

      const transformedBrands = brandsRes.results.map((item: any) => ({
        id: item.id.toString(),
        label: String(item.name || item.label || ""),
        value: item.id.toString(),
        name: String(item.name || item.label || ""),
        is_active: true,
      }));

      if (page === 1) {
        setBrands(transformedBrands);
      } else {
        setBrands((prev) => [...prev, ...transformedBrands]);
      }

      setHasMoreBrands(brandsRes.next !== null);
      setBrandsPage(page);
    } catch (error) {
      console.error("Error loading brands:", error);
    } finally {
      setLoadingBrands(false);
    }
  };

  const handleLoadMoreBrands = () => {
    if (!loadingBrands && hasMoreBrands) {
      loadBrands(brandsPage + 1, brandsSearchTerm);
    }
  };

  const handleBrandsSearch = (searchTerm: string) => {
    setBrandsSearchTerm(searchTerm);
    setBrandsPage(1);
    loadBrands(1, searchTerm);
  };

  const loadFacilities = async (page: number, searchTerm: string = "") => {
    try {
      setLoadingFacilities(true);
      const facilitiesRes = await ApiService.getFacilitiesWithPagination(
        page,
        20,
        searchTerm
      );

      const transformedFacilities = facilitiesRes.results.map((item: any) => ({
        id: item.id.toString(),
        label: String(item.name || item.label || ""),
        value: item.id.toString(),
        name: String(item.name || item.label || ""),
        is_active: true,
      }));

      if (page === 1) {
        setFacilities(transformedFacilities);
      } else {
        setFacilities((prev) => [...prev, ...transformedFacilities]);
      }

      setHasMoreFacilities(facilitiesRes.next !== null);
      setFacilitiesPage(page);
    } catch (error) {
      console.error("Error loading facilities:", error);
    } finally {
      setLoadingFacilities(false);
    }
  };

  const handleLoadMoreFacilities = () => {
    if (!loadingFacilities && hasMoreFacilities) {
      loadFacilities(facilitiesPage + 1, facilitiesSearchTerm);
    }
  };

  const handleFacilitiesSearch = (searchTerm: string) => {
    setFacilitiesSearchTerm(searchTerm);
    setFacilitiesPage(1);
    loadFacilities(1, searchTerm);
  };

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArr = Array.from(files);
      const newImages = fileArr.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setSelectedImages((prev) => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      return newImages.filter((_, i) => i !== index);
    });
  };

  const makePrimary = (index: number) => {
    setSelectedImages((prev) => {
      const newImages = [...prev];
      const primaryImage = newImages[index];
      newImages.splice(index, 1);
      return [primaryImage, ...newImages];
    });
  };

  const handleCollectionToggle = (collectionId: string) => {
    setFormData((prev) => ({
      ...prev,
      collections: prev.collections.includes(collectionId)
        ? prev.collections.filter((id) => id !== collectionId)
        : [...prev.collections, collectionId],
    }));
  };

  const handleFacilityToggle = (facilityId: string) => {
    setFormData((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facilityId)
        ? prev.facilities.filter((id) => id !== facilityId)
        : [...prev.facilities, facilityId],
    }));
    
    // Also update selectedFacilities for immediate UI update
    if (formData.facilities.includes(facilityId)) {
      // Removing facility
      setSelectedFacilities((prev) => 
        prev.filter((facility) => facility.id !== facilityId)
      );
    } else {
      // Adding facility - find the facility in the facilities array
      const facility = facilities.find((f) => f.id === facilityId);
      if (facility) {
        setSelectedFacilities((prev) => [...prev, facility]);
      }
    }
  };

  const handleRemoveFacility = (facilityId: string) => {
    setFormData((prev) => ({
      ...prev,
      facilities: prev.facilities.filter((id) => id !== facilityId),
    }));
    
    // Also remove from selectedFacilities for immediate UI update
    setSelectedFacilities((prev) => 
      prev.filter((facility) => facility.id !== facilityId)
    );
  };

  const handleSelectAllFacilities = () => {
    const allFacilityIds = facilities.map((facility) => facility.id);
    setFormData((prev) => ({
      ...prev,
      facilities: allFacilityIds,
    }));
  };

  const handleDeselectAllFacilities = () => {
    setFormData((prev) => ({
      ...prev,
      facilities: [],
    }));
  };

  const handleToggleAllFacilities = () => {
    const allSelected =
      formData.facilities.length === facilities.length && facilities.length > 0;
    if (allSelected) {
      handleDeselectAllFacilities();
    } else {
      handleSelectAllFacilities();
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
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
  };

  const handleEditVariant = (variantId: string) => {
    // Navigate to EditProductVariant with productId only
    navigate(`/products/${id}/variants/edit?${rejected ? "rejected=true" : ""}`);
  };

  const handleVariantUpdate = (updatedVariant: any) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((variant) =>
        variant.id === updatedVariant.id ? updatedVariant : variant
      ),
    }));
  };

  const handleCloseVariantEditor = () => {
    setEditingVariantId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Prepare form data for submission
      const submitData = {
        ...formData,
        category: selectedCategory?.id || formData.category,
        brand: selectedBrand?.id || formData.brand,
      };

      await ApiService.updateProduct(id!, submitData, rejected);

      toast({
        title: "Success",
        description: "Product updated successfully",
      });

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Show variant editor if editing
  if (editingVariantId) {
    return (
      <EditProductVariant
        productId={id!}
        variantId={editingVariantId}
        onVariantUpdate={handleVariantUpdate}
        onClose={handleCloseVariantEditor}
      />
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Edit Product"
        description="Update product information and variants"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(rejected ? "/products/rejected" : "/products/list")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Accordion
              type="multiple"
              defaultValue={["general", "images", "variants"]}
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
                      <div className="grid gap-4 mb-3">
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
                      </div>
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
                        {formData.variants.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {formData.variants.length > 0 ? (
                          <List
                            height={600}
                            itemCount={formData.variants.length}
                            itemSize={100}
                            width="100%"
                          >
                            {({ index, style }) => {
                              const variant = formData.variants[index];
                              return (
                                <div style={style} className="px-2 py-1">
                                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
                                    <div className="flex-1">
                                      <div className="font-medium">
                                        {variant.name}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {variant.color && `Color: ${variant.color}`}
                                        {variant.size && ` | Size: ${variant.size}`}
                                        {variant.weight &&
                                          ` | Weight: ${variant.weight}kg`}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        Buying Price: ₹{variant.base_price} | MRP: ₹
                                        {variant.mrp} | Stock:{" "}
                                        {variant.stock_quantity}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant={
                                          variant.is_active
                                            ? "default"
                                            : "secondary"
                                        }
                                      >
                                        {variant.is_active ? "Active" : "Inactive"}
                                      </Badge>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleEditVariant(variant.id!)
                                        }
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                          </List>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No variants found. Add variants to manage different
                            product options.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            </Accordion>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Organisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <p className="text-sm text-destructive">{errors.category}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <GenericSearchableDropdown
                  options={brands}
                  value={selectedBrand}
                  onValueChange={(value) => {
                    const brandOption = Array.isArray(value) ? value[0] : value;
                    setSelectedBrand(brandOption as CategoryOption | null);
                    handleInputChange("brand", brandOption?.id || "");
                  }}
                  placeholder="Select brand"
                  searchPlaceholder="Search brands..."
                  searchFields={["label", "name"]}
                  displayField="label"
                  emptyMessage="No brands found."
                  triggerClassName={errors.brand ? "border-destructive" : ""}
                  hasMore={hasMoreBrands}
                  isLoading={loadingBrands}
                  onLoadMore={handleLoadMoreBrands}
                  enableBackendSearch={true}
                  onSearch={handleBrandsSearch}
                />
                {errors.brand && (
                  <p className="text-sm text-destructive">{errors.brand}</p>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="tags">Tags</Label>
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="featured">Visible</Label>
                <Select
                  value={formData.is_visible ? "true" : "false"}
                  onValueChange={(value) =>
                    handleInputChange("is_visible", value === "true")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Visible</SelectItem>
                    <SelectItem value="false">Not Visible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="featured">Published</Label>
                <Select
                  value={formData.is_published ? "true" : "false"}
                  onValueChange={(value) =>
                    handleInputChange("is_published", value === "true")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Published</SelectItem>
                    <SelectItem value="false">Not Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Facilities
                <Badge variant="outline">{formData.facilities.length}</Badge>
              </CardTitle>
              <CardDescription>Add this product to facilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Popover
                  open={showFacilitiesDropdown}
                  onOpenChange={setShowFacilitiesDropdown}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={showFacilitiesDropdown}
                      className="w-full justify-between"
                    >
                      Select facilities...
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-1"
                    align="start"
                  >
                    <Command className="max-h-60">
                      <CommandInput
                        placeholder="Search facilities..."
                        onValueChange={(search) => {
                          if (search !== facilitiesSearchTerm) {
                            handleFacilitiesSearch(search);
                          }
                        }}
                      />
                      <CommandList
                        onScroll={(e: React.UIEvent<HTMLDivElement>) => {
                          const target = e.currentTarget;
                          const scrollPercentage =
                            (target.scrollTop /
                              (target.scrollHeight - target.clientHeight)) *
                            100;
                          if (
                            scrollPercentage > 80 &&
                            hasMoreFacilities &&
                            !loadingFacilities
                          ) {
                            handleLoadMoreFacilities();
                          }
                        }}
                      >
                        <CommandEmpty>No facilities found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            key="facilities-all"
                            onSelect={() => handleToggleAllFacilities()}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              checked={
                                formData.facilities.length ===
                                facilities.length && facilities.length > 0
                              }
                              onChange={() => handleToggleAllFacilities()}
                              className="mr-2"
                            />
                            <span>All</span>
                          </CommandItem>
                          {facilities.map((facility) => (
                            <CommandItem
                              key={facility.id}
                              onSelect={() => handleFacilityToggle(facility.id)}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                checked={formData.facilities.includes(
                                  facility.id
                                )}
                                onChange={() =>
                                  handleFacilityToggle(facility.id)
                                }
                                className="mr-2"
                              />
                              <span>{facility.label}</span>
                              {facility.description && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  {facility.description}
                                </span>
                              )}
                            </CommandItem>
                          ))}
                          {loadingFacilities && (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="ml-2 text-sm text-muted-foreground">
                                Loading more...
                              </span>
                            </div>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

                {selectedFacilities.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Selected Facilities ({selectedFacilities.length})
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedFacilities.map((facility) => (
                        <Badge
                          key={facility.id}
                          variant="secondary"
                          className="px-3 py-1 flex items-center gap-1"
                        >
                          {facility.label}
                          <button
                            type="button"
                            onClick={() => handleRemoveFacility(facility.id)}
                            className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
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
