import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Package,
  Plus,
  Trash2,
  GripVertical,
  Settings,
  MapPin,
  Upload,
  Copy,
  FileText,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ApiService } from "@/services/api";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import type { Facility, User } from "@/types";
import {
  GenericSearchableDropdown,
  SearchableOption,
} from "@/components/ui/generic-searchable-dropdown";
import MapView from "@/components/MapView";
import { ProductVariantPicker } from "@/components/ProductVariantPicker";

export default function FacilityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const canEditFacility = () => {
    return hasRole("master");
  };
  const [facility, setFacility] = useState<Facility | null>(null);
  const [editedFacility, setEditedFacility] = useState<Facility | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [assignedProducts, setAssignedProducts] = useState([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [managers, setManagers] = useState<User[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<SearchableOption[]>(
    []
  );
  const [coordinatePairs, setCoordinatePairs] = useState<
    { lat: number; lon: number }[]
  >([]);
  const [coordinateRowErrors, setCoordinateRowErrors] = useState<string[]>([]);
  const [showCoordinateImportDialog, setShowCoordinateImportDialog] =
    useState(false);
  const [coordinateInput, setCoordinateInput] = useState("");
  const [kmlFile, setKmlFile] = useState<File | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    ApiService.getFacility(id)
      .then((data) => {
        setFacility(data);
        setEditedFacility(data);
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to fetch facility details.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
    ApiService.getUsers()
      .then((usersData: User[]) => {
        setManagers(
          usersData.filter((u) => u.role === "manager" || u.role === "master")
        );
      })
      .catch((error) => {
        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: "Failed to fetch users",
          variant: "destructive",
        });
      });

    ApiService.getFacilityInventoryByFacilityId(id)
      .then((products) => setAssignedProducts(products))
      .catch((error) => {
        console.error("Error fetching facility inventory:", error);
        toast({
          title: "Error",
          description: "Failed to fetch facility inventory",
          variant: "destructive",
        });
      });
  }, [id]);

  useEffect(() => {
    if (!facility || !editedFacility) return;
    const isChanged =
      JSON.stringify(facility) !== JSON.stringify(editedFacility);
    setHasUnsavedChanges(isChanged);
  }, [facility, editedFacility]);

  useEffect(() => {
    if (
      managers.length > 0 &&
      editedFacility?.managers &&
      editedFacility.managers.length > 0
    ) {
      const managerOptions = managers
        .filter((m) => editedFacility.managers.includes(m.id))
        .map((m) => ({
          id: m.id,
          label: `${m.first_name} ${m.last_name} (${m.username})`,
          value: m.id,
          ...m,
        }));
      setSelectedManagers(managerOptions);
    }
  }, [managers, editedFacility?.managers]);

  useEffect(() => {
    if (facility?.servicable_area) {
      let servicableAreaArray: number[] = [];
      if (typeof facility.servicable_area === "string") {
        try {
          const cleanString = facility.servicable_area.replace(/[\[\]]/g, "");
          servicableAreaArray = cleanString
            .split(",")
            .map((coord) => parseFloat(coord.trim()))
            .filter((coord) => !isNaN(coord));
        } catch (error) {
          console.error("Error parsing servicable_area string:", error);
          servicableAreaArray = [];
        }
      } else if (Array.isArray(facility.servicable_area)) {
        servicableAreaArray = facility.servicable_area;
      }

      const pairs = [];
      for (let i = 0; i < servicableAreaArray.length; i += 2) {
        pairs.push({
          lat: servicableAreaArray[i] || 0,
          lon: servicableAreaArray[i + 1] || 0,
        });
      }
      setCoordinatePairs(pairs.length > 0 ? pairs : [{ lat: 0, lon: 0 }]);
      setCoordinateRowErrors(
        new Array(pairs.length > 0 ? pairs.length : 1).fill("")
      );
    } else {
      setCoordinatePairs([{ lat: 0, lon: 0 }]);
      setCoordinateRowErrors([""]);
    }
  }, [facility]);

  useEffect(() => {
    if (!editedFacility) return;
    const servicableArea = coordinatePairs.flatMap((pair) => [
      pair.lat,
      pair.lon,
    ]);
    setEditedFacility((prev) => ({
      ...prev!,
      servicable_area: `[${servicableArea.join(",")}]`,
    }));
  }, [coordinatePairs]);

  const handleEdit = () => {
    if (!facility) return;
    if (!canEditFacility()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit facilities.",
        variant: "destructive",
      });
      return;
    }
    setEditedFacility({ ...facility });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editedFacility) return;
    
    // Validate email if provided
    const newErrors: Record<string, string> = {};
    if (editedFacility.email && editedFacility.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editedFacility.email.trim())) {
        newErrors.email = "Please enter a valid email address";
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const servicableAreaString = Array.isArray(editedFacility.servicable_area)
        ? `[${editedFacility.servicable_area.join(",")}]`
        : editedFacility.servicable_area;

      const payload = {
        name: editedFacility.name,
        facility_type: editedFacility.facility_type,
        address: editedFacility.address,
        city: editedFacility.city,
        state: editedFacility.state,
        country: editedFacility.country,
        pincode: editedFacility.pincode,
        latitude: editedFacility.latitude,
        longitude: editedFacility.longitude,
        servicable_area: servicableAreaString,
        is_active: editedFacility.is_active,
        managers: editedFacility.managers,
        email: editedFacility.email,
        phone_number: editedFacility.phone_number,
        customer_care: editedFacility.customer_care,
        cin_no: editedFacility.cin_no,
        gstn_no: editedFacility.gstn_no,
        fssai_no: editedFacility.fssai_no,
      };
      const updated = await ApiService.updateFacility(
        editedFacility.id,
        payload
      );
      setFacility(updated);
      setEditedFacility(updated);
      setIsEditing(false);
      setHasUnsavedChanges(false);
      toast({
        title: "Facility Updated",
        description: "Facility details have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update facility.",
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
    if (!facility) return;
    setEditedFacility({ ...facility });
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  const handleLocationSelect = (location: {
    city: string;
    state: string;
    country: string;
    pincode: string;
    latitude: number;
    longitude: number;
    formattedAddress: string;
  }) => {
    if (!editedFacility) return;
    setEditedFacility((prev) => {
      const updatedData = {
        ...prev!,
        city: location.city,
        state: location.state,
        country: location.country,
        pincode: location.pincode,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.formattedAddress,
      };
      return updatedData;
    });
  };

  const handleMapLocationSelect = (addressData: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  }) => {
    if (!editedFacility) return;
    setEditedFacility((prev) => {
      const updatedData = {
        ...prev!,
        city: addressData.city || prev!.city,
        state: addressData.state || prev!.state,
        country: addressData.country || prev!.country,
        pincode: addressData.pincode || prev!.pincode,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        address: addressData.formattedAddress,
      };
      return updatedData;
    });
  };

  const validateCoordinateRow = (pair: {
    lat: number;
    lon: number;
  }): string => {
    if (
      pair.lat === undefined ||
      pair.lon === undefined ||
      pair.lat === null ||
      pair.lon === null ||
      isNaN(pair.lat) ||
      isNaN(pair.lon)
    ) {
      return "Both latitude and longitude are required.";
    }

    if (pair.lat === 0 && pair.lon === 0) {
      return "Both latitude and longitude are required.";
    }

    if (
      (pair.lat === 0 || pair.lat === undefined || pair.lat === null) &&
      pair.lon !== 0 &&
      pair.lon !== undefined &&
      pair.lon !== null
    ) {
      return "Both latitude and longitude are required.";
    }

    if (
      (pair.lon === 0 || pair.lon === undefined || pair.lon === null) &&
      pair.lat !== 0 &&
      pair.lat !== undefined &&
      pair.lat !== null
    ) {
      return "Both latitude and longitude are required.";
    }

    return "";
  };

  const handleCoordinateChange = (
    index: number,
    field: "lat" | "lon",
    value: number
  ) => {
    setCoordinatePairs((prev) => {
      const newPairs = prev.map((pair, i) =>
        i === index ? { ...pair, [field]: value } : pair
      );

      const updatedPair = newPairs[index];
      const error = validateCoordinateRow(updatedPair);

      setCoordinateRowErrors((prev) => {
        const newErrors = [...prev];
        newErrors[index] = error;
        return newErrors;
      });

      return newPairs;
    });
  };

  const addCoordinatePair = () => {
    const lastPair = coordinatePairs[coordinatePairs.length - 1];
    const error = validateCoordinateRow(lastPair);
    if (error) {
      setCoordinateRowErrors((prev) => {
        const newErrors = [...prev];
        newErrors[coordinatePairs.length - 1] = error;
        return newErrors;
      });
      return;
    }
    setCoordinateRowErrors((prev) => [...prev, ""]);
    setCoordinatePairs((prev) => [...prev, { lat: 0, lon: 0 }]);
  };

  const removeCoordinatePair = (index: number) => {
    if (coordinatePairs.length > 1) {
      setCoordinatePairs((prev) => prev.filter((_, i) => i !== index));
      setCoordinateRowErrors((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleCoordinateKeyPress = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCoordinatePair();
    }
  };

  const parseCoordinatesFromText = (
    text: string
  ): { lat: number; lon: number }[] => {
    const lines = text.trim().split("\n");
    const coordinates: { lat: number; lon: number }[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const match = trimmedLine.match(/(-?\d+\.?\d*)\s*[,]\s*(-?\d+\.?\d*)/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);

        if (!isNaN(lat) && !isNaN(lng)) {
          coordinates.push({ lat, lon: lng });
        }
      }
    }

    return coordinates;
  };

  const parseCoordinatesFromKML = async (
    file: File
  ): Promise<{ lat: number; lon: number }[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, "text/xml");

          const coordinatesElement = xmlDoc.querySelector("coordinates");
          if (!coordinatesElement) {
            reject(new Error("No coordinates found in KML file"));
            return;
          }

          const coordText = coordinatesElement.textContent || "";
          const coordinates: { lat: number; lon: number }[] = [];

          const coordPairs = coordText.trim().split(/\s+/);

          for (const pair of coordPairs) {
            const parts = pair.split(",");
            if (parts.length >= 2) {
              const lng = parseFloat(parts[0]);
              const lat = parseFloat(parts[1]);

              if (!isNaN(lat) && !isNaN(lng)) {
                coordinates.push({ lat, lon: lng });
              }
            }
          }

          resolve(coordinates);
        } catch (error) {
          reject(new Error("Failed to parse KML file"));
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const handleImportFromText = () => {
    if (!coordinateInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter coordinates to import",
        variant: "destructive",
      });
      return;
    }

    const coordinates = parseCoordinatesFromText(coordinateInput);
    if (coordinates.length === 0) {
      toast({
        title: "Error",
        description: "No valid coordinates found in the input",
        variant: "destructive",
      });
      return;
    }

    setCoordinatePairs(coordinates);
    setCoordinateRowErrors(new Array(coordinates.length).fill(""));
    setCoordinateInput("");
    setShowCoordinateImportDialog(false);

    toast({
      title: "Success",
      description: `Imported ${coordinates.length} coordinate pairs`,
    });
  };

  const handleImportFromKML = async () => {
    if (!kmlFile) {
      toast({
        title: "Error",
        description: "Please select a KML file",
        variant: "destructive",
      });
      return;
    }

    try {
      const coordinates = await parseCoordinatesFromKML(kmlFile);
      if (coordinates.length === 0) {
        toast({
          title: "Error",
          description: "No valid coordinates found in KML file",
          variant: "destructive",
        });
      }

      setCoordinatePairs(coordinates);
      setCoordinateRowErrors(new Array(coordinates.length).fill(""));
      setKmlFile(null);
      setShowCoordinateImportDialog(false);

      toast({
        title: "Success",
        description: `Imported ${coordinates.length} coordinate pairs from KML`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse KML file",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".kml")) {
      setKmlFile(file);
    } else {
      toast({
        title: "Error",
        description: "Please select a valid KML file",
        variant: "destructive",
      });
    }
  };

  const handleAddProducts = async () => {
    if (!id) return;
    if (!canEditFacility()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to add products to facilities.",
        variant: "destructive",
      });
      return;
    }
    setProductLoading(true);
    try {
      console.log(selectedProducts);
      await ApiService.addProductsToFacility(id, selectedProducts);
      const products = await ApiService.getFacilityInventoryByFacilityId(id);
      setAssignedProducts(products);
      setSelectedProducts([]);
      setShowProductPicker(false);
      toast({
        title: "Products Added",
        description: `${selectedProducts.length} products added to facility.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add products to facility.",
        variant: "destructive",
      });
    } finally {
      setProductLoading(false);
    }
  };

  const handleRemoveProduct = async (facilityInventoryId: string) => {
    if (!facilityInventoryId) return;
    if (!canEditFacility()) {
      toast({
        title: "Access Denied",
        description:
          "You don't have permission to remove products from facilities.",
        variant: "destructive",
      });
      return;
    }
    setProductLoading(true);
    try {
      await ApiService.deleteFacilityInventory(facilityInventoryId);
      const products = await ApiService.getFacilityInventoryByFacilityId(id);
      setAssignedProducts(products);
      setSelectedProducts([]);
      setShowProductPicker(false);
      toast({
        title: "Product Removed",
        description: "Product has been removed from facility.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove product from facility.",
        variant: "destructive",
      });
    } finally {
      setProductLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading facility details...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={editedFacility?.name || "Facility"}
        description={editedFacility?.address || ""}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/facilities/list")}
            >
              {" "}
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Facilities{" "}
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
              canEditFacility() && (
                <Button onClick={handleEdit} disabled={!facility}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Facility
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
            defaultValue={["basic", "serviceable", "products"]}
            className="space-y-4"
          >
            <AccordionItem value="basic">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <span className="font-semibold">Basic Information</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">Facility Name</Label>
                          {isEditing ? (
                            <Input
                              id="name"
                              value={editedFacility?.name || ""}
                              onChange={(e) =>
                                setEditedFacility((prev) => ({
                                  ...prev!,
                                  name: e.target.value,
                                }))
                              }
                              placeholder="Enter facility name"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.name}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          {isEditing ? (
                            <LocationAutocomplete
                              value={editedFacility?.address || ""}
                              onChange={(value) =>
                                setEditedFacility((prev) => ({
                                  ...prev!,
                                  address: value,
                                }))
                              }
                              onLocationSelect={handleLocationSelect}
                              placeholder="Search for a location or enter address manually..."
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.address}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          {isEditing ? (
                            <MapView
                              lat={editedFacility?.latitude || undefined}
                              lng={editedFacility?.longitude || undefined}
                              onLocationSelect={handleMapLocationSelect}
                            />
                          ) : (
                            <div className="p-4 border rounded-lg bg-muted">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>Map view available in edit mode</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="facility_type">Facility Type</Label>
                          {isEditing ? (
                            <select
                              id="facility_type"
                              value={editedFacility?.facility_type || ""}
                              onChange={(e) =>
                                setEditedFacility((prev) => ({
                                  ...prev!,
                                  facility_type: e.target.value,
                                }))
                              }
                              className="w-full border rounded px-3 py-2"
                            >
                              <option value="store">Store</option>
                              <option value="warehouse">Warehouse</option>
                            </select>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.facility_type}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          {isEditing ? (
                            <Input
                              id="city"
                              value={editedFacility?.city || ""}
                              onChange={(e) =>
                                setEditedFacility((prev) => ({
                                  ...prev!,
                                  city: e.target.value,
                                }))
                              }
                              placeholder="Enter city"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.city}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          {isEditing ? (
                            <Input
                              id="state"
                              value={editedFacility?.state || ""}
                              onChange={(e) =>
                                setEditedFacility((prev) => ({
                                  ...prev!,
                                  state: e.target.value,
                                }))
                              }
                              placeholder="Enter state"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.state}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          {isEditing ? (
                            <Input
                              id="country"
                              value={editedFacility?.country || ""}
                              onChange={(e) =>
                                setEditedFacility((prev) => ({
                                  ...prev!,
                                  country: e.target.value,
                                }))
                              }
                              placeholder="Enter country"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.country}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pincode">Pincode</Label>
                          {isEditing ? (
                            <Input
                              id="pincode"
                              value={editedFacility?.pincode || ""}
                              onChange={(e) =>
                                setEditedFacility((prev) => ({
                                  ...prev!,
                                  pincode: e.target.value,
                                }))
                              }
                              placeholder="Enter pincode"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.pincode}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="is_active">Status</Label>
                          {isEditing ? (
                            <select
                              id="is_active"
                              value={
                                editedFacility?.is_active
                                  ? "active"
                                  : "inactive"
                              }
                              onChange={(e) =>
                                setEditedFacility((prev) => ({
                                  ...prev!,
                                  is_active: e.target.value === "active",
                                }))
                              }
                              className="w-full p-2 border rounded"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.is_active ? "Active" : "Inactive"}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="managers">Managers</Label>
                          {isEditing ? (
                            <>
                              <GenericSearchableDropdown
                                options={managers.map((m) => ({
                                  id: m.id,
                                  label: `${m.first_name} ${m.last_name} (${m.username})`,
                                  value: m.id,
                                  ...m,
                                }))}
                                value={selectedManagers}
                                onValueChange={(value) => {
                                  if (Array.isArray(value)) {
                                    setSelectedManagers(value);
                                    const managerIds = value.map(
                                      (option) => option.id
                                    );
                                    setEditedFacility((prev) => ({
                                      ...prev!,
                                      managers: managerIds,
                                    }));
                                  } else if (value) {
                                    setSelectedManagers([value]);
                                    setEditedFacility((prev) => ({
                                      ...prev!,
                                      managers: [value.id],
                                    }));
                                  } else {
                                    setSelectedManagers([]);
                                    setEditedFacility((prev) => ({
                                      ...prev!,
                                      managers: [],
                                    }));
                                  }
                                }}
                                placeholder="Select managers"
                                searchPlaceholder="Search managers..."
                                multiple={true}
                              />

                              {selectedManagers.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {selectedManagers.map((manager) => (
                                    <Badge
                                      key={manager.id}
                                      variant="secondary"
                                      className="flex items-center gap-1"
                                    >
                                      {manager.label}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const updatedManagers =
                                            selectedManagers.filter(
                                              (m) => m.id !== manager.id
                                            );
                                          setSelectedManagers(updatedManagers);
                                          const managerIds =
                                            updatedManagers.map((m) => m.id);
                                          setEditedFacility((prev) => ({
                                            ...prev!,
                                            managers: managerIds,
                                          }));
                                        }}
                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.managers &&
                              facility.managers.length > 0
                                ? facility.managers
                                    .map((managerId) => {
                                      const manager = managers.find(
                                        (m) => m.id === managerId
                                      );
                                      return manager
                                        ? `${manager.first_name} ${manager.last_name} (${manager.username})`
                                        : managerId;
                                    })
                                    .join(", ")
                                : "No managers assigned"}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          {isEditing ? (
                            <>
                            <Input
                              id="email"
                              type="email"
                              value={editedFacility?.email || ""}
                              onChange={(e) => {
                                const value = e.target.value || null;
                                setEditedFacility((prev) => ({
                                  ...prev!,
                                  email: value,
                                }));
                                
                                // Validate email on change
                                if (value && value.trim()) {
                                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                  if (!emailRegex.test(value.trim())) {
                                    setErrors((prev) => ({ ...prev, email: "Please enter a valid email address" }));
                                  } else {
                                    setErrors((prev) => ({ ...prev, email: "" }));
                                  }
                                } else {
                                  setErrors((prev) => ({ ...prev, email: "" }));
                                }
                              }}
                              placeholder="Enter email address"
                              className={errors.email ? "border-destructive" : ""}
                            />
                            {errors.email && (
                              <p className="text-sm text-destructive">
                                {errors.email}
                              </p>
                            )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.email || "No email provided"}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone_number">Phone Number</Label>
                          {isEditing ? (
                            <Input
                              id="phone_number"
                              type="tel"
                              value={editedFacility?.phone_number || ""}
                              onChange={(e) =>
                                setEditedFacility((prev) => ({
                                  ...prev!,
                                  phone_number: e.target.value || null,
                                }))
                              }
                              placeholder="Enter phone number"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.phone_number || "No phone number provided"}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="customer_care">Customer Care</Label>
                          {isEditing ? (
                            <Input
                              id="customer_care"
                              type="tel"
                              value={editedFacility?.customer_care || ""}
                              onChange={(e) =>
                                setEditedFacility((prev) => ({
                                  ...prev!,
                                  customer_care: e.target.value || null,
                                }))
                              }
                              placeholder="Enter customer care number"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.customer_care || "No customer care number provided"}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cin_no">CIN Number</Label>
                          {isEditing ? (
                            <Input
                              id="cin_no"
                              type="text"
                              value={editedFacility?.cin_no || ""}
                              onChange={(e) =>
                                setEditedFacility((prev) => ({
                                  ...prev!,
                                  cin_no: e.target.value || null,
                                }))
                              }
                              placeholder="Enter CIN number"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.cin_no || "No CIN number provided"}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="gstn_no">GSTN Number</Label>
                          {isEditing ? (
                            <Input
                              id="gstn_no"
                              type="text"
                              value={editedFacility?.gstn_no || ""}
                              onChange={(e) =>
                                setEditedFacility((prev) => ({
                                  ...prev!,
                                  gstn_no: e.target.value || null,
                                }))
                              }
                              placeholder="Enter GSTN number"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.gstn_no || "No GSTN number provided"}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fssai_no">FSSAI Number</Label>
                          {isEditing ? (
                            <Input
                              id="fssai_no"
                              type="text"
                              value={editedFacility?.fssai_no || ""}
                              onChange={(e) =>
                                setEditedFacility((prev) => ({
                                  ...prev!,
                                  fssai_no: e.target.value || null,
                                }))
                              }
                              placeholder="Enter FSSAI number"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {facility?.fssai_no || "No FSSAI number provided"}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Clusters</Label>
                          {Array.isArray(facility?.clusters) &&
                          facility.clusters.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {facility.clusters.map((cl) => (
                                <div
                                  key={cl.id}
                                  className="border rounded px-3 py-1 bg-muted"
                                >
                                  <span className="font-medium">{cl.name}</span>{" "}
                                  <span className="text-xs text-muted-foreground">
                                    ({cl.region})
                                  </span>{" "}
                                  <span className="text-xs">
                                    {cl.is_active ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No clusters
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
            {/* Serviceable Area */}
            <AccordionItem value="serviceable">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <span className="font-semibold">Serviceable Area</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Define the serviceable area by adding coordinate pairs
                          (latitude, longitude) in the correct order to form a
                          polygon boundary.
                          <strong className="text-foreground block mt-1">
                            Important:
                          </strong>{" "}
                          The coordinates must be ordered correctly to form a
                          valid polygon boundary. Press Enter or click 'Add' to
                          add more coordinates.
                        </div>
                        {isEditing && (
                          <Dialog
                            open={showCoordinateImportDialog}
                            onOpenChange={setShowCoordinateImportDialog}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Import Coordinates
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Import Coordinates</DialogTitle>
                                <DialogDescription>
                                  Import coordinates from copied text or KML
                                  file exported from Polygon KML Editor
                                </DialogDescription>
                              </DialogHeader>
                              <Tabs defaultValue="text" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                  <TabsTrigger value="text">
                                    Pasted Text
                                  </TabsTrigger>
                                  <TabsTrigger value="kml">
                                    KML File
                                  </TabsTrigger>
                                </TabsList>
                                <TabsContent value="text" className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="coordinate-input">
                                      Paste Coordinates
                                    </Label>
                                    <Textarea
                                      id="coordinate-input"
                                      placeholder="Paste coordinates in format:&#10;19.076, 72.8777&#10;19.077, 72.8778&#10;19.078, 72.8779"
                                      value={coordinateInput}
                                      onChange={(e) =>
                                        setCoordinateInput(e.target.value)
                                      }
                                      rows={6}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Format: latitude, longitude (one pair per
                                      line)
                                    </p>
                                  </div>
                                  <Button
                                    onClick={handleImportFromText}
                                    className="w-full"
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Import from Text
                                  </Button>
                                </TabsContent>
                                <TabsContent value="kml" className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="kml-file">
                                      Select KML File
                                    </Label>
                                    <Input
                                      id="kml-file"
                                      type="file"
                                      accept=".kml"
                                      onChange={handleFileSelect}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Select a KML file exported from Polygon
                                      KML Editor
                                    </p>
                                  </div>
                                  <Button
                                    onClick={handleImportFromKML}
                                    className="w-full"
                                    disabled={!kmlFile}
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Import from KML
                                  </Button>
                                </TabsContent>
                              </Tabs>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
                            <div className="col-span-1">#</div>
                            <div className="col-span-5">Latitude</div>
                            <div className="col-span-5">Longitude</div>
                            <div className="col-span-1"></div>
                          </div>

                          {coordinatePairs.map((pair, index) => (
                            <div key={index}>
                              <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-1 text-sm text-muted-foreground">
                                  {index + 1}
                                </div>
                                <div className="col-span-5">
                                  <Input
                                    type="number"
                                    step="any"
                                    value={pair.lat}
                                    onChange={(e) =>
                                      handleCoordinateChange(
                                        index,
                                        "lat",
                                        parseFloat(e.target.value)
                                      )
                                    }
                                    onKeyPress={(e) =>
                                      handleCoordinateKeyPress(e, index)
                                    }
                                    placeholder="Latitude"
                                    className="w-full"
                                  />
                                </div>
                                <div className="col-span-5">
                                  <Input
                                    type="number"
                                    step="any"
                                    value={pair.lon}
                                    onChange={(e) =>
                                      handleCoordinateChange(
                                        index,
                                        "lon",
                                        parseFloat(e.target.value)
                                      )
                                    }
                                    onKeyPress={(e) =>
                                      handleCoordinateKeyPress(e, index)
                                    }
                                    placeholder="Longitude"
                                    className="w-full"
                                  />
                                </div>
                                <div className="col-span-1">
                                  {coordinatePairs.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        removeCoordinatePair(index)
                                      }
                                      className="h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {coordinateRowErrors[index] && (
                                <div className="col-span-12">
                                  <p className="text-xs text-destructive mt-1">
                                    {coordinateRowErrors[index]}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}

                          <div className="flex justify-start">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addCoordinatePair}
                              className="mt-2"
                            >
                              + Add Coordinate
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {facility?.servicable_area ? (
                            (() => {
                              let servicableAreaArray: number[] = [];

                              // Handle both string and array formats
                              if (
                                typeof facility.servicable_area === "string"
                              ) {
                                try {
                                  const cleanString =
                                    facility.servicable_area.replace(
                                      /[\[\]]/g,
                                      ""
                                    );
                                  servicableAreaArray = cleanString
                                    .split(",")
                                    .map((coord) => parseFloat(coord.trim()))
                                    .filter((coord) => !isNaN(coord));
                                } catch (error) {
                                  servicableAreaArray = [];
                                }
                              } else if (
                                Array.isArray(facility.servicable_area)
                              ) {
                                servicableAreaArray = facility.servicable_area;
                              }

                              return servicableAreaArray.length > 0 ? (
                                <div className="space-y-1">
                                  {Array.from(
                                    {
                                      length: Math.floor(
                                        servicableAreaArray.length / 2
                                      ),
                                    },
                                    (_, i) => (
                                      <div
                                        key={i}
                                        className="text-sm text-muted-foreground"
                                      >
                                        {i + 1}. (
                                        {servicableAreaArray[i * 2] || 0},{" "}
                                        {servicableAreaArray[i * 2 + 1] || 0})
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  No serviceable area defined
                                </p>
                              );
                            })()
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No serviceable area defined
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
            {/* Products Assignment */}
            <AccordionItem value="products">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    <span className="font-semibold">Products</span>
                    <Badge variant="secondary">{assignedProducts.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Add and manage products in this facility
                        </p>
                        {canEditFacility() && (
                          <Button
                            onClick={() => setShowProductPicker(true)}
                            disabled={productLoading}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Products
                          </Button>
                        )}
                      </div>
                      {assignedProducts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No products in this facility yet.</p>
                          <p className="text-sm">
                            Click "Add Products" to get started.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {assignedProducts.map((p, index) => (
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
                                <h4 className="font-medium">
                                  {p.product_variant_details.product_name +
                                    " - " +
                                    p.product_variant_details.name}
                                </h4>
                              </div>
                              {canEditFacility() && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={productLoading}
                                    >
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
                                        {p.product_variant_details
                                          .product_name +
                                          " - " +
                                          p.product_variant_details.name}
                                        " from this facility?
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
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Facility Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Products</Label>
                <p className="text-2xl font-bold">{assignedProducts.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <ProductVariantPicker
        open={showProductPicker}
        onOpenChange={setShowProductPicker}
        title="Add Products to Facility"
        description="Search and select products to add to your facility"
        assignedProducts={assignedProducts}
        selectedProducts={selectedProducts}
        onSelectionChange={setSelectedProducts}
        onConfirm={handleAddProducts}
        onCancel={() => setSelectedProducts([])}
        loading={productLoading}
        confirmText="Add Products"
        cancelText="Cancel"
        searchPlaceholder="Search products by name..."
      />
    </div>
  );
}
