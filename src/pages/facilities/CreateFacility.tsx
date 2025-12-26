import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  MapPin,
  Building,
  User as UserIcon,
  Trash2,
  Plus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GenericSearchableDropdown,
  SearchableOption,
} from "@/components/ui/generic-searchable-dropdown";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/api";
import type { User } from "@/types";
import { UserCreationDialog } from "@/components/UserCreationDialog";
import MapView from "@/components/MapView";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FacilityFormData {
  facility_type: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude: number;
  longitude: number;
  servicable_area?: number[]; // [lat, lon, lat, lon, ...]
  is_active: boolean;
  managers: string[]; // Changed from manager to managers array
  email: string | null;
  phone_number: string | null;
  customer_care: string | null;
  cin_no: string | null;
  gstn_no: string | null;
  fssai_no: string | null;
}

// Default form values
const defaultForm: FacilityFormData = {
  facility_type: "store",
  name: "",
  address: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  latitude: 0,
  longitude: 0,
  servicable_area: [],
  is_active: true,
  managers: [], // Changed from manager to managers array
  email: null,
  phone_number: null,
  customer_care: null,
  cin_no: null,
  gstn_no: null,
  fssai_no: null,
};

interface CoordinatePair {
  lat: number | undefined;
  lon: number | undefined;
}

