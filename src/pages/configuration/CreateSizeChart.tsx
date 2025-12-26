import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LevelCategoryDropdown,
  LevelCategory,
} from "@/components/ui/level-category-dropdown";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Ruler,
  Tag,
  Activity,
} from "lucide-react";
import { SizeChartRequest, Category } from "@/types";

interface Measurement {
  id?: number;
  name: string;
  unit: string;
  is_required: boolean;
  is_active: boolean;
  rank: number;
}

const CreateSizeChart = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    category: "",
    attribute: "",
    name: "",
    description: "",
    is_active: true,
  });

  // Selected category state for level dropdown
  const [selectedCategory, setSelectedCategory] =
    useState<LevelCategory | null>(null);

  const [measurements, setMeasurements] = useState<Measurement[]>([
    {
      name: "",
      unit: "inches",
      is_required: true,
      is_active: true,
      rank: 1,
    },
  ]);

  // Fetch attributes
  const { data: attributesData, isLoading: attributesLoading } = useQuery({
    queryKey: ["attributes"],
    queryFn: () => ApiService.getAttributes(1, 100),
  });

  const attributes = attributesData?.results || [];

  // Create size chart mutation
  const createSizeChartMutation = useMutation({
    mutationFn: (data: SizeChartRequest) => ApiService.createSizeChart(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["size-charts"] });
      toast({
        title: "Success",
        description: "Size chart created successfully",
      });
      navigate("/configuration/size-charts");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create size chart",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCategoryChange = (category: LevelCategory | null) => {
    setSelectedCategory(category);
    setFormData((prev) => ({
      ...prev,
      category: category?.id || "",
    }));
  };

  const addMeasurement = () => {
    const newRank = measurements.length + 1;
    setMeasurements((prev) => [
      ...prev,
      {
        name: "",
        unit: "inches",
        is_required: false,
        is_active: true,
        rank: newRank,
      },
    ]);
  };

  const removeMeasurement = (index: number) => {
    if (measurements.length > 1) {
      setMeasurements((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        // Update ranks
        return updated.map((measurement, i) => ({
          ...measurement,
          rank: i + 1,
        }));
      });
    }
  };

  const updateMeasurement = (index: number, field: string, value: any) => {
    setMeasurements((prev) =>
      prev.map((measurement, i) =>
        i === index ? { ...measurement, [field]: value } : measurement
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!selectedCategory || !formData.attribute || !formData.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate measurements
    const validMeasurements = measurements.filter((m) => m.name.trim() !== "");

    if (validMeasurements.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one measurement",
        variant: "destructive",
      });
      return;
    }

    const sizeChartData: SizeChartRequest = {
      category: parseInt(selectedCategory.id),
      attribute: parseInt(formData.attribute),
      name: formData.name,
      description: formData.description,
      is_active: formData.is_active,
      measurements: validMeasurements,
    };

    createSizeChartMutation.mutate(sizeChartData);
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Create Size Chart"
        description="Create a new size chart with measurements for a specific category and attribute"
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("/configuration/size-charts")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Size Charts
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Provide basic details for the size chart
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <LevelCategoryDropdown
                  value={selectedCategory}
                  onValueChange={handleCategoryChange}
                  placeholder="Select category (SS-Cat & SSS-Cat only)"
                  searchPlaceholder="Search categories..."
                  emptyMessage="No SS-Cat or SSS-Cat categories found."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attribute">Attribute *</Label>
                <Select
                  value={formData.attribute}
                  onValueChange={(value) =>
                    handleInputChange("attribute", value)
                  }
                  disabled={attributesLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        attributesLoading
                          ? "Loading attributes..."
                          : "Select an attribute"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.map((attribute) => (
                      <SelectItem
                        key={attribute.id}
                        value={attribute.id.toString()}
                      >
                        {attribute.name} ({attribute.attribute_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., T-Shirt Size Guide"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="e.g., Standard T-shirt sizing measurements"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  handleInputChange("is_active", checked)
                }
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </CardContent>
        </Card>

        {/* Measurements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Measurements</CardTitle>
                <CardDescription>
                  Define the measurements for this size chart
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={addMeasurement}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Measurement
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {measurements.map((measurement, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Measurement {index + 1}</h4>
                  {measurements.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeMeasurement(index)}
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`measurement-name-${index}`}>Name *</Label>
                    <Input
                      id={`measurement-name-${index}`}
                      value={measurement.name}
                      onChange={(e) =>
                        updateMeasurement(index, "name", e.target.value)
                      }
                      placeholder="e.g., Chest"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`measurement-unit-${index}`}>Unit *</Label>
                    <Select
                      value={measurement.unit}
                      onValueChange={(value) =>
                        updateMeasurement(index, "unit", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inches">Inches</SelectItem>
                        <SelectItem value="cm">Centimeters</SelectItem>
                        <SelectItem value="mm">Millimeters</SelectItem>
                        <SelectItem value="feet">Feet</SelectItem>
                        <SelectItem value="meters">Meters</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`measurement-required-${index}`}
                      checked={measurement.is_required}
                      onCheckedChange={(checked) =>
                        updateMeasurement(index, "is_required", checked)
                      }
                    />
                    <Label htmlFor={`measurement-required-${index}`}>
                      Required
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`measurement-active-${index}`}
                      checked={measurement.is_active}
                      onCheckedChange={(checked) =>
                        updateMeasurement(index, "is_active", checked)
                      }
                    />
                    <Label htmlFor={`measurement-active-${index}`}>
                      Active
                    </Label>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/configuration/size-charts")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={createSizeChartMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createSizeChartMutation.isPending
              ? "Creating..."
              : "Create Size Chart"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateSizeChart;
