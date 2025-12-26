import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Plus,
  Package,
  GripVertical,
  Trash2,
  Upload,
  Settings,
  X,
  ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ApiService } from "@/services/api";
import { ProductPicker } from "@/components/ProductPicker";
import { Input } from "@/components/ui/input";
import type { Product } from "@/types";
import { DatePicker } from "@/components/ui/date-picker";

// interface Product {
//   id: string | number;
//   name: string;
// }

interface Facility {
  id: number;
  name: string;
  facility_type: string;
  city: string;
  state: string;
  country: string;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  image: File | string;
  products: Product[];
  facilities: string[]; // Keep as string[] for form state, will be converted to IDs when saving
  start_date: string;
  end_date: string;

}

interface CategoryOption {
  id: string;
  label: string;
  value: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export default function CreateEditCollection() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  // Minimal form state for new collection
  const [collection, setCollection] = useState<Collection>({
    id: "",
    name: "",
    description: "",
    image: "",
    products: [],
    facilities: [],
    start_date: "",
    end_date: "",
  });
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [facilities, setFacilities] = useState<CategoryOption[]>([]);
  const [showFacilitiesDropdown, setShowFacilitiesDropdown] = useState(false);

  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [collection]);

  // Fetch facilities on component mount
  useEffect(() => {
    async function fetchFacilities() {
      try {
        const facilitiesData = await ApiService.getFacilitiesWithPagination(
          1,
          1000
        );
        const transformedFacilities: CategoryOption[] =
          facilitiesData?.results.map((facility: any) => ({
            id: facility.id.toString(),
            label: facility.name,
            value: facility.name.toLowerCase().replace(/\s+/g, "-"),
            name: facility.name,
            description: facility.description,
            start_date: facility.start_date,
            end_date: facility.end_date,
            is_active: facility.is_active,
          }));
        setFacilities(transformedFacilities);
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to fetch facilities.",
          variant: "destructive",
        });
      }
    }
    fetchFacilities();
  }, []);

  // Fetch collection data when editing
  useEffect(() => {
    async function fetchCollection() {
      if (isEditing && id) {
        try {
          const collectionData = await ApiService.getCollection(id);
          setCollection({
            id: collectionData.id.toString(),
            name: collectionData.name,
            description: collectionData.description || "",
            image: collectionData.image || "",
            products: collectionData.products || [],
            facilities: collectionData.facilities
              ? collectionData.facilities.map((f: Facility) => f.id.toString())
              : [],
            start_date: collectionData.start_date || "",
            end_date: collectionData.end_date || "",
          });
        } catch (err) {
          toast({
            title: "Error",
            description: "Failed to fetch collection data.",
            variant: "destructive",
          });
          navigate("/collections/list");
        }
      }
    }
    fetchCollection();
  }, [isEditing, id, navigate]);

  // Handle image file selection and upload
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);
    setImageLoadError(false);
    try {
      const uploadRes = await ApiService.uploadImages([file]);
      console.log("Upload response:", uploadRes); // Debug log

      // Store just the file path, not the full URL
      const filePath = uploadRes[0].file_path;

      console.log("Stored file path:", filePath); // Debug log

      setCollection((prev) => ({ ...prev, image: filePath }));
      toast({
        title: "Image Uploaded",
        description: "Image has been uploaded successfully.",
      });
    } catch (err) {
      console.error("Image upload error:", err); // Debug log
      toast({
        title: "Image Upload Failed",
        description: "Could not upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Get image preview
  const getImagePreview = () => {
    if (!collection.image) return "";

    if (
      typeof collection.image === "string" &&
      collection.image.startsWith("http")
    ) {
      return collection.image;
    }

    if (typeof collection.image === "string") {
      const AWS_S3_BASE_URL = import.meta.env.VITE_AWS_S3_BASE_URL;
      console.log("AWS_S3_BASE_URL", AWS_S3_BASE_URL);
      console.log("collection.image", collection.image);
      return `${AWS_S3_BASE_URL}${collection.image}`;
    }

    if (collection.image instanceof File) {
      return URL.createObjectURL(collection.image);
    }

    return "";
  };

  const handleSave = async () => {
    if (!collection.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Collection name is required.",
        variant: "destructive",
      });
      return;
    }
    if (!collection.image) {
      toast({
        title: "Validation Error",
        description: "Collection image is required.",
        variant: "destructive",
      });
      return;
    }
    // Validate dates: if both provided, end should be >= start
    if (collection.start_date && collection.end_date) {
      const start = new Date(collection.start_date).getTime();
      const end = new Date(collection.end_date).getTime();
      if (!isNaN(start) && !isNaN(end) && end < start) {
        toast({
          title: "Invalid Dates",
          description: "End date must be on or after start date.",
          variant: "destructive",
        });
        return;
      }
    }
    setLoading(true);
    try {
      const payload = {
        name: collection.name,
        description: collection.description,
        image: collection.image,
        products: collection.products.map((p) => p.id),
        facilities: collection.facilities,
        start_date: collection.start_date || undefined,
        end_date: collection.end_date || undefined,
      };

      if (isEditing) {
        await ApiService.updateCollection(collection.id, payload);
        toast({
          title: "Collection Updated",
          description: "Collection has been updated successfully.",
        });
      } else {
        await ApiService.createCollection(payload);
        toast({
          title: "Collection Created",
          description: "Collection has been created successfully.",
        });
      }
      navigate("/collections/list");
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} collection.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProducts = () => {
    setCollection((prev) => ({
      ...prev,
      products: [...prev.products, ...selectedProducts],
    }));
    setSelectedProducts([]);
    setShowProductPicker(false);
    toast({
      title: "Products Added",
      description: `${selectedProducts.length} products added to collection.`,
    });
  };

  const handleRemoveProduct = (productId: number | string) => {
    setCollection((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== productId),
    }));
    toast({
      title: "Product Removed",
      description: "Product has been removed from collection.",
    });
  };

  const handleMoveProduct = (
    productId: number | string,
    direction: "up" | "down"
  ) => {
    setCollection((prev) => {
      const products = [...prev.products];
      const index = products.findIndex((p) => p.id === productId);

      if (index === -1) return prev;

      const newIndex = direction === "up" ? index - 1 : index + 1;

      if (newIndex < 0 || newIndex >= products.length) return prev;

      [products[index], products[newIndex]] = [
        products[newIndex],
        products[index],
      ];

      // Update order values
      products.forEach((p, i) => {
        p.id = i + 1; // Assuming id is the order
      });

      return { ...prev, products };
    });
  };

  // Facilities selection handlers
  const handleFacilityToggle = (facilityId: string) => {
    setCollection((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facilityId)
        ? prev.facilities.filter((id) => id !== facilityId)
        : [...prev.facilities, facilityId],
    }));
  };

  const handleRemoveFacility = (facilityId: string) => {
    setCollection((prev) => ({
      ...prev,
      facilities: prev.facilities.filter((id) => id !== facilityId),
    }));
  };

  const handleSelectAllFacilities = () => {
    const allFacilityIds = facilities.map((facility) => facility.id);
    setCollection((prev) => ({
      ...prev,
      facilities: allFacilityIds,
    }));
  };

  const handleDeselectAllFacilities = () => {
    setCollection((prev) => ({
      ...prev,
      facilities: [],
    }));
  };

  const handleToggleAllFacilities = () => {
    const allSelected =
      collection.facilities.length === facilities.length &&
      facilities.length > 0;
    if (allSelected) {
      handleDeselectAllFacilities();
    } else {
      handleSelectAllFacilities();
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={isEditing ? "Edit Collection" : "Create Collection"}
        description={
          isEditing
            ? `Edit ${collection.name}`
            : "Create a new product collection"
        }
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
                navigate("/collections/list");
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Collections
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                ? "Update Collection"
                : "Create Collection"}
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
                          <Label htmlFor="name">Collection Name *</Label>
                          <Input
                            id="name"
                            value={collection.name}
                            onChange={(e) =>
                              setCollection((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            placeholder="Enter collection name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={collection.description}
                            onChange={(e) =>
                              setCollection((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Enter collection description"
                            rows={4}
                          />
                        </div>

                    

                        <div className="space-y-2">
                          <Label htmlFor="image">Collection Image</Label>
                          <div className="relative">
                            <Input
                              id="image"
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              disabled={isUploadingImage}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors bg-gray-50 hover:bg-gray-100">
                              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                              <p className="text-lg font-medium text-gray-700 mb-2">
                                {isUploadingImage ? "Uploading..." : "Choose File"}
                              </p>
                              <p className="text-sm text-gray-500">
                                Click to upload or drag and drop
                              </p>
                            </div>
                          </div>
                          {isUploadingImage && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                              <Upload className="h-4 w-4 animate-spin" />
                              Uploading image...
                            </div>
                          )}
                          {collection.image && (
                            <div className="mt-4 relative inline-block">
                              <img
                                src={getImagePreview()}
                                alt="Collection Preview"
                                className="w-32 h-32 object-cover rounded-md border"
                                onError={() => {
                                  console.error(
                                    "Image failed to load:",
                                    getImagePreview()
                                  );
                                  setImageLoadError(true);
                                }}
                                onLoad={() => {
                                  console.log(
                                    "Image loaded successfully:",
                                    getImagePreview()
                                  );
                                  setImageLoadError(false);
                                }}
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => setCollection((prev) => ({ ...prev, image: "" }))}
                                className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                                title="Remove Image"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          {imageLoadError && (
                            <div className="text-sm text-destructive">
                              Failed to load image
                            </div>
                          )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <DatePicker
                              value={collection.start_date}
                              onChange={(val) =>
                                setCollection((prev) => ({
                                  ...prev,
                                  start_date: val || "",
                                }))
                              }
                              placeholder="Select start date"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <DatePicker
                              value={collection.end_date}
                              onChange={(val) =>
                                setCollection((prev) => ({
                                  ...prev,
                                  end_date: val || "",
                                }))
                              }
                              placeholder="Select end date"
                              error={
                                Boolean(
                                  collection.start_date &&
                                    collection.end_date &&
                                    new Date(collection.start_date).getTime() <
                                      new Date(collection.end_date).getTime()
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Products */}
            <AccordionItem value="products">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    <span className="font-semibold">Products</span>
                    <Badge variant="secondary">
                      {collection.products.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Add and manage products in this collection
                        </p>
                        <Button onClick={() => setShowProductPicker(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Products
                        </Button>
                      </div>

                      {collection.products.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No products in this collection yet.</p>
                          <p className="text-sm">
                            Click "Add Products" to get started.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {collection.products.map((p, index) => (
                            <div
                              key={p.id}
                              className="flex items-center gap-4 p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                {/* <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" /> */}
                                <span className="text-sm text-muted-foreground">
                                  #{index + 1}
                                </span>
                              </div>

                              {/* {p.image && ( // This field is removed
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              )} */}

                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium">{p.name}</h4>
                                {/* {p.sku && <p className="text-sm text-muted-foreground">{p.sku}</p>} */}
                              </div>

                              {/* {p.category && <Badge variant="outline">{p.category}</Badge>} */}
                              {/* {p.price && <span className="text-sm font-medium">${p.price}</span>} */}

                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMoveProduct(p.id, "up")}
                                  disabled={index === 0}
                                >
                                  ↑
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleMoveProduct(p.id, "down")
                                  }
                                  disabled={
                                    index === collection.products.length - 1
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
                                        Remove Product
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove "
                                        {p.name}" from this collection?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          handleRemoveProduct(p.id)
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
              <CardTitle>Collection Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Products</Label>
                <p className="text-2xl font-bold">
                  {collection.products.length}
                </p>
              </div>

              {/* {collection.startDate && collection.endDate && ( // This field is removed
                <div>
                  <Label className="text-sm font-medium">Duration</Label>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(collection.startDate).toLocaleDateString()} - {new Date(collection.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              )} */}
            </CardContent>
          </Card>

          {/* Facilities Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Facilities
                <Badge variant="outline">{collection.facilities.length}</Badge>
              </CardTitle>
              <CardDescription>
                Assign this collection to facilities
              </CardDescription>
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
                      <CommandInput placeholder="Search facilities..." />
                      <CommandList>
                        <CommandEmpty>No facilities found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            key="facilities-all"
                            onSelect={() => handleToggleAllFacilities()}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              checked={
                                collection.facilities.length ===
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
                                checked={collection.facilities.includes(
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
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {collection.facilities.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Selected Facilities
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {collection.facilities.map((facilityId) => {
                      const facility = facilities.find(
                        (f) => f.id === facilityId
                      );
                      return facility ? (
                        <Badge
                          key={facilityId}
                          variant="secondary"
                          className="px-3 py-1 flex items-center gap-1"
                        >
                          {facility.label}
                          <button
                            type="button"
                            onClick={() => handleRemoveFacility(facilityId)}
                            className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Picker Dialog */}
      <ProductPicker
        open={showProductPicker}
        onOpenChange={setShowProductPicker}
        title="Add Products to Collection"
        description="Search and select products to add to your collection"
        assignedProducts={collection.products}
        selectedProducts={selectedProducts}
        onSelectionChange={setSelectedProducts}
        onConfirm={handleAddProducts}
        onCancel={() => setSelectedProducts([])}
        loading={loading}
        confirmText="Add Products"
        cancelText="Cancel"
        searchPlaceholder="Search products by name or SKU..."
      />
    </div>
  );
}
