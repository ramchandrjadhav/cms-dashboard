import React, { useState, useEffect, useMemo } from "react";
import { Check, ChevronDown, X, FolderTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  getCategoryLevelBadgeVariant,
  getCategoryLevelLabel,
} from "@/lib/category-level";
import { ApiService } from "@/services/api";
import { Category } from "@/types";

export interface LevelCategory {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  parent?: string;
  level?: number;
}

interface LevelCategoryDropdownProps {
  value?: LevelCategory | null;
  onValueChange: (value: LevelCategory | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  emptyMessage?: string;
  maxHeight?: string;
}

export function LevelCategoryDropdown({
  value,
  onValueChange,
  placeholder = "Select category...",
  searchPlaceholder = "Search categories...",
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  emptyMessage = "No categories found.",
  maxHeight = "max-h-60",
}: LevelCategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<LevelCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Helper function to calculate category level
  const calculateCategoryLevel = (
    category: Category,
    allCategories: Category[],
    level = 0
  ): number => {
    if (!category.parent) {
      return level;
    }

    const parentCategory = allCategories.find(
      (cat) => cat.id === category.parent
    );
    if (!parentCategory) {
      return level;
    }

    return calculateCategoryLevel(parentCategory, allCategories, level + 1);
  };

  // Helper function to flatten categories and add level information
  // Note: The backend stores levels starting from 1 (level 1 = root, level 2 = SS-Cat, level 3 = SSS-Cat)
  // But we calculate tree depth starting from 0, so we add 1 to match backend levels
  const flattenCategoriesWithLevel = (
    categories: Category[],
    allCategories: Category[],
    treeDepth = 0
  ): LevelCategory[] => {
    const result: LevelCategory[] = [];

    if (!categories || !Array.isArray(categories)) {
      console.warn("flattenCategoriesWithLevel received invalid categories:", categories);
      return result;
    }

    categories.forEach((category) => {
      if (!category) return;
      
      // Use database level if available, otherwise calculate from tree depth
      // Database levels: 1 = root, 2 = SS-Cat, 3 = SSS-Cat
      const dbLevel = (category as any).level !== undefined 
        ? (category as any).level 
        : treeDepth + 1; // Fallback: calculate from tree depth
      
      const categoryWithLevel: LevelCategory = {
        id: category.id,
        name: category.name,
        description: category.description,
        is_active: category.is_active,
        parent: category.parent,
        level: dbLevel, // Database level (1-based): 1 = root, 2 = SS-Cat, 3 = SSS-Cat
      };
      result.push(categoryWithLevel);

      if (category.children && Array.isArray(category.children) && category.children.length > 0) {
        result.push(
          ...flattenCategoriesWithLevel(
            category.children,
            allCategories,
            treeDepth + 1
          )
        );
      }
    });

    return result;
  };

  // Filter categories to only show level 2 and 3
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (category.description &&
          category.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()))
    );
  }, [categories, searchQuery]);

  // Fetch categories on component mount
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const categoryData = await ApiService.getCategories(1, 1000);
      
      console.log("Categories API response:", categoryData);
      console.log("Number of categories received:", categoryData?.length);

      // Flatten and filter to only level 2 and 3 categories (SS-Cat and SSS-Cat)
      const flattened = flattenCategoriesWithLevel(categoryData || [], categoryData || []);

      console.log("Flattened categories:", flattened);
      console.log("Number of flattened categories:", flattened.length);

      // Filter for level 2 (SS-Cat) and level 3 (SSS-Cat) based on database level
      // Database levels: 1 = root, 2 = SS-Cat, 3 = SSS-Cat
      const levelFiltered = flattened.filter(
        (cat) => {
          // Include categories at database level 2 or 3
          const matches = cat.level === 2 || cat.level === 3;
          if (matches) {
            console.log(`Category "${cat.name}" is level ${cat.level} (included)`);
          }
          return matches;
        }
      );

      console.log("Level filtered categories (level 2 or 3):", levelFiltered);
      console.log("Number of level filtered categories:", levelFiltered.length);
      
      // Debug: Log all categories with their levels
      flattened.forEach(cat => {
        console.log(`Category: "${cat.name}" - Level: ${cat.level}, Parent: ${cat.parent || 'none'}`);
      });

      // If no level 2 or 3 categories found, show all categories as fallback
      // (in case the data structure is different than expected)
      if (levelFiltered.length === 0 && flattened.length > 0) {
        console.warn("No level 2 or 3 categories found. Showing all categories as fallback.");
        setCategories(flattened);
      } else {
        setCategories(levelFiltered);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (selectedCategory: LevelCategory) => {
    onValueChange(selectedCategory);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValueChange(null);
    setOpen(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const getDisplayValue = () => {
    if (!value) return placeholder;
    return value.name;
  };

  // centralized helpers used for label/variant

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative", className)}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !value && "text-muted-foreground",
              triggerClassName
            )}
            disabled={disabled}
          >
            <span className="truncate flex-1 text-left">
              {getDisplayValue()}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <PopoverContent
        className={cn(
          "w-[var(--radix-popover-trigger-width)] p-1",
          contentClassName
        )}
        align="start"
      >
        <Command className={maxHeight}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={handleSearch}
          />
          <CommandList
            className="flex-1 overflow-auto"
            onWheel={(e) => {
              e.preventDefault();
              const target = e.currentTarget;
              target.scrollTop += e.deltaY;
            }}
          >
            <CommandEmpty>
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading categories...
                </div>
              ) : (
                emptyMessage
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredCategories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => handleSelect(category)}
                  className="flex items-center justify-between mt-1"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Check
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        value?.id === category.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <FolderTree className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{category.name}</span>
                        <Badge
                          variant={getCategoryLevelBadgeVariant(category.level)}
                          className="text-xs flex-shrink-0"
                        >
                          {getCategoryLevelLabel(category.level)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
