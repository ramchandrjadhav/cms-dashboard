import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Settings,
  Type,
  X,
  GripVertical,
  Loader2,
} from "lucide-react";
import {
  Section,
  SectionField,
  SectionRequest,
  SectionFieldRequest,
} from "@/types";
import {
  LevelCategoryDropdown,
  LevelCategory,
} from "@/components/ui/level-category-dropdown";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/api";

const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "richtext", label: "Rich Text" },
  { value: "number", label: "Number" },
  { value: "decimal", label: "Decimal" },
  { value: "image", label: "Image" },
  { value: "file", label: "File" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & Time" },
  { value: "time", label: "Time" },
  { value: "boolean", label: "Yes/No" },
  { value: "select", label: "Dropdown" },
  { value: "multiselect", label: "Multi Select" },
  { value: "radio", label: "Radio Buttons" },
  { value: "checkbox", label: "Checkboxes" },
];

// Sortable Option Item Component
interface SortableOptionItemProps {
  option: string;
  optionIndex: number;
  fieldIndex: number;
  onOptionChange: (
    fieldIndex: number,
    optionIndex: number,
    value: string
  ) => void;
  onRemoveOption: (fieldIndex: number, optionIndex: number) => void;
  onOptionEnterKey: (
    fieldIndex: number,
    optionIndex: number,
    currentValue: string
  ) => void;
  inputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
}

