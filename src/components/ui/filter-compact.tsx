import React, { useState, useMemo, useEffect } from "react";
import { Filter, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  GenericSearchableDropdown,
  SearchableOption,
} from "@/components/ui/generic-searchable-dropdown";
import { LevelCategoryDropdown, LevelCategory } from "@/components/ui/level-category-dropdown";

export interface FilterCondition {
  column: string;
  value: string;
}

export interface FilterConfig {
  type: "select" | "searchable" | "category" | "status";
  label: string;
  placeholder: string;
  options?: SearchableOption[];
  selectOptions?: { value: string; label: string }[];
  searchFields?: string[];
  displayField?: string;
  emptyMessage?: string;
  maxHeight?: string;
}

export interface FilterCompactProps {
  filterConfigs: Record<string, FilterConfig>;
  activeFilters: Record<string, any>;
  onFilterChange: (filterType: string, value: any) => void;
  onClearFilters: () => void;
  className?: string;
  disabled?: boolean;
}

export function FilterCompact({
  filterConfigs,
  activeFilters,
  onFilterChange,
  onClearFilters,
  className = "",
  disabled = false,
}: FilterCompactProps) {
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([
    { column: "", value: "" },
  ]);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  // Initialize filter conditions from activeFilters
  useEffect(() => {
    const conditions: FilterCondition[] = [];

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== "all" && value !== "" && value !== null && value !== undefined) {
        // Handle object values (for searchable dropdowns and category)
        if (typeof value === 'object' && (value as any).id) {
          conditions.push({ column: key, value: value.id });
        }
        // Handle string values (for select dropdowns)
        else if (typeof value === 'string') {
          conditions.push({ column: key, value: value });
        }
      }
    });

    // Only update if there are active filters
    if (conditions.length > 0) {
      setFilterConditions(conditions);
    } else if (filterConditions.length > 1 || (filterConditions.length === 1 && filterConditions[0].column !== "")) {
      setFilterConditions([{ column: "", value: "" }]);
    }
  }, [activeFilters]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(activeFilters).filter(
      (value) =>
        value !== null && value !== undefined && value !== "" && value !== "all"
    ).length;
  }, [activeFilters]);

  // Filter system functions
  const addFilterCondition = () => {
    setFilterConditions([...filterConditions, { column: "", value: "" }]);
  };

  const updateFilterCondition = (
    index: number,
    key: "column" | "value",
    value: string
  ) => {
    const updatedConditions = [...filterConditions];
    updatedConditions[index][key] = value;
    setFilterConditions(updatedConditions);
  };

  const removeFilterCondition = (index: number) => {
    const conditionToRemove = filterConditions[index];
    const updatedConditions = filterConditions.filter((_, i) => i !== index);
    setFilterConditions(updatedConditions);

    // Call onFilterChange with null to clear the filter
    if (conditionToRemove.column && conditionToRemove.value) {
      onFilterChange(conditionToRemove.column, null);
    }
  };

  const clearFilters = () => {
    setFilterConditions([{ column: "", value: "" }]);
    onClearFilters();
  };

  // Get selected option for dropdowns
  const getSelectedOption = (column: string, value: string) => {
    const config = filterConfigs[column];
    if (!config || !config.options) return null;

    return config.options.find((option) => option.id === value) || null;
  };

  // Render filter input based on type
  const renderFilterInput = (condition: FilterCondition, index: number) => {
    const config = filterConfigs[condition.column];
    if (!config) return null;

    switch (config.type) {
      case "select":
        return (
          <Select
            value={condition.value}
            onValueChange={(value) => {
              updateFilterCondition(index, "value", value);
              onFilterChange(condition.column, value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={config.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {config.selectOptions?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "searchable":
        return (
          <GenericSearchableDropdown
            options={config.options || []}
            value={getSelectedOption(condition.column, condition.value)}
            onValueChange={(value) => {
              const selectedValue = Array.isArray(value) ? value[0] : value;
              updateFilterCondition(
                index,
                "value",
                String(selectedValue?.id || "")
              );
              onFilterChange(condition.column, selectedValue);
            }}
            placeholder={config.placeholder}
            searchPlaceholder={`Search ${config.label.toLowerCase()}...`}
            searchFields={config.searchFields || ["label", "description"]}
            displayField={config.displayField || "label"}
            emptyMessage={
              config.emptyMessage || `No ${config.label.toLowerCase()} found.`
            }
            maxHeight={config.maxHeight || "h-60"}
          />
        );

      case "category":
        const categoryValue = activeFilters[condition.column] as LevelCategory | null;
        return (
          <LevelCategoryDropdown
            value={categoryValue || null}
            onValueChange={(selectedValue) => {
              updateFilterCondition(
                index,
                "value",
                String(selectedValue?.id || "")
              );
              onFilterChange(condition.column, selectedValue);
            }}
            placeholder={config.placeholder || "Select category (SS-Cat & SSS-Cat only)"}
            searchPlaceholder={`Search ${config.label.toLowerCase()}...`}
            emptyMessage={config.emptyMessage || `No SS-Cat or SSS-Cat categories found.`}
            maxHeight={config.maxHeight || "h-60"}
          />
        );

      case "status":
        return (
          <Select
            value={condition.value}
            onValueChange={(value) => {
              updateFilterCondition(index, "value", value);
              onFilterChange(condition.column, value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={config.placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Select a filter type first" />
            </SelectTrigger>
          </Select>
        );
    }
  };

  return (
    <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`relative ${className}`}
          disabled={disabled}
        >
          <Filter
            className={`mr-2 h-4 w-4 ${activeFilterCount > 0 ? "fill-current text-blue-600" : ""
              }`}
          />
          Filter
          {activeFilterCount > 0 && (
            <Badge
              variant="default"
              className="ml-2 h-6 w-6 items-center justify-center rounded-full p-0 text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[500px] p-0"
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-4">
          <h4 className="font-medium mb-4">Add Filter</h4>
          {activeFilterCount > 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              {activeFilterCount} active filter
              {activeFilterCount !== 1 ? "s" : ""}
            </p>
          )}

          {/* Dynamic Filter Conditions */}
          {filterConditions.map((condition, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 items-center mb-3"
            >
              <div className="col-span-4">
                <Select
                  value={condition.column}
                  onValueChange={(value) =>
                    updateFilterCondition(index, "column", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter By" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(filterConfigs).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-7">
                {condition.column ? (
                  renderFilterInput(condition, index)
                ) : (
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a filter type first" />
                    </SelectTrigger>
                  </Select>
                )}
              </div>

              <div className="col-span-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilterCondition(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex justify-end items-center border-t">
            <Button
              onClick={addFilterCondition}
              variant="outline"
              className="mt-2"
            >
              <Plus className="mr-0 h-4 w-4" />
              Add Filter
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-center">
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-700"
              >
                Reset
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setFilterPopoverOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
