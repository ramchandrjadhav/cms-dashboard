import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Edit,
  Building,
  Users,
  Settings,
  ArrowRight,
  ArrowLeft as MoveLeft,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import { cn } from "@/lib/utils";
import { ApiService } from "@/services/api";
import type { Cluster } from "@/types";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface DraggedFacility {
  id: number;
  name: string;
  facility_type: string;
}

export default function ClusterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const canEditCluster = () => {
    return hasRole("master");
  };

  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCluster, setEditedCluster] = useState<Cluster | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draggedFacility, setDraggedFacility] =
    useState<DraggedFacility | null>(null);
  const [allFacilities, setAllFacilities] = useState<DraggedFacility[]>([]);
  const [facilitiesPage, setFacilitiesPage] = useState(1);
  const [hasMoreFacilities, setHasMoreFacilities] = useState(true);
  const [loadingFacilities, setLoadingFacilities] = useState(false);

  // Load facilities with pagination
  const loadFacilities = async (page: number, reset: boolean = false) => {
    if (loadingFacilities) return;
    
    setLoadingFacilities(true);
    try {
      const response = await ApiService.getFacilitiesWithPagination(page, 20); // Load 20 per page
      
      const draggedFacilities: DraggedFacility[] = response.results.map(
        (facility: any) => ({
          id: Number(facility.id),
          name: facility.name,
          facility_type: facility.facility_type,
        })
      );

      if (reset) {
        setAllFacilities(draggedFacilities);
      } else {
        setAllFacilities(prev => [...prev, ...draggedFacilities]);
      }

      setHasMoreFacilities(!!response.next);
      setFacilitiesPage(page);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      toast({
        title: "Error",
        description: "Failed to fetch facilities",
        variant: "destructive",
      });
    } finally {
      setLoadingFacilities(false);
    }
  };

  // Load more facilities when scrolling
  const loadMoreFacilities = () => {
    if (hasMoreFacilities && !loadingFacilities) {
      loadFacilities(facilitiesPage + 1, false);
    }
  };

  useEffect(() => {
    if (!id) return;
    ApiService.getCluster(id)
      .then((data) => {
        setCluster(data);
        setEditedCluster(data);
      })
      .catch((error) => {
        console.error("Error fetching cluster:", error);
        toast({
          title: "Error",
          description: "Failed to fetch cluster details",
          variant: "destructive",
        });
      });
    loadFacilities(1, true); // Load first page and reset
  }, [id]);

  useEffect(() => {
    if (!cluster || !editedCluster) return;
    const isChanged = JSON.stringify(cluster) !== JSON.stringify(editedCluster);
    setHasUnsavedChanges(isChanged);
  }, [cluster, editedCluster]);

  const handleEdit = () => {
    if (!cluster) return;
    if (!canEditCluster()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit clusters.",
        variant: "destructive",
      });
      return;
    }
    setEditedCluster({ ...cluster });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editedCluster) return;
    try {
      // Only send array of facility ids for facilities
      const payload = {
        ...editedCluster,
        facilities: (editedCluster.facilities || []).map((f) => f.id),
      };
      const updated = await ApiService.updateCluster(editedCluster.id, payload);
      // After saving, re-fetch cluster and facilities to refresh state
      if (id) {
        const [freshCluster, freshFacilities] = await Promise.all([
          ApiService.getCluster(id),
          ApiService.getFacilities(),
        ]);
        setCluster(freshCluster);
        setEditedCluster(freshCluster);
        // Map facilities to DraggedFacility type
        const draggedFacilities: DraggedFacility[] = freshFacilities.map(
          (facility: any) => ({
            id: Number(facility.id),
            name: facility.name,
            facility_type: facility.facility_type,
          })
        );
        setAllFacilities(draggedFacilities);
      }
      setIsEditing(false);
      setHasUnsavedChanges(false);
      toast({
        title: "Cluster Updated",
        description: "Cluster settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update cluster.",
        variant: "destructive",
      });
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
    if (!cluster) return;
    setEditedCluster({ ...cluster });
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  const handleAddFacility = (facility: {
    id: number;
    name: string;
    facility_type: string;
  }) => {
    if (!editedCluster) return;
    if (!canEditCluster()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to add facilities to clusters.",
        variant: "destructive",
      });
      return;
    }
    if (editedCluster.facilities?.some((f) => f.id === facility.id)) return;
    setEditedCluster((prev) => ({
      ...prev!,
      facilities: [...(prev?.facilities || []), facility],
    }));
  };

  const handleRemoveFacility = (facilityId: number) => {
    if (!editedCluster) return;
    if (!canEditCluster()) {
      toast({
        title: "Access Denied",
        description:
          "You don't have permission to remove facilities from clusters.",
        variant: "destructive",
      });
      return;
    }
    setEditedCluster((prev) => ({
      ...prev!,
      facilities: (prev?.facilities || []).filter((f) => f.id !== facilityId),
    }));
  };

  const handleBulkAdd = (
    availableFacilities: { id: number; name: string; facility_type: string }[]
  ) => {
    if (!editedCluster) return;
    if (!canEditCluster()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to add facilities to clusters.",
        variant: "destructive",
      });
      return;
    }
    const toAdd = availableFacilities.slice(0, 3);
    setEditedCluster((prev) => ({
      ...prev!,
      facilities: [...(prev?.facilities || []), ...toAdd],
    }));
  };

  const handleBulkRemove = () => {
    if (!editedCluster) return;
    if (!canEditCluster()) {
      toast({
        title: "Access Denied",
        description:
          "You don't have permission to remove facilities from clusters.",
        variant: "destructive",
      });
      return;
    }
    setEditedCluster((prev) => ({
      ...prev!,
      facilities: [],
    }));
  };

  const handleDragStart = (facility: DraggedFacility) => {
    setDraggedFacility(facility);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropAdd = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedFacility) {
      handleAddFacility(draggedFacility);
      setDraggedFacility(null);
    }
  };

  const handleDropRemove = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedFacility) {
      handleRemoveFacility(draggedFacility.id);
      setDraggedFacility(null);
    }
  };

  const getFacilityIcon = (type: string) => {
    switch (type) {
      case "store":
        return "🏪";
      case "warehouse":
        return "🏭";
      case "fulfillment":
        return "📦";
      case "distribution":
        return "🚚";
      default:
        return "🏢";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600";
      case "maintenance":
        return "text-yellow-600";
      case "inactive":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const clusterFacilities = editedCluster?.facilities || [];
  // Available facilities are those not present in the cluster's facilities array
  const clusterFacilityIds = new Set(clusterFacilities.map((f) => f.id));
  const availableFacilities = allFacilities.filter(
    (f) => !clusterFacilityIds.has(f.id)
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={cluster?.name || "Cluster"}
        description={cluster?.region || ""}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/clusters/list")}
            >
              {" "}
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clusters{" "}
            </Button>
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </>
            ) : (
              canEditCluster() && (
                <Button onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Cluster
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
            defaultValue={["basic", "facilities", "overrides"]}
            className="space-y-4"
          >
            {/* Basic Information */}
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
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Cluster Name</Label>
                        {isEditing ? (
                          <Input
                            id="name"
                            value={editedCluster?.name}
                            onChange={(e) =>
                              setEditedCluster((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {cluster?.name}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="region">Region</Label>
                        {isEditing ? (
                          <Input
                            id="region"
                            value={editedCluster?.region}
                            onChange={(e) =>
                              setEditedCluster((prev) => ({
                                ...prev,
                                region: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {cluster?.region}
                          </p>
                        )}
                      </div>

                      {/* Status Field */}
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        {isEditing ? (
                          <Select
                            value={
                              editedCluster?.is_active ? "active" : "inactive"
                            }
                            onValueChange={(value) =>
                              setEditedCluster((prev) => ({
                                ...prev,
                                is_active: value === "active",
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {cluster?.is_active ? "Active" : "Inactive"}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Facility Assignment */}
            <AccordionItem value="facilities">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    <span className="font-semibold">Facility Assignment</span>
                    <Badge variant="secondary">
                      {clusterFacilities.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {isEditing && canEditCluster() && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBulkAdd(availableFacilities)}
                            disabled={availableFacilities.length === 0}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Available
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkRemove}
                            disabled={clusterFacilities.length === 0}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove All
                          </Button>
                        </div>
                      )}

                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Available Facilities */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Available Facilities
                          </Label>
                          <div
                            className={cn(
                              "border rounded-lg p-4 min-h-48 max-h-96 overflow-y-auto space-y-2",
                              isEditing &&
                                canEditCluster() &&
                                "border-dashed border-2 border-muted-foreground/25"
                            )}
                            onDragOver={
                              isEditing && canEditCluster()
                                ? handleDragOver
                                : undefined
                            }
                            onDrop={
                              isEditing && canEditCluster()
                                ? handleDropRemove
                                : undefined
                            }
                            onScroll={(e) => {
                              const target = e.target as HTMLDivElement;
                              if (
                                target.scrollTop + target.clientHeight >=
                                target.scrollHeight - 10
                              ) {
                                loadMoreFacilities();
                              }
                            }}
                          >
                            {availableFacilities.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-8">
                                All facilities are assigned to this cluster
                              </p>
                            ) : (
                              availableFacilities.map((facility) => (
                                <div
                                  key={facility.id}
                                  className={cn(
                                    "flex items-center justify-between p-3 border rounded-lg",
                                    isEditing && canEditCluster()
                                      ? "cursor-move hover:bg-muted/50"
                                      : "hover:bg-muted/50"
                                  )}
                                  draggable={isEditing && canEditCluster()}
                                  onDragStart={
                                    isEditing && canEditCluster()
                                      ? () => handleDragStart(facility)
                                      : undefined
                                  }
                                >
                                  <div className="flex items-center gap-3">
                                    {isEditing && canEditCluster() && (
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="text-lg">
                                      {getFacilityIcon(facility.facility_type)}
                                    </span>
                                    <div>
                                      <div className="font-medium">
                                        {facility.name}
                                      </div>
                                      {/* <div className="text-sm text-muted-foreground">
                                        {facility.location}
                                      </div> */}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="capitalize"
                                    >
                                      {facility.facility_type}
                                    </Badge>
                                    {/* <div
                                      className={cn(
                                        "text-sm",
                                        getStatusColor(facility.status)
                                      )}
                                    >
                                      {facility.status}
                                    </div> */}
                                    {isEditing && canEditCluster() && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleAddFacility(facility)
                                        }
                                      >
                                        <ArrowRight className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                            {loadingFacilities && (
                              <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                <span className="ml-2 text-sm text-muted-foreground">
                                  Loading more facilities...
                                </span>
                              </div>
                            )}
                            {!hasMoreFacilities && availableFacilities.length > 0 && (
                              <div className="text-center py-4 text-sm text-muted-foreground">
                                All facilities loaded
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Cluster Facilities */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Cluster Facilities
                          </Label>
                          <div
                            className={cn(
                              "border rounded-lg p-4 min-h-96 max-h-96 overflow-y-auto space-y-2",
                              isEditing &&
                                canEditCluster() &&
                                "border-dashed border-2 border-primary/25 bg-primary/5"
                            )}
                            onDragOver={
                              isEditing && canEditCluster()
                                ? handleDragOver
                                : undefined
                            }
                            onDrop={
                              isEditing && canEditCluster()
                                ? handleDropAdd
                                : undefined
                            }
                          >
                            {clusterFacilities.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-8">
                                No facilities assigned to this cluster
                              </p>
                            ) : (
                              clusterFacilities.map((facility) => (
                                <div
                                  key={facility.id}
                                  className={cn(
                                    "flex items-center justify-between p-3 border rounded-lg bg-primary/5",
                                    isEditing && canEditCluster()
                                      ? "cursor-move hover:bg-primary/10"
                                      : "hover:bg-primary/10"
                                  )}
                                  draggable={isEditing && canEditCluster()}
                                  onDragStart={
                                    isEditing && canEditCluster()
                                      ? () => handleDragStart(facility)
                                      : undefined
                                  }
                                >
                                  <div className="flex items-center gap-3">
                                    {isEditing && canEditCluster() && (
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="text-lg">
                                      {getFacilityIcon(facility.facility_type)}
                                    </span>
                                    <div>
                                      <div className="font-medium">
                                        {facility.name}
                                      </div>
                                      {/* <div className="text-sm text-muted-foreground">
                                        {facility.location}
                                      </div> */}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="capitalize"
                                    >
                                      {facility.facility_type}
                                    </Badge>
                                    {/* <div
                                      className={cn(
                                        "text-sm",
                                        getStatusColor(facility.status)
                                      )}
                                    >
                                      {facility.status}
                                    </div> */}
                                    {isEditing && canEditCluster() && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleRemoveFacility(facility.id)
                                        }
                                      >
                                        <MoveLeft className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {isEditing && canEditCluster() && (
                        <div className="text-sm text-muted-foreground text-center">
                          Drag facilities between lists or use the arrow buttons
                          to assign/remove
                        </div>
                      )}
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Override Settings */}
            {/* <AccordionItem value="overrides">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <span className="font-semibold">Override Settings</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">
                            💰 Pricing Overrides
                          </h4>
                          {isEditing && (
                            <Switch
                              checked={editedCluster.overrides.pricing.enabled}
                              onCheckedChange={(checked) =>
                                setEditedCluster((prev) => ({
                                  ...prev,
                                  overrides: {
                                    ...prev.overrides,
                                    pricing: {
                                      ...prev.overrides.pricing,
                                      enabled: checked,
                                    },
                                  },
                                }))
                              }
                            />
                          )}
                        </div>

                        {editedCluster.overrides.pricing.enabled && (
                          <div className="grid gap-4 md:grid-cols-2 pl-4 border-l-2 border-primary/20">
                            <div className="space-y-2">
                              <Label htmlFor="adjustmentType">
                                Adjustment Type
                              </Label>
                              {isEditing ? (
                                <select
                                  id="adjustmentType"
                                  value={
                                    editedCluster.overrides.pricing
                                      .adjustmentType
                                  }
                                  onChange={(e) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        pricing: {
                                          ...prev.overrides.pricing,
                                          adjustmentType: e.target.value as
                                            | "percentage"
                                            | "fixed",
                                        },
                                      },
                                    }))
                                  }
                                  className="w-full p-2 border rounded"
                                >
                                  <option value="percentage">Percentage</option>
                                  <option value="fixed">Fixed Amount</option>
                                </select>
                              ) : (
                                <Badge variant="outline">
                                  {cluster.overrides.pricing.adjustmentType}
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="adjustment">
                                Adjustment Value
                              </Label>
                              {isEditing ? (
                                <Input
                                  id="adjustment"
                                  type="number"
                                  value={
                                    editedCluster.overrides.pricing.adjustment
                                  }
                                  onChange={(e) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        pricing: {
                                          ...prev.overrides.pricing,
                                          adjustment: parseInt(e.target.value),
                                        },
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {cluster.overrides.pricing.adjustmentType ===
                                  "percentage"
                                    ? `${cluster.overrides.pricing.adjustment}%`
                                    : `$${cluster.overrides.pricing.adjustment}`}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="minPrice">Minimum Price</Label>
                              {isEditing ? (
                                <Input
                                  id="minPrice"
                                  type="number"
                                  value={
                                    editedCluster.overrides.pricing.minimumPrice
                                  }
                                  onChange={(e) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        pricing: {
                                          ...prev.overrides.pricing,
                                          minimumPrice: parseInt(
                                            e.target.value
                                          ),
                                        },
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  ${cluster.overrides.pricing.minimumPrice}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="maxPrice">Maximum Price</Label>
                              {isEditing ? (
                                <Input
                                  id="maxPrice"
                                  type="number"
                                  value={
                                    editedCluster.overrides.pricing.maximumPrice
                                  }
                                  onChange={(e) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        pricing: {
                                          ...prev.overrides.pricing,
                                          maximumPrice: parseInt(
                                            e.target.value
                                          ),
                                        },
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  ${cluster.overrides.pricing.maximumPrice}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">
                            📦 Stock Overrides
                          </h4>
                          {isEditing && (
                            <Switch
                              checked={editedCluster.overrides.stock.enabled}
                              onCheckedChange={(checked) =>
                                setEditedCluster((prev) => ({
                                  ...prev,
                                  overrides: {
                                    ...prev.overrides,
                                    stock: {
                                      ...prev.overrides.stock,
                                      enabled: checked,
                                    },
                                  },
                                }))
                              }
                            />
                          )}
                        </div>

                        {editedCluster.overrides.stock.enabled && (
                          <div className="grid gap-4 md:grid-cols-2 pl-4 border-l-2 border-primary/20">
                            <div className="space-y-2">
                              <Label htmlFor="stockVisibility">
                                Stock Visibility
                              </Label>
                              {isEditing ? (
                                <select
                                  id="stockVisibility"
                                  value={
                                    editedCluster.overrides.stock
                                      .stockVisibility
                                  }
                                  onChange={(e) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        stock: {
                                          ...prev.overrides.stock,
                                          stockVisibility: e.target.value as
                                            | "shared"
                                            | "independent"
                                            | "hybrid",
                                        },
                                      },
                                    }))
                                  }
                                  className="w-full p-2 border rounded"
                                >
                                  <option value="shared">Shared</option>
                                  <option value="independent">
                                    Independent
                                  </option>
                                  <option value="hybrid">Hybrid</option>
                                </select>
                              ) : (
                                <Badge variant="outline">
                                  {cluster.overrides.stock.stockVisibility}
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="minStock">Min Stock Level</Label>
                              {isEditing ? (
                                <Input
                                  id="minStock"
                                  type="number"
                                  value={
                                    editedCluster.overrides.stock.minStockLevel
                                  }
                                  onChange={(e) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        stock: {
                                          ...prev.overrides.stock,
                                          minStockLevel: parseInt(
                                            e.target.value
                                          ),
                                        },
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {cluster.overrides.stock.minStockLevel}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="maxStock">Max Stock Level</Label>
                              {isEditing ? (
                                <Input
                                  id="maxStock"
                                  type="number"
                                  value={
                                    editedCluster.overrides.stock.maxStockLevel
                                  }
                                  onChange={(e) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        stock: {
                                          ...prev.overrides.stock,
                                          maxStockLevel: parseInt(
                                            e.target.value
                                          ),
                                        },
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {cluster.overrides.stock.maxStockLevel}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="reorderPoint">
                                Reorder Point
                              </Label>
                              {isEditing ? (
                                <Input
                                  id="reorderPoint"
                                  type="number"
                                  value={
                                    editedCluster.overrides.stock.reorderPoint
                                  }
                                  onChange={(e) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        stock: {
                                          ...prev.overrides.stock,
                                          reorderPoint: parseInt(
                                            e.target.value
                                          ),
                                        },
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {cluster.overrides.stock.reorderPoint}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">
                            🚚 Shipping Overrides
                          </h4>
                          {isEditing && (
                            <Switch
                              checked={editedCluster.overrides.shipping.enabled}
                              onCheckedChange={(checked) =>
                                setEditedCluster((prev) => ({
                                  ...prev,
                                  overrides: {
                                    ...prev.overrides,
                                    shipping: {
                                      ...prev.overrides.shipping,
                                      enabled: checked,
                                    },
                                  },
                                }))
                              }
                            />
                          )}
                        </div>

                        {editedCluster.overrides.shipping.enabled && (
                          <div className="grid gap-4 md:grid-cols-2 pl-4 border-l-2 border-primary/20">
                            <div className="space-y-2">
                              <Label htmlFor="freeShippingThreshold">
                                Free Shipping Threshold
                              </Label>
                              {isEditing ? (
                                <Input
                                  id="freeShippingThreshold"
                                  type="number"
                                  value={
                                    editedCluster.overrides.shipping
                                      .freeShippingThreshold
                                  }
                                  onChange={(e) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        shipping: {
                                          ...prev.overrides.shipping,
                                          freeShippingThreshold: parseInt(
                                            e.target.value
                                          ),
                                        },
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  $
                                  {
                                    cluster.overrides.shipping
                                      .freeShippingThreshold
                                  }
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="shippingCost">
                                Shipping Cost Override
                              </Label>
                              {isEditing ? (
                                <Input
                                  id="shippingCost"
                                  type="number"
                                  value={
                                    editedCluster.overrides.shipping
                                      .shippingCostOverride
                                  }
                                  onChange={(e) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        shipping: {
                                          ...prev.overrides.shipping,
                                          shippingCostOverride: parseInt(
                                            e.target.value
                                          ),
                                        },
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  $
                                  {
                                    cluster.overrides.shipping
                                      .shippingCostOverride
                                  }
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="priorityShipping">
                                Priority Shipping
                              </Label>
                              {isEditing ? (
                                <Switch
                                  id="priorityShipping"
                                  checked={
                                    editedCluster.overrides.shipping
                                      .priorityShipping
                                  }
                                  onCheckedChange={(checked) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        shipping: {
                                          ...prev.overrides.shipping,
                                          priorityShipping: checked,
                                        },
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <Badge
                                  variant={
                                    cluster.overrides.shipping.priorityShipping
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {cluster.overrides.shipping.priorityShipping
                                    ? "Enabled"
                                    : "Disabled"}
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="expressShipping">
                                Express Shipping
                              </Label>
                              {isEditing ? (
                                <Switch
                                  id="expressShipping"
                                  checked={
                                    editedCluster.overrides.shipping
                                      .expressShipping
                                  }
                                  onCheckedChange={(checked) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        shipping: {
                                          ...prev.overrides.shipping,
                                          expressShipping: checked,
                                        },
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <Badge
                                  variant={
                                    cluster.overrides.shipping.expressShipping
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {cluster.overrides.shipping.expressShipping
                                    ? "Enabled"
                                    : "Disabled"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">
                            ⚙️ Operations Overrides
                          </h4>
                          {isEditing && (
                            <Switch
                              checked={
                                editedCluster.overrides.operations.enabled
                              }
                              onCheckedChange={(checked) =>
                                setEditedCluster((prev) => ({
                                  ...prev,
                                  overrides: {
                                    ...prev.overrides,
                                    operations: {
                                      ...prev.overrides.operations,
                                      enabled: checked,
                                    },
                                  },
                                }))
                              }
                            />
                          )}
                        </div>

                        {editedCluster.overrides.operations.enabled && (
                          <div className="grid gap-4 md:grid-cols-2 pl-4 border-l-2 border-primary/20">
                            <div className="space-y-2">
                              <Label htmlFor="autoRestock">Auto Restock</Label>
                              {isEditing ? (
                                <Switch
                                  id="autoRestock"
                                  checked={
                                    editedCluster.overrides.operations
                                      .autoRestock
                                  }
                                  onCheckedChange={(checked) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        operations: {
                                          ...prev.overrides.operations,
                                          autoRestock: checked,
                                        },
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <Badge
                                  variant={
                                    cluster.overrides.operations.autoRestock
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {cluster.overrides.operations.autoRestock
                                    ? "Enabled"
                                    : "Disabled"}
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="stockThreshold">
                                Stock Threshold
                              </Label>
                              {isEditing ? (
                                <Input
                                  id="stockThreshold"
                                  type="number"
                                  value={
                                    editedCluster.overrides.operations
                                      .stockThreshold
                                  }
                                  onChange={(e) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        operations: {
                                          ...prev.overrides.operations,
                                          stockThreshold: parseInt(
                                            e.target.value
                                          ),
                                        },
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {cluster.overrides.operations.stockThreshold}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="crossDocking">
                                Cross Docking
                              </Label>
                              {isEditing ? (
                                <Switch
                                  id="crossDocking"
                                  checked={
                                    editedCluster.overrides.operations
                                      .crossDocking
                                  }
                                  onCheckedChange={(checked) =>
                                    setEditedCluster((prev) => ({
                                      ...prev,
                                      overrides: {
                                        ...prev.overrides,
                                        operations: {
                                          ...prev.overrides.operations,
                                          crossDocking: checked,
                                        },
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <Badge
                                  variant={
                                    cluster.overrides.operations.crossDocking
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {cluster.overrides.operations.crossDocking
                                    ? "Enabled"
                                    : "Disabled"}
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="operatingHours">
                                Operating Hours
                              </Label>
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <Input
                                    type="time"
                                    value={
                                      editedCluster.overrides.operations
                                        .operatingHours.start
                                    }
                                    onChange={(e) =>
                                      setEditedCluster((prev) => ({
                                        ...prev,
                                        overrides: {
                                          ...prev.overrides,
                                          operations: {
                                            ...prev.overrides.operations,
                                            operatingHours: {
                                              ...prev.overrides.operations
                                                .operatingHours,
                                              start: e.target.value,
                                            },
                                          },
                                        },
                                      }))
                                    }
                                  />
                                  <Input
                                    type="time"
                                    value={
                                      editedCluster.overrides.operations
                                        .operatingHours.end
                                    }
                                    onChange={(e) =>
                                      setEditedCluster((prev) => ({
                                        ...prev,
                                        overrides: {
                                          ...prev.overrides,
                                          operations: {
                                            ...prev.overrides.operations,
                                            operatingHours: {
                                              ...prev.overrides.operations
                                                .operatingHours,
                                              end: e.target.value,
                                            },
                                          },
                                        },
                                      }))
                                    }
                                  />
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {
                                    cluster.overrides.operations.operatingHours
                                      .start
                                  }{" "}
                                  -{" "}
                                  {
                                    cluster.overrides.operations.operatingHours
                                      .end
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem> */}
          </Accordion>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cluster Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Badge variant={cluster?.is_active ? "default" : "secondary"}>
                  {cluster?.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div>
                <Label className="text-sm font-medium">Facilities</Label>
                <p className="text-2xl font-bold">{clusterFacilities.length}</p>
              </div>

              {/* <div>
                <Label className="text-sm font-medium">Price Adjustment</Label>
                <p
                  className={cn(
                    "text-sm",
                    cluster?.priceAdjustment > 0
                      ? "text-green-600"
                      : cluster?.priceAdjustment < 0
                      ? "text-red-600"
                      : ""
                  )}
                >
                  {cluster?.priceAdjustment > 0 ? "+" : ""}
                  {cluster?.priceAdjustment}%
                </p>
              </div> */}

              {/* <div>
                <Label className="text-sm font-medium">Stock Sharing</Label>
                <Badge variant={cluster?.shareStock ? "default" : "secondary"}>
                  {cluster?.shareStock ? "Shared" : "Independent"}
                </Badge>
              </div> */}
            </CardContent>
          </Card>

          {/* <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/assignments/matrix")}
              >
                <Users className="mr-2 h-4 w-4" />
                Assignment Matrix
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/clusters/override")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Override Settings
              </Button>
            </CardContent>
          </Card> */}
        </div>
      </div>
    </div>
  );
}