export default function CreateFacility() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState<FacilityFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [managerOptions, setManagerOptions] = useState<SearchableOption[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [managersSearch, setManagersSearch] = useState("");
  const [pageByRole, setPageByRole] = useState<{ manager: number; master: number }>({ manager: 1, master: 1 });
  const [totalByRole, setTotalByRole] = useState<{ manager: number; master: number }>({ manager: 0, master: 0 });
  const [loadedByRole, setLoadedByRole] = useState<{ manager: number; master: number }>({ manager: 0, master: 0 });
  const [coordinatePairs, setCoordinatePairs] = useState<CoordinatePair[]>([
    {} as CoordinatePair,
  ]);
  const [coordinateRowErrors, setCoordinateRowErrors] = useState<string[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<SearchableOption[]>(
    []
  ); // Changed from selectedManager to selectedManagers array
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showCoordinateImportDialog, setShowCoordinateImportDialog] =
    useState(false);
  const [coordinateInput, setCoordinateInput] = useState("");
  const [kmlFile, setKmlFile] = useState<File | null>(null);

  useEffect(() => {
    const resetAndFetch = async () => {
      setManagersLoading(true);
      try {
        const pageSize = 50;
        const [mgrFirst, mstFirst] = await Promise.all([
          ApiService.getUsersWithPagination(1, pageSize, managersSearch || undefined, "manager"),
          ApiService.getUsersWithPagination(1, pageSize, managersSearch || undefined, "master"),
        ]);

        const toOption = (u: User): SearchableOption => ({
          id: u.id,
          label: `${u.first_name} ${u.last_name} (${u.username})`,
          value: String(u.id),
          ...u,
        });

        setManagerOptions([...(mgrFirst.results || []).map(toOption), ...(mstFirst.results || []).map(toOption)]);
        setPageByRole({ manager: 1, master: 1 });
        setTotalByRole({ manager: mgrFirst.count || 0, master: mstFirst.count || 0 });
        setLoadedByRole({ manager: (mgrFirst.results || []).length, master: (mstFirst.results || []).length });
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({ title: "Error", description: "Failed to fetch users", variant: "destructive" });
      } finally {
        setManagersLoading(false);
      }
    };
    resetAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managersSearch]);

  const hasMoreManagers = () => {
    const total = (totalByRole.manager || 0) + (totalByRole.master || 0);
    const loaded = (loadedByRole.manager || 0) + (loadedByRole.master || 0);
    return loaded < total;
  };

  const loadMoreManagers = async () => {
    if (managersLoading || !hasMoreManagers()) return;
    setManagersLoading(true);
    try {
      const pageSize = 50;
      // Prefer loading next page for the role with more remaining
      const remainingMgr = Math.max((totalByRole.manager || 0) - (loadedByRole.manager || 0), 0);
      const remainingMst = Math.max((totalByRole.master || 0) - (loadedByRole.master || 0), 0);
      const roleToLoad: "manager" | "master" = remainingMgr >= remainingMst ? "manager" : "master";
      if ((roleToLoad === "manager" && remainingMgr === 0) || (roleToLoad === "master" && remainingMst === 0)) {
        // load the other role if chosen has no remaining
        const other: "manager" | "master" = roleToLoad === "manager" ? "master" : "manager";
        if ((other === "manager" && remainingMgr === 0) || (other === "master" && remainingMst === 0)) {
          setManagersLoading(false);
          return;
        }
        const nextPage = (pageByRole[other] || 1) + 1;
        const res = await ApiService.getUsersWithPagination(nextPage, pageSize, managersSearch || undefined, other);
        setManagerOptions((prev) => [...prev, ...res.results.map((u) => ({
          id: u.id,
          label: `${u.first_name} ${u.last_name} (${u.username})`,
          value: String(u.id),
          ...u,
        }))]);
        setPageByRole((prev) => ({ ...prev, [other]: nextPage }));
        setLoadedByRole((prev) => ({ ...prev, [other]: (prev[other] || 0) + res.results.length }));
      } else {
        const nextPage = (pageByRole[roleToLoad] || 1) + 1;
        const res = await ApiService.getUsersWithPagination(nextPage, pageSize, managersSearch || undefined, roleToLoad);
        setManagerOptions((prev) => [...prev, ...res.results.map((u) => ({
          id: u.id,
          label: `${u.first_name} ${u.last_name} (${u.username})`,
          value: String(u.id),
          ...u,
        }))]);
        setPageByRole((prev) => ({ ...prev, [roleToLoad]: nextPage }));
        setLoadedByRole((prev) => ({ ...prev, [roleToLoad]: (prev[roleToLoad] || 0) + res.results.length }));
      }
    } catch (error) {
      console.error("Error loading more users:", error);
    } finally {
      setManagersLoading(false);
    }
  };

  useEffect(() => {
    if (managerOptions.length > 0 && formData.managers.length > 0) {
      const selected = managerOptions.filter((m) => formData.managers.includes(m.id as string));
      if (selected.length) setSelectedManagers(selected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerOptions]);

  useEffect(() => {
    const servicableArea = coordinatePairs
      .filter((pair) => pair.lat !== undefined && pair.lon !== undefined)
      .flatMap((pair) => [pair.lat!, pair.lon!]);
    setFormData((prev) => ({ ...prev, servicable_area: servicableArea }));
  }, [coordinatePairs]);

  const validateCoordinateRow = (pair: CoordinatePair): string => {
    if (
      pair.lat === undefined ||
      pair.lon === undefined ||
      pair.lat === null ||
      pair.lon === null ||
      (typeof pair.lat === "number" && isNaN(pair.lat)) ||
      (typeof pair.lon === "number" && isNaN(pair.lon))
    ) {
      return "Both latitude and longitude are required.";
    }
    return "";
  };

  const handleCoordinateChange = (
    index: number,
    field: "lat" | "lon",
    value: number | undefined
  ) => {
    setCoordinatePairs((prev) =>
      prev.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair))
    );
    setCoordinateRowErrors((prev) => {
      const newErrors = [...prev];
      newErrors[index] = "";
      return newErrors;
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
    setCoordinatePairs((prev) => [...prev, {} as CoordinatePair]);
  };

  const removeCoordinatePair = (index: number) => {
    if (coordinatePairs.length === 1) {
      // If it's the last coordinate pair, clear its content instead of removing
      setCoordinatePairs([
        { lat: undefined, lon: undefined } as CoordinatePair,
      ]);
      setCoordinateRowErrors([""]);
    } else {
      // Remove the coordinate pair and its error
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

  const handleLocationSelect = (location: {
    city: string;
    state: string;
    country: string;
    pincode: string;
    latitude: number;
    longitude: number;
    formattedAddress: string;
  }) => {
    setFormData((prev) => {
      const updatedData = {
        ...prev,
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
    setFormData((prev) => {
      const updatedData = {
        ...prev,
        city: addressData.city || prev.city,
        state: addressData.state || prev.state,
        country: addressData.country || prev.country,
        pincode: addressData.pincode || prev.pincode,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        address: addressData.formattedAddress,
      };
      return updatedData;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Facility name is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.managers || formData.managers.length === 0)
      newErrors.managers = "At least one manager is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.country.trim()) newErrors.country = "Country is required";
    if (!formData.pincode.trim()) newErrors.pincode = "Pincode is required";
    
    // Email validation
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = "Please enter a valid email address";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert servicable_area to string for API, wrapped in brackets
      const payload = {
        ...formData,
        servicable_area: Array.isArray(formData.servicable_area)
          ? `[${formData.servicable_area.join(",")}]`
          : formData.servicable_area,
      };
      await ApiService.createFacility(payload as any);
      toast({
        title: "Facility Created",
        description: "New facility has been created successfully.",
      });
      navigate("/facilities/list");
    } catch (error) {
      toast({
        title: "Error",
        description: "Facility already exists.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof FacilityFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleUserCreated = (newUser: User) => {
    // Add the new user to the dropdown options
    const managerOption: SearchableOption = {
      id: newUser.id,
      label: `${newUser.first_name} ${newUser.last_name} (${newUser.username})`,
      value: String(newUser.id),
      ...newUser,
    };
    setManagerOptions((prev) => [managerOption, ...prev]);

    // Add the new user to selected managers
    setSelectedManagers((prev) => [...prev, managerOption]);
    handleInputChange("managers", [...formData.managers, newUser.id]);
  };

  const handleManagerSelection = (
    selectedOptions: SearchableOption | SearchableOption[] | null
  ) => {
    if (Array.isArray(selectedOptions)) {
      setSelectedManagers(selectedOptions);
      const managerIds = selectedOptions.map((option) => option.id);
      handleInputChange("managers", managerIds);
    } else if (selectedOptions) {
      setSelectedManagers([selectedOptions]);
      handleInputChange("managers", [selectedOptions.id]);
    } else {
      setSelectedManagers([]);
      handleInputChange("managers", []);
    }
  };

  const removeManager = (managerId: string | number) => {
    const updatedManagers = formData.managers.filter((id) => id !== managerId);
    handleInputChange("managers", updatedManagers);
    setSelectedManagers((prev) => prev.filter((m) => m.id !== managerId));
  };

  // Parse coordinates from copied text (format: lat, lng)
  const parseCoordinatesFromText = (text: string): CoordinatePair[] => {
    const lines = text.trim().split("\n");
    const coordinates: CoordinatePair[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Handle different coordinate formats
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

  // Parse coordinates from KML file
  const parseCoordinatesFromKML = async (
    file: File
  ): Promise<CoordinatePair[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, "text/xml");

          // Find coordinates in KML
          const coordinatesElement = xmlDoc.querySelector("coordinates");
          if (!coordinatesElement) {
            reject(new Error("No coordinates found in KML file"));
            return;
          }

          const coordText = coordinatesElement.textContent || "";
          const coordinates: CoordinatePair[] = [];

          // Parse KML coordinate format: "lng,lat,alt lng,lat,alt ..."
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

  // Import coordinates from text input
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

  // Import coordinates from KML file
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
        return;
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

  // Handle file selection
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

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Create New Facility"
        description="Add a new facility to your network"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/facilities/list")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Facilities
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="mr-2 h-4 w-4" />
              Create Facility
            </Button>
          </div>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Accordion
              type="multiple"
              defaultValue={["basic", "contact", "serviceable"]}
              className="space-y-4"
            >
              {/* Basic Information */}
              <AccordionItem value="basic">
                <Card>
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      <span className="font-semibold">Basic Information</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">Facility Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) =>
                              handleInputChange("name", e.target.value)
                            }
                            placeholder="Enter facility name"
                            className={errors.name ? "border-destructive" : ""}
                          />
                          {errors.name && (
                            <p className="text-sm text-destructive">
                              {errors.name}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="facility_type">Type *</Label>
                          <Select
                            value={formData.facility_type}
                            onValueChange={(value) =>
                              handleInputChange("facility_type", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="store">Store</SelectItem>
                              <SelectItem value="warehouse">
                                Warehouse
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <LocationAutocomplete
                            value={formData.address}
                            onChange={(value) =>
                              handleInputChange("address", value)
                            }
                            onLocationSelect={handleLocationSelect}
                            placeholder="Search for a location or enter address manually..."
                            label="Address *"
                            error={errors.address}
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <MapView
                            lat={formData.latitude || undefined}
                            lng={formData.longitude || undefined}
                            onLocationSelect={handleMapLocationSelect}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) =>
                              handleInputChange("city", e.target.value)
                            }
                            placeholder="Enter city"
                            className={errors.city ? "border-destructive" : ""}
                          />
                          {errors.city && (
                            <p className="text-sm text-destructive">
                              {errors.city}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="state">State *</Label>
                          <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) =>
                              handleInputChange("state", e.target.value)
                            }
                            placeholder="Enter state"
                            className={errors.state ? "border-destructive" : ""}
                          />
                          {errors.state && (
                            <p className="text-sm text-destructive">
                              {errors.state}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="country">Country *</Label>
                          <Input
                            id="country"
                            value={formData.country}
                            onChange={(e) =>
                              handleInputChange("country", e.target.value)
                            }
                            placeholder="Enter country"
                            className={
                              errors.country ? "border-destructive" : ""
                            }
                          />
                          {errors.country && (
                            <p className="text-sm text-destructive">
                              {errors.country}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="pincode">Pincode *</Label>
                          <Input
                            id="pincode"
                            value={formData.pincode}
                            onChange={(e) =>
                              handleInputChange("pincode", e.target.value)
                            }
                            placeholder="Enter pincode"
                            className={
                              errors.pincode ? "border-destructive" : ""
                            }
                          />
                          {errors.pincode && (
                            <p className="text-sm text-destructive">
                              {errors.pincode}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="latitude">Latitude *</Label>
                          <Input
                            id="latitude"
                            type="number"
                            value={formData.latitude}
                            onChange={(e) =>
                              handleInputChange(
                                "latitude",
                                parseFloat(e.target.value)
                              )
                            }
                            placeholder="Latitude"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="longitude">Longitude *</Label>
                          <Input
                            id="longitude"
                            type="number"
                            value={formData.longitude}
                            onChange={(e) =>
                              handleInputChange(
                                "longitude",
                                parseFloat(e.target.value)
                              )
                            }
                            placeholder="Longitude"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="is_active">Active</Label>
                          <Switch
                            checked={formData.is_active}
                            onCheckedChange={(checked) =>
                              handleInputChange("is_active", checked)
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Contact Information */}
              <AccordionItem value="contact">
                <Card>
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-5 w-5" />
                      <span className="font-semibold">Contact Information</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="managers">Managers *</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowUserDialog(true)}
                              className="h-8 px-3"
                            >
                              <Plus className="h-3 w-3" /> Add Manager
                            </Button>
                          </div>
                          <GenericSearchableDropdown
                            options={managerOptions}
                            value={selectedManagers}
                            onValueChange={handleManagerSelection}
                            placeholder="Select managers"
                            searchPlaceholder="Search managers..."
                            triggerClassName={
                              errors.managers ? "border-destructive" : ""
                            }
                            emptyMessage="No managers found. Create a new manager account."
                            multiple={true}
                            hasMore={hasMoreManagers()}
                            isLoading={managersLoading}
                            onLoadMore={loadMoreManagers}
                            onSearch={(s) => setManagersSearch(s)}
                            enableBackendSearch
                          />
                          {errors.managers && (
                            <p className="text-sm text-destructive">
                              {errors.managers}
                            </p>
                          )}

                          {/* Display selected managers as badges */}
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
                                    onClick={() => removeManager(manager.id)}
                                    className="h-4 w-4 p-0 hover:bg-transparent"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email || ""}
                            onChange={(e) => {
                              const value = e.target.value || null;
                              handleInputChange("email", value);
                              
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
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone_number">Phone Number</Label>
                          <Input
                            id="phone_number"
                            type="tel"
                            value={formData.phone_number || ""}
                            onChange={(e) =>
                              handleInputChange("phone_number", e.target.value || null)
                            }
                            placeholder="Enter phone number"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="customer_care">Customer Care</Label>
                          <Input
                            id="customer_care"
                            type="tel"
                            value={formData.customer_care || ""}
                            onChange={(e) =>
                              handleInputChange("customer_care", e.target.value || null)
                            }
                            placeholder="Enter customer care number"
                          />
                        </div>

                        

                      </div>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
              {/* Contact Information */}
              <AccordionItem value="contact">
                <Card>
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      <span className="font-semibold">Facility Details</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0">
                      <div className="grid gap-4 md:grid-cols-2">

                        <div className="space-y-2">
                          <Label htmlFor="cin_no">CIN Number</Label>
                          <Input
                            id="cin_no"
                            type="text"
                            value={formData.cin_no || ""}
                            onChange={(e) =>
                              handleInputChange("cin_no", e.target.value || null)
                            }
                            placeholder="Enter CIN number"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="gstn_no">GSTN Number</Label>
                          <Input
                            id="gstn_no"
                            type="text"
                            value={formData.gstn_no || ""}
                            onChange={(e) =>
                              handleInputChange("gstn_no", e.target.value || null)
                            }
                            placeholder="Enter GSTN number"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fssai_no">FSSAI Number</Label>
                          <Input
                            id="fssai_no"
                            type="text"
                            value={formData.fssai_no || ""}
                            onChange={(e) =>
                              handleInputChange("fssai_no", e.target.value || null)
                            }
                            placeholder="Enter FSSAI number"
                          />
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
                            Define the serviceable area by adding coordinate
                            pairs (latitude, longitude) in the correct order to
                            form a polygon boundary.
                            <strong className="text-foreground block mt-1">
                              Important:
                            </strong>{" "}
                            The coordinates must be ordered correctly to form a
                            valid polygon boundary. Press Enter or click 'Add'
                            to add more coordinates.
                          </div>
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
                        </div>

                        <div className="space-y-2">
                          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
                            <div className="col-span-1">#</div>
                            <div className="col-span-5">Latitude</div>
                            <div className="col-span-5">Longitude</div>
                            <div className="col-span-1"></div>
                          </div>

                          {coordinatePairs.map((pair, index) => (
                            <div key={index} className="space-y-1">
                              <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-1 text-sm text-muted-foreground">
                                  {index + 1}
                                </div>
                                <div className="col-span-5">
                                  <Input
                                    type="number"
                                    step="any"
                                    value={pair.lat || ""}
                                    onChange={(e) =>
                                      handleCoordinateChange(
                                        index,
                                        "lat",
                                        e.target.value
                                          ? parseFloat(e.target.value)
                                          : undefined
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
                                    value={pair.lon || ""}
                                    onChange={(e) =>
                                      handleCoordinateChange(
                                        index,
                                        "lon",
                                        e.target.value
                                          ? parseFloat(e.target.value)
                                          : undefined
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
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeCoordinatePair(index)}
                                    className="h-8 w-8 p-0"
                                    title={
                                      coordinatePairs.length === 1
                                        ? "Clear coordinates"
                                        : "Remove coordinate pair"
                                    }
                                  >
                                    {coordinatePairs.length === 1 ? (
                                      <X className="h-4 w-4" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
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
                      </div>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Facility Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.name ?? "Not set"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <p className="text-sm text-muted-foreground capitalize">
                    {formData.facility_type}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Managers</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedManagers.length > 0
                      ? selectedManagers.map((m) => m.label).join(", ")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.is_active ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">City</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.city ?? "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">State</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.state ?? "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Country</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.country ?? "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Pincode</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.pincode ?? "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Latitude</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.latitude || formData.latitude === 0
                      ? formData.latitude
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Longitude</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.longitude || formData.longitude === 0
                      ? formData.longitude
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Serviceable Area
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.servicable_area &&
                    formData.servicable_area.length > 0
                      ? `${
                          formData.servicable_area.length / 2
                        } coordinate pairs`
                      : "No coordinates added"}
                  </p>
                  {formData.servicable_area &&
                    formData.servicable_area.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Array.from(
                          {
                            length: Math.floor(
                              formData.servicable_area.length / 2
                            ),
                          },
                          (_, i) => (
                            <div
                              key={i}
                              className="text-xs text-muted-foreground"
                            >
                              {i + 1}. ({formData.servicable_area[i * 2] || 0},{" "}
                              {formData.servicable_area[i * 2 + 1] || 0})
                            </div>
                          )
                        )}
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* User Creation Dialog */}
      <UserCreationDialog
        open={showUserDialog}
        onOpenChange={setShowUserDialog}
        onUserCreated={handleUserCreated}
        title="Create New Manager"
        description="Create a new manager account to assign to this facility"
      />
    </div>
  );
}