const SortableOptionItem = ({
  option,
  optionIndex,
  fieldIndex,
  onOptionChange,
  onRemoveOption,
  onOptionEnterKey,
  inputRefs,
}: SortableOptionItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `option-${optionIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-2 p-3 border rounded-lg ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      <Input
        ref={(el) => {
          inputRefs.current[`field-${fieldIndex}-option-${optionIndex}`] = el;
        }}
        value={option}
        onChange={(e) =>
          onOptionChange(fieldIndex, optionIndex, e.target.value)
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onOptionEnterKey(fieldIndex, optionIndex, option);
          }
        }}
        placeholder="Enter option"
        className="flex-1"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => onRemoveOption(fieldIndex, optionIndex)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const CreateEditSection = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  // Section state
  const [section, setSection] = useState({
    category: 1, // Default category ID
    name: "",
    description: "",
    is_collapsed: false,
    is_active: true,
    rank: 0,
  });

  // Selected category state for level dropdown
  const [selectedCategory, setSelectedCategory] =
    useState<LevelCategory | null>(null);

  // Loading state for category dropdown
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  // Debug selectedCategory changes
  useEffect(() => {
    console.log("selectedCategory state changed:", selectedCategory);
  }, [selectedCategory]);

  // Fields state
  const [fields, setFields] = useState<SectionFieldRequest[]>([]);

  // Ref for input fields to enable auto-focus
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch section data for editing
  const {
    data: sectionData,
    isLoading: isLoadingSection,
    error: sectionError,
  } = useQuery({
    queryKey: ["section", id],
    queryFn: async () => {
      console.log("Fetching section data for ID:", id);
      const result = await ApiService.getSection(Number(id));
      console.log("Section data fetched:", result);
      return result;
    },
    enabled: isEdit,
  });

  // Update state when section data is loaded
  useEffect(() => {
    if (sectionData) {
      setSection({
        category: sectionData.category?.id || 1,
        name: sectionData.name,
        description: sectionData.description,
        is_collapsed: sectionData.is_collapsed || false,
        is_active: sectionData.is_active || true,
        rank: sectionData.rank || 0,
      });

      // Set selected category for level dropdown
      if (sectionData.category) {
        const categoryData = {
          id: sectionData.category.id.toString(),
          name: sectionData.category.name,
        };
        setSelectedCategory(categoryData);
      } else {
        const categoryId =
          sectionData.category?.id ||
          (sectionData as any).category_id ||
          section.category;
        if (categoryId) {
          setIsCategoryLoading(true);
          ApiService.getCategory(categoryId.toString())
            .then((categoryData) => {
              if (categoryData) {
                setSelectedCategory({
                  id: categoryData.id.toString(),
                  name: categoryData.name,
                });
              }
              setIsCategoryLoading(false);
            })
            .catch((error) => {
              console.error("Error fetching category:", error);
              setIsCategoryLoading(false);
            });
        } else {
          setIsCategoryLoading(false);
        }
      }
      setFields(
        sectionData.fields?.map((field) => ({
          name: field.name,
          label: field.name,
          field_type: field.field_type,
          placeholder: "",
          is_required: field.is_required,
          width_class: "col-12",
          rank: 0,
          options: field.options || [],
        })) || []
      );
    }
  }, [sectionData]);

  // API mutations for create/update
  const createSectionMutation = useMutation({
    mutationFn: (data: SectionRequest) => ApiService.createSection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast({
        title: "Success",
        description: "Section created successfully",
      });
      navigate("/configuration/sections");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to create section",
        variant: "destructive",
      });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SectionRequest }) =>
      ApiService.updateSection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      queryClient.invalidateQueries({ queryKey: ["section", id] });
      toast({
        title: "Success",
        description: "Section updated successfully",
      });
      navigate("/configuration/sections");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update section",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!section.name.trim()) {
      toast({
        title: "Error",
        description: "Section name is required",
        variant: "destructive",
      });
      return;
    }

    const sectionData: any = {
      name: section.name.trim(),
      description: section.description.trim(),
      is_collapsed: section.is_collapsed,
      is_active: section.is_active,
      rank: section.rank,
      fields: fields,
    };

    console.log("Sending section data:", sectionData);

    if (isEdit) {
      console.log("Updating section with ID:", id);
      updateSectionMutation.mutate({ id: Number(id), data: sectionData });
    } else {
      console.log("Creating new section");
      createSectionMutation.mutate(sectionData);
    }
  };

  const handleAddField = () => {
    const newField: SectionFieldRequest = {
      name: "",
      label: "",
      field_type: "text",
      placeholder: "",
      is_required: false,
      width_class: "col-12",
      rank: fields.length + 1,
      options: [],
    };
    setFields([...fields, newField]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (
    index: number,
    field: keyof SectionFieldRequest,
    value: any
  ) => {
    const updatedFields = fields.map((f, i) =>
      i === index ? { ...f, [field]: value } : f
    );
    setFields(updatedFields);
  };

  const handleSectionChange = (field: keyof typeof section, value: any) => {
    setSection({ ...section, [field]: value });
  };

  const handleCategoryChange = (category: LevelCategory | null) => {
    setSelectedCategory(category);
    if (category) {
      setSection({ ...section, category: parseInt(category.id) });
    }
  };

  const handleAddOption = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    const newOptions = [...(field.options || []), ""];
    handleFieldChange(fieldIndex, "options", newOptions);
  };

  const handleOptionEnterKey = (
    fieldIndex: number,
    optionIndex: number,
    currentValue: string
  ) => {
    if (currentValue.trim()) {
      // If there's text, add a new option at the bottom and keep current field cleared
      const field = fields[fieldIndex];
      const newOptions = [...(field.options || [])];
      newOptions[optionIndex] = ""; // Clear current field
      newOptions.push(currentValue); // Add current text as new option at the bottom
      handleFieldChange(fieldIndex, "options", newOptions);

      // Keep focus on the current field (which is now cleared)
      setTimeout(() => {
        const currentFieldKey = `field-${fieldIndex}-option-${optionIndex}`;
        const currentField = inputRefs.current[currentFieldKey];
        if (currentField) {
          currentField.focus();
        }
      }, 0);
    } else {
      // If no text, just add an empty option at the bottom
      handleAddOption(fieldIndex);

      // Keep focus on the current field
      setTimeout(() => {
        const currentFieldKey = `field-${fieldIndex}-option-${optionIndex}`;
        const currentField = inputRefs.current[currentFieldKey];
        if (currentField) {
          currentField.focus();
        }
      }, 0);
    }
  };

  const handleRemoveOption = (fieldIndex: number, optionIndex: number) => {
    const field = fields[fieldIndex];
    const newOptions = field.options?.filter((_, i) => i !== optionIndex) || [];
    handleFieldChange(fieldIndex, "options", newOptions);
  };

  const handleDragEnd = (event: DragEndEvent, fieldIndex: number) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const field = fields[fieldIndex];
      const oldIndex =
        field.options?.findIndex(
          (_, index) => `option-${index}` === active.id
        ) ?? -1;
      const newIndex =
        field.options?.findIndex((_, index) => `option-${index}` === over.id) ??
        -1;

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOptions = arrayMove(field.options || [], oldIndex, newIndex);
        handleFieldChange(fieldIndex, "options", newOptions);
      }
    }
  };

  const handleOptionChange = (
    fieldIndex: number,
    optionIndex: number,
    value: string
  ) => {
    const field = fields[fieldIndex];
    const newOptions =
      field.options?.map((opt, i) => (i === optionIndex ? value : opt)) || [];
    handleFieldChange(fieldIndex, "options", newOptions);
  };

  const getFieldTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      text: "bg-blue-100 text-blue-800",
      textarea: "bg-blue-100 text-blue-800",
      richtext: "bg-blue-100 text-blue-800",
      number: "bg-green-100 text-green-800",
      decimal: "bg-green-100 text-green-800",
      boolean: "bg-purple-100 text-purple-800",
      select: "bg-orange-100 text-orange-800",
      multiselect: "bg-orange-100 text-orange-800",
      radio: "bg-orange-100 text-orange-800",
      checkbox: "bg-orange-100 text-orange-800",
      date: "bg-red-100 text-red-800",
      datetime: "bg-red-100 text-red-800",
      time: "bg-red-100 text-red-800",
      image: "bg-yellow-100 text-yellow-800",
      file: "bg-yellow-100 text-yellow-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  if (isLoadingSection) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title={isEdit ? "Edit Section" : "Create Section"}
          description={
            isEdit
              ? "Update section details and fields"
              : "Create a new section with custom fields"
          }
        />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading section data...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sectionError) {
    console.error("Error loading section:", sectionError);
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title={isEdit ? "Edit Section" : "Create Section"}
          description={
            isEdit
              ? "Update section details and fields"
              : "Create a new section with custom fields"
          }
        />
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading section:{" "}
              {sectionError.message || "Please try again."}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={isEdit ? "Edit Section" : "Create Section"}
        description={
          isEdit
            ? "Update section details and fields"
            : "Create a new section with custom fields"
        }
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("/configuration/sections")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sections
          </Button>
        }
      />

      {/* Section Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Section Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={section.name}
                onChange={(e) => handleSectionChange("name", e.target.value)}
                placeholder="Enter section name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={section.description}
                onChange={(e) =>
                  handleSectionChange("description", e.target.value)
                }
                placeholder="Enter section description"
              />
            </div>

            {/* Removed Category selection field as requested */}

            <div className="space-y-2">
              <Label htmlFor="rank">Rank</Label>
              <Input
                id="rank"
                type="number"
                value={section.rank}
                onChange={(e) =>
                  handleSectionChange("rank", parseInt(e.target.value))
                }
                placeholder="Enter rank"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_collapsed"
                checked={section.is_collapsed}
                onCheckedChange={(checked) =>
                  handleSectionChange("is_collapsed", checked)
                }
              />
              <Label htmlFor="is_collapsed">Is Collapsed</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={section.is_active}
                onCheckedChange={(checked) =>
                  handleSectionChange("is_active", checked)
                }
              />
              <Label htmlFor="is_active">Is Active</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Type className="h-5 w-5" />
              <span>Fields ({fields.length})</span>
            </CardTitle>
            <Button onClick={handleAddField} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No fields added yet. Click "Add Field" to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Field {index + 1}</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveField(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`field-name-${index}`}>Name *</Label>
                        <Input
                          id={`field-name-${index}`}
                          value={field.name}
                          onChange={(e) =>
                            handleFieldChange(index, "name", e.target.value)
                          }
                          placeholder="Enter field name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`field-type-${index}`}>Type</Label>
                        <Select
                          value={field.field_type}
                          onValueChange={(value) =>
                            handleFieldChange(index, "field_type", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`field-label-${index}`}>Label *</Label>
                        <Input
                          id={`field-label-${index}`}
                          value={field.label}
                          onChange={(e) =>
                            handleFieldChange(index, "label", e.target.value)
                          }
                          placeholder="Enter field label"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`field-placeholder-${index}`}>
                          Placeholder
                        </Label>
                        <Input
                          id={`field-placeholder-${index}`}
                          value={field.placeholder || ""}
                          onChange={(e) =>
                            handleFieldChange(
                              index,
                              "placeholder",
                              e.target.value
                            )
                          }
                          placeholder="Enter placeholder text"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`field-width-${index}`}>
                          Width Class
                        </Label>
                        <Select
                          value={field.width_class}
                          onValueChange={(value) =>
                            handleFieldChange(index, "width_class", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="col-12">
                              Full Width (col-12)
                            </SelectItem>
                            <SelectItem value="col-6">
                              Half Width (col-6)
                            </SelectItem>
                            <SelectItem value="col-4">
                              One Third (col-4)
                            </SelectItem>
                            <SelectItem value="col-3">
                              One Quarter (col-3)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`field-rank-${index}`}>Rank</Label>
                        <Input
                          id={`field-rank-${index}`}
                          type="number"
                          value={field.rank}
                          onChange={(e) =>
                            handleFieldChange(
                              index,
                              "rank",
                              parseInt(e.target.value)
                            )
                          }
                          placeholder="Enter rank"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`field-required-${index}`}
                        checked={field.is_required}
                        onCheckedChange={(checked) =>
                          handleFieldChange(index, "is_required", checked)
                        }
                      />
                      <Label htmlFor={`field-required-${index}`}>
                        Required
                      </Label>
                    </div>

                    {/* Options for select, multiselect, radio, and checkbox */}
                    {(field.field_type === "select" ||
                      field.field_type === "multiselect" ||
                      field.field_type === "radio" ||
                      field.field_type === "checkbox") && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleDragEnd(event, index)}
                        >
                          <SortableContext
                            items={
                              field.options?.map(
                                (_, optionIndex) => `option-${optionIndex}`
                              ) || []
                            }
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {field.options?.map((option, optionIndex) => (
                                <SortableOptionItem
                                  key={optionIndex}
                                  option={option}
                                  optionIndex={optionIndex}
                                  fieldIndex={index}
                                  onOptionChange={handleOptionChange}
                                  onRemoveOption={handleRemoveOption}
                                  onOptionEnterKey={handleOptionEnterKey}
                                  inputRefs={inputRefs}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddOption(index)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                    )}

                    {/* Field type badge */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        Type:
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${getFieldTypeColor(
                          field.field_type
                        )}`}
                      >
                        {field.field_type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => navigate("/configuration/sections")}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={
            createSectionMutation.isPending || updateSectionMutation.isPending
          }
        >
          <Save className="h-4 w-4 mr-2" />
          {createSectionMutation.isPending || updateSectionMutation.isPending
            ? "Saving..."
            : isEdit
            ? "Update Section"
            : "Create Section"}
        </Button>
      </div>
    </div>
  );
};

export default CreateEditSection;
