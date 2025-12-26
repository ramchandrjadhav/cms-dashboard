import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Edit,
  Plus,
  Trash2,
  GripVertical,
  Package,
  Upload,
  Settings,
  X,
  ChevronDown,
  Grid,
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
import { useAuth } from "@/context/AuthContext";
import { ApiService } from "@/services/api";
import { ProductPicker } from "@/components/ProductPicker";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import type { Product } from "@/types";

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
  image?: string;
  products: Product[];
  facilities: Facility[];
  start_date: string;
  end_date: string;
  creation_date: string;
  updation_date: string;
}

interface CategoryOption {
  id: string;
  label: string;
  value: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export default function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const canEditCollection = () => {
    return hasRole("master");
  };

  const [collection, setCollection] = useState<Collection | null>(null);
  const [editedCollection, setEditedCollection] = useState<Collection | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [facilities, setFacilities] = useState<CategoryOption[]>([]);
  const [showFacilitiesDropdown, setShowFacilitiesDropdown] = useState(false);
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);

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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    ApiService.getCollection(id)
      .then((collectionData) => {
        // Ensure facilities array exists
        const collectionWithFacilities = {
          ...collectionData,
          facilities: collectionData.facilities || [],
        };
        setCollection(collectionWithFacilities);
        setEditedCollection(collectionWithFacilities);
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to fetch collection details.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!collection || !editedCollection) return;
    const isChanged =
      JSON.stringify(collection) !== JSON.stringify(editedCollection);
    setHasUnsavedChanges(isChanged);
  }, [collection, editedCollection]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const uploadRes = await ApiService.uploadImages([file]);
      // Store just the file path, not the full URL
      const filePath = uploadRes[0].file_path;
      console.log("Filepath", filePath);
      setEditedCollection((prev) => ({ ...prev!, image: filePath }));
      toast({
        title: "Image Uploaded",
        description: "Image has been uploaded successfully.",
      });
    } catch (err) {
      toast({
        title: "Image Upload Failed",
        description: "Could not upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const getImagePreview = () => {
    if (!editedCollection?.image) return "";

    if (
      typeof editedCollection.image === "string" &&
      editedCollection.image.startsWith("http")
    ) {
      console.log("Filepath", editedCollection.image);

      return editedCollection.image;
    }

    if (typeof editedCollection.image === "string") {
      const AWS_S3_BASE_URL = import.meta.env.VITE_AWS_S3_BASE_URL;
      console.log("AWS_S3_BASE_URL", AWS_S3_BASE_URL);
      console.log("editedCollection.image", editedCollection.image);
      return `${AWS_S3_BASE_URL}${editedCollection.image}`;
    }

    return "";
  };

  const handleEdit = () => {
    if (!collection) return;
    if (!canEditCollection()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit collections.",
        variant: "destructive",
      });
      return;
    }
    setEditedCollection({ ...collection });
    // Initialize selected facility IDs with existing facilities
    setSelectedFacilityIds(collection.facilities.map((f) => f.id.toString()));
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editedCollection) return;
    if (!editedCollection.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Collection name is required.",
        variant: "destructive",
      });
      return;
    }
    // Validate dates: if both provided, end should be >= start
    if (editedCollection.start_date && editedCollection.end_date) {
      const start = new Date(editedCollection.start_date).getTime();
      const end = new Date(editedCollection.end_date).getTime();
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
      // Convert selected facility IDs to facility objects for the payload
      const selectedFacilities = selectedFacilityIds
        .map((facilityId) => {
          const facility = facilities.find((f) => f.id === facilityId);
          return facility
            ? {
                id: parseInt(facilityId),
                name: facility.name,
                facility_type: "store", // Default type
                city: "Unknown",
                state: "Unknown",
                country: "Unknown",
              }
            : null;
        })
        .filter(Boolean);

      const payload = {
        name: editedCollection.name,
        description: editedCollection.description,
        image: editedCollection.image,
        products: editedCollection.products.map((p) => p.id),
        facilities: selectedFacilityIds, // Send IDs to API
        start_date: editedCollection.start_date,
        end_date: editedCollection.end_date,
      };
      await ApiService.updateCollection(editedCollection.id, payload);
      const refreshedCollection = await ApiService.getCollection(
        editedCollection.id
      );
      setCollection(refreshedCollection);
      setEditedCollection(refreshedCollection);
      setIsEditing(false);
      setHasUnsavedChanges(false);
      toast({
        title: "Collection Updated",
        description: "Collection details have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update collection.",
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
    if (!collection) return;
    setEditedCollection({ ...collection });
    setSelectedFacilityIds(collection.facilities.map((f) => f.id.toString()));
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  const handleAddProducts = () => {
    if (!editedCollection) return;
    setEditedCollection((prev) => ({
      ...prev!,
      products: [...(prev?.products || []), ...selectedProducts],
    }));
    setSelectedProducts([]);
    setShowProductPicker(false);
    toast({
      title: "Products Added",
      description: `${selectedProducts.length} products added to collection.`,
    });
  };

  const handleRemoveProduct = (productId: string | number) => {
    setEditedCollection((prev) => ({
      ...prev!,
      products: (prev?.products || []).filter((p) => p.id !== productId),
    }));
    toast({
      title: "Product Removed",
      description: "Product has been removed from collection.",
    });
  };

  // Facilities selection handlers
  const handleFacilityToggle = (facilityId: string) => {
    setSelectedFacilityIds((prev) =>
      prev.includes(facilityId)
        ? prev.filter((id) => id !== facilityId)
        : [...prev, facilityId]
    );
  };

  const handleRemoveFacility = (facilityId: string) => {
    setSelectedFacilityIds((prev) => prev.filter((id) => id !== facilityId));
  };

  const handleSelectAllFacilities = () => {
    const allFacilityIds = facilities.map((facility) => facility.id);
    setSelectedFacilityIds(allFacilityIds);
  };

  const handleDeselectAllFacilities = () => {
    setSelectedFacilityIds([]);
  };

  const handleToggleAllFacilities = () => {
    const allSelected =
      selectedFacilityIds.length === facilities.length && facilities.length > 0;
    if (allSelected) {
      handleDeselectAllFacilities();
    } else {
      handleSelectAllFacilities();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading collection details...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={editedCollection?.name || "Collection"}
        description={editedCollection?.description || ""}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/collections/list")}
            >
              {" "}
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Collections{" "}
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
              canEditCollection() && (
                <Button onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Collection
                </Button>
              )
            )}
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Accordion
            type="multiple"
            defaultValue={["basic", "products"]}
            className="space-y-4"
          >
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
                          <Label htmlFor="name">Collection Name</Label>
                          {isEditing ? (
                            <Input
                              id="name"
                              value={editedCollection?.name || ""}
                              onChange={(e) =>
                                setEditedCollection((prev) => ({
                                  ...prev!,
                                  name: e.target.value,
                                }))
                              }
                              placeholder="Enter collection name"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {collection?.name}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          {isEditing ? (
                            <Textarea
                              id="description"
                              value={editedCollection?.description || ""}
                              onChange={(e) =>
                                setEditedCollection((prev) => ({
                                  ...prev!,
                                  description: e.target.value,
                                }))
                              }
                              placeholder="Enter collection description"
                              rows={4}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {collection?.description}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Collection Image</Label>
                          {isEditing ? (
                            <div className="mt-2">
                              <div className="relative">
                                <Input
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
                              {editedCollection?.image && (
                                <div className="mt-4">
                                  <img
                                    src={getImagePreview()}
                                    alt="Collection Preview"
                                    className="w-32 h-32 object-cover rounded-md border"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2">
                              {collection?.image ? (
                                <img
                                  src={getImagePreview()}
                                  alt={editedCollection?.name}
                                  className="w-32 h-32 object-cover rounded-md border"
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  No image uploaded
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            {isEditing ? (
                              <DatePicker
                                value={editedCollection?.start_date || ""}
                                onChange={(val) =>
                                  setEditedCollection((prev) => ({
                                    ...prev,
                                    start_date: val || "",
                                  }))
                                }
                                placeholder="Select start date"
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {collection?.start_date
                                  ? new Date(collection.start_date).toLocaleDateString()
                                  : "-"}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            {isEditing ? (
                              <DatePicker
                                value={editedCollection?.end_date || ""}
                                onChange={(val) =>
                                  setEditedCollection((prev) => ({
                                    ...prev,
                                    end_date: val || "",
                                  }))
                                }
                                placeholder="Select end date"
                                error={
                                  Boolean(
                                    editedCollection?.start_date &&
                                      editedCollection?.end_date &&
                                      new Date(editedCollection.end_date).getTime() <
                                        new Date(editedCollection.start_date).getTime()
                                  )
                                }
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {collection?.end_date
                                  ? new Date(collection.end_date).toLocaleDateString()
                                  : "-"}
                              </p>
                            )}
                          </div>
                        {/* <div className="space-y-2">
                          <Label>Created At</Label>
                          <p className="text-sm text-muted-foreground">
                            {collection?.creation_date
                              ? new Date(
                                  collection.creation_date
                                ).toLocaleString()
                              : "-"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Last Updated</Label>
                          <p className="text-sm text-muted-foreground">
                            {collection?.updation_date
                              ? new Date(
                                  collection.updation_date
                                ).toLocaleString()
                              : "-"}
                          </p>
                        </div> */}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
            <AccordionItem value="products">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    <span className="font-semibold">Products</span>
                    <Badge variant="secondary">
                      {editedCollection?.products.length || 0}
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

                        {isEditing && canEditCollection() && (
                          <Button onClick={() => setShowProductPicker(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Products
                          </Button>
                        )}
                      </div>
                      {editedCollection?.products.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No products in this collection yet.</p>
                          <p className="text-sm">
                            Click "Add Products" to get started.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {editedCollection?.products.map((p, index) => (
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
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium">{p.name}</h4>
                              </div>
                              {isEditing && canEditCollection() && (
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
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Collection Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Products</Label>
                <p className="text-2xl font-bold">
                  {editedCollection?.products.length || 0}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Created At</Label>
                <p className="text-sm text-muted-foreground">
                  {collection?.creation_date
                    ? new Date(collection.creation_date).toLocaleString()
                    : "-"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Last Updated</Label>
                <p className="text-sm text-muted-foreground">
                  {collection?.updation_date
                    ? new Date(collection.updation_date).toLocaleString()
                    : "-"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Facilities Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Facilities
                <Badge variant="outline">
                  {editedCollection?.facilities.length || 0}
                </Badge>
              </CardTitle>
              <CardDescription>
                Facilities assigned to this collection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
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
                                    selectedFacilityIds.length ===
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
                                  onSelect={() =>
                                    handleFacilityToggle(facility.id)
                                  }
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    checked={selectedFacilityIds.includes(
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

                  {selectedFacilityIds.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Selected Facilities
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedFacilityIds.map((facilityId) => {
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
                </div>
              ) : // Display mode
              editedCollection?.facilities &&
                editedCollection.facilities.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {editedCollection.facilities.map((facility) => (
                      <Badge
                        key={facility.id}
                        variant="secondary"
                        className="px-3 py-1"
                      >
                        {facility.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No facilities assigned</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ProductPicker
        open={showProductPicker}
        onOpenChange={setShowProductPicker}
        title="Add Products to Collection"
        description="Search and select products to add to your collection"
        assignedProducts={editedCollection?.products || []}
        selectedProducts={selectedProducts}
        onSelectionChange={setSelectedProducts}
        onConfirm={handleAddProducts}
        onCancel={() => setSelectedProducts([])}
        loading={loading}
        confirmText="Add Products"
        cancelText="Cancel"
        searchPlaceholder="Search products by name..."
      />
    </div>
  );
}
