import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowLeft, Save, Settings, Layers, ChevronDown, Check, X } from "lucide-react";
import { Tab, TabRequest, Section } from "@/types";
import {
  LevelCategoryDropdown,
  LevelCategory,
} from "@/components/ui/level-category-dropdown";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/api";
import type { Category } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getCategoryLevelBadgeVariant, getCategoryLevelLabel } from "@/lib/category-level";

const CreateEditTab = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  // Tab state
  const [tab, setTab] = useState({
    category: 1, // Default category ID
    name: "",
    description: "",
  });

  // Selected category state for level dropdown (single for edit)
  const [selectedCategory, setSelectedCategory] =
    useState<LevelCategory | null>(null);
  // New: multiple categories for create payload
  const [selectedCategories, setSelectedCategories] = useState<LevelCategory[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [allCategories, setAllCategories] = useState<LevelCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  // Selected sections state (array of section IDs)
  const [selectedSections, setSelectedSections] = useState<number[]>([]);

  // Fetch tab data for editing
  const {
    data: tabData,
    isLoading: isLoadingTab,
    error: tabError,
  } = useQuery({
    queryKey: ["tab", id],
    queryFn: async () => {
      console.log("Fetching tab data for ID:", id);
      const result = await ApiService.getTab(Number(id));
      console.log("Tab data fetched:", result);
      return result;
    },
    enabled: isEdit,
  });

  // Fetch sections from API
  const {
    data: sectionsData,
    isLoading: isLoadingSections,
    error: sectionsError,
  } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      console.log("Fetching sections data");
      const result = await ApiService.getSections(1, 1000); // Get all sections
      console.log("Sections data fetched:", result);
      return result.results;
    },
  });

  // Update state when tab data is loaded
  useEffect(() => {
    if (tabData) {
      console.log("Tab data loaded for editing:", tabData);
      setTab({
        category: tabData.category.id,
        name: tabData.name,
        description: tabData.description,
      });
      // Set selected category for hierarchical dropdown
      setSelectedCategory({
        id: tabData.category.id.toString(),
        name: tabData.category.name,
      });
      setSelectedCategories([{ id: tabData.category.id.toString(), name: tabData.category.name }]);
      // Map section IDs from the tab's sections
      setSelectedSections(tabData.sections?.map((section) => section.id) || []);
    }
  }, [tabData]);

  // Fetch categories for multi-select (SS/SSS only)
  useEffect(() => {
    const fetch = async () => {
      setLoadingCategories(true);
      try {
        const data = await ApiService.getCategories(1, 1000);
        const flattenCategoriesWithLevel = (
          categories: Category[],
          level = 0
        ): LevelCategory[] => {
          const result: LevelCategory[] = [];
          categories.forEach((c) => {
            result.push({
              id: String(c.id),
              name: c.name,
              description: c.description,
              is_active: c.is_active,
              parent: c.parent ? String(c.parent) : undefined,
              level,
            });
            if ((c as any).children && (c as any).children.length > 0) {
              result.push(
                ...flattenCategoriesWithLevel((c as any).children, level + 1)
              );
            }
          });
          return result;
        };
        const flattened = flattenCategoriesWithLevel(data);
        const filtered = flattened.filter(
          (cat) => cat.level === 2 || cat.level === 3
        );
        setAllCategories(filtered);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetch();
  }, []);

  // API mutations for create/update
  const createTabMutation = useMutation({
    mutationFn: (data: TabRequest) => ApiService.createTab(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tabs"] });
      toast({
        title: "Success",
        description: "Tab created successfully",
      });
      navigate("/configuration/tabs");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create tab",
        variant: "destructive",
      });
    },
  });

  const updateTabMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TabRequest }) =>
      ApiService.updateTab(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tabs"] });
      queryClient.invalidateQueries({ queryKey: ["tab", id] });
      toast({
        title: "Success",
        description: "Tab updated successfully",
      });
      navigate("/configuration/tabs");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update tab",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!isEdit && selectedCategories.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one category",
        variant: "destructive",
      });
      return;
    }

    if (!tab.name.trim()) {
      toast({
        title: "Error",
        description: "Tab name is required",
        variant: "destructive",
      });
      return;
    }

    const createPayload = {
      categories: selectedCategories.map((c) => parseInt(c.id)),
      name: tab.name.trim(),
      sections: selectedSections,
      is_active: true,
    };
    const updatePayload: TabRequest = {
      category: tab.category,
      name: tab.name.trim(),
      description: tab.description.trim(),
      is_active: true,
      rank: 0,
      sections: selectedSections,
    };

    console.log("Sending tab data:", tabData);

    if (isEdit) {
      console.log("Updating tab with ID:", id);
      updateTabMutation.mutate({ id: Number(id), data: updatePayload });
    } else {
      console.log("Creating new tab");
      createTabMutation.mutate(createPayload as any);
    }
  };

  const handleSectionToggle = (sectionId: number) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleTabChange = (field: keyof typeof tab, value: any) => {
    setTab({ ...tab, [field]: value });
  };

  const handleCategoryChange = (category: LevelCategory | null) => {
    setSelectedCategory(category);
    if (category) {
      setTab({ ...tab, category: parseInt(category.id) });
    }
  };

  const handleCategoriesChange = (categories: LevelCategory[]) => {
    setSelectedCategories(categories);
  };

  // Get selected sections data for display
  const selectedSectionsData = selectedSections
    .map((id) => sectionsData?.find((section) => section.id === id))
    .filter(Boolean) as Section[];

  if (isLoadingTab) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title={isEdit ? "Edit Tab" : "Create Tab"}
          description={
            isEdit
              ? "Update tab details and sections"
              : "Create a new tab with sections"
          }
        />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tabError) {
    console.error("Error loading tab:", tabError);
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title={isEdit ? "Edit Tab" : "Create Tab"}
          description={
            isEdit
              ? "Update tab details and sections"
              : "Create a new tab with sections"
          }
        />
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading tab: {tabError.message || "Please try again."}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={isEdit ? "Edit Tab" : "Create Tab"}
        description={
          isEdit
            ? "Update tab details and sections"
            : "Create a new tab with sections"
        }
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("/configuration/tabs")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tabs
          </Button>
        }
      />

      {/* Tab Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Tab Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Category{isEdit ? "" : "(ies)"} *</Label>
              {isEdit ? (
                <LevelCategoryDropdown
                  value={selectedCategory}
                  onValueChange={handleCategoryChange}
                  placeholder="Select category (SS/SSS only)"
                  searchPlaceholder="Search categories..."
                  emptyMessage="No categories found."
                />
              ) : (
                <>
                  <Popover open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                    <div className="relative">
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="truncate text-left">
                            {selectedCategories.length
                              ? `${selectedCategories.length} selected`
                              : "Select one or more categories"}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      {selectedCategories.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-9 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                          onClick={() => setSelectedCategories([])}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="end">
                      <Command className="max-h-72">
                        <CommandInput
                          placeholder="Search categories..."
                          value={categorySearch}
                          onValueChange={setCategorySearch}
                        />
                        <CommandList className="flex-1 overflow-auto">
                          <CommandEmpty>
                            {loadingCategories ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">Loading categories...</div>
                            ) : (
                              "No categories found."
                            )}
                          </CommandEmpty>
                          <CommandGroup>
                            {allCategories
                              .filter((c) =>
                                !categorySearch.trim() ||
                                c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                                (c.description || "").toLowerCase().includes(categorySearch.toLowerCase())
                              )
                              .map((c) => {
                                const checked = selectedCategories.some((sc) => sc.id === c.id);
                                return (
                                  <CommandItem
                                    key={c.id}
                                    value={c.name}
                                    className="flex items-center justify-between mt-1"
                                    onSelect={() => {
                                      setSelectedCategories((prev) =>
                                        prev.some((p) => p.id === c.id)
                                          ? prev.filter((p) => p.id !== c.id)
                                          : [...prev, c]
                                      );
                                    }}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <Check className={`h-4 w-4 ${checked ? "opacity-100" : "opacity-0"}`} />
                                      <span className="truncate">{c.name}</span>
                                    </div>
                                    <Badge
                                      variant={getCategoryLevelBadgeVariant((c.level as number) || 0)}
                                      className="text-xs"
                                    >
                                      {getCategoryLevelLabel((c.level as number) || 0)}
                                    </Badge>
                                  </CommandItem>
                                );
                              })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedCategories.map((c) => (
                        <Badge key={c.id} variant="secondary">{c.name}</Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={tab.name}
                onChange={(e) => handleTabChange("name", e.target.value)}
                placeholder="Enter tab name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={tab.description}
                onChange={(e) => handleTabChange("description", e.target.value)}
                placeholder="Enter tab description"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layers className="h-5 w-5" />
            <span>Assign Sections ({selectedSections.length} selected)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedSections.length > 0 && (
            <div className="mb-4">
              <Label className="text-sm font-medium text-muted-foreground">
                Selected Sections:
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedSectionsData.map((section) => (
                  <Badge
                    key={section.id}
                    variant="secondary"
                    className="flex items-center space-x-1"
                  >
                    <span>{section.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleSectionToggle(section.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-sm font-medium">Available Sections:</Label>
            {isLoadingSections ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading sections...
                </span>
              </div>
            ) : sectionsError ? (
              <div className="text-center text-red-600 py-4">
                Error loading sections:{" "}
                {sectionsError.message || "Please try again."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sectionsData?.map((section) => (
                  <div
                    key={section.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedSections.includes(section.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleSectionToggle(section.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedSections.includes(section.id)}
                        onChange={() => handleSectionToggle(section.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-sm">
                            {section.name}
                          </h4>
                          {selectedSections.includes(section.id) && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {section.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {section.fields_count} fields
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {section.fields?.slice(0, 3).map((field) => (
                              <Badge
                                key={field.id}
                                variant="outline"
                                className="text-xs"
                              >
                                {field.field_type}
                              </Badge>
                            ))}
                            {(section.fields?.length || 0) > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{(section.fields?.length || 0) - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => navigate("/configuration/tabs")}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={createTabMutation.isPending || updateTabMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {createTabMutation.isPending || updateTabMutation.isPending
            ? "Saving..."
            : isEdit
            ? "Update Tab"
            : "Create Tab"}
        </Button>
      </div>
    </div>
  );
};

export default CreateEditTab;
