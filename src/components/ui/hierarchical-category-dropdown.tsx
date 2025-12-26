import React, { useState, useEffect } from "react";
import {
  Check,
  ChevronDown,
  X,
  ChevronRight,
  ArrowLeft,
  MoreHorizontal,
} from "lucide-react";
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
import { ApiService } from "@/services/api";

export interface HierarchicalCategory {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  parent?: string;
  children?: HierarchicalCategory[];
}

interface HierarchicalCategoryDropdownProps {
  value?: HierarchicalCategory | null;
  onValueChange: (value: HierarchicalCategory | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  emptyMessage?: string;
  maxHeight?: string;
}

export function HierarchicalCategoryDropdown({
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
}: HierarchicalCategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<HierarchicalCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<HierarchicalCategory[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<HierarchicalCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch categories on component mount
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  // Initialize current level with top-level categories
  useEffect(() => {
    if (categories.length > 0 && currentLevel.length === 0) {
      setCurrentLevel(categories);
    }
  }, [categories]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const categoryData = await ApiService.getCategories(1, 1000);
      setCategories(categoryData);
      setCurrentLevel(categoryData);
      setBreadcrumb([]);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (selectedCategory: HierarchicalCategory) => {
    // If the category has children, navigate to that level
    if (selectedCategory.children && selectedCategory.children.length > 0) {
      setCurrentLevel(selectedCategory.children);
      setBreadcrumb([...breadcrumb, selectedCategory]);
      return;
    }

    // If it's a leaf category (no children), select it
    onValueChange(selectedCategory);
    setOpen(false);
    // Reset navigation state
    setCurrentLevel(categories);
    setBreadcrumb([]);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValueChange(null);
    setOpen(false);
    // Reset navigation state
    setCurrentLevel(categories);
    setBreadcrumb([]);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Root level
      setCurrentLevel(categories);
      setBreadcrumb([]);
    } else {
      // Navigate to specific level
      const newBreadcrumb = breadcrumb.slice(0, index + 1);
      const targetCategory = newBreadcrumb[newBreadcrumb.length - 1];
      if (targetCategory.children) {
        setCurrentLevel(targetCategory.children);
        setBreadcrumb(newBreadcrumb);
      }
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // If search query is empty, show current level
    if (!query.trim()) {
      return;
    }

    // For now, we'll just filter the current level
    // In a more advanced implementation, we could search across all levels
  };

  const filteredCategories = currentLevel.filter(
    (category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (category.description &&
        category.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getDisplayValue = () => {
    if (!value) return placeholder;

    // Build full path for display
    const path = buildCategoryPath(value);

    // If we have 3 or more levels, show compact format like breadcrumb
    if (path.length >= 3) {
      const first = path[0];
      const last = path[path.length - 1];
      return `${first} > ... > ${last}`;
    }

    // For 1-2 levels, show full path
    return path.join(" > ");
  };

  const buildCategoryPath = (category: HierarchicalCategory): string[] => {
    const path: string[] = [category.name];
    let current = category;

    // Find parent categories by traversing up
    while (current.parent) {
      const parent = findCategoryById(categories, current.parent);
      if (parent) {
        path.unshift(parent.name);
        current = parent;
      } else {
        break;
      }
    }

    return path;
  };

  const findCategoryById = (
    cats: HierarchicalCategory[],
    id: string
  ): HierarchicalCategory | null => {
    for (const cat of cats) {
      if (cat.id === id) return cat;
      if (cat.children) {
        const found = findCategoryById(cat.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Smart breadcrumb rendering with overflow handling
  const renderBreadcrumbs = () => {
    if (breadcrumb.length === 0) return null;

    const totalItems = breadcrumb.length;

    // For 1 level, show R > Category
    if (totalItems === 1) {
      return (
        <div className="p-2 border-b">
          <div className="flex items-center gap-1 text-sm">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs flex-shrink-0"
              onClick={() => handleBreadcrumbClick(-1)}
              title="Go to root"
            >
              R
            </Button>

            <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs flex-shrink-0"
              onClick={() => handleBreadcrumbClick(0)}
              title={breadcrumb[0].name}
            >
              <span className="truncate">{breadcrumb[0].name}</span>
            </Button>
          </div>
        </div>
      );
    }

    // For exactly 2 levels, show R > First > Last
    if (totalItems === 2) {
      const firstItem = breadcrumb[0];
      const lastItem = breadcrumb[1];

      return (
        <div className="p-2 border-b">
          <div className="flex items-center gap-1 text-sm">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs flex-shrink-0"
              onClick={() => handleBreadcrumbClick(-1)}
              title="Go to root"
            >
              R
            </Button>

            <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs flex-shrink-0 flex-1 min-w-0"
              onClick={() => handleBreadcrumbClick(0)}
              title={firstItem.name}
            >
              <span className="truncate">{firstItem.name}</span>
            </Button>

            <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs flex-shrink-0 flex-1 min-w-0"
              onClick={() => handleBreadcrumbClick(1)}
              title={lastItem.name}
            >
              <span className="truncate">{lastItem.name}</span>
            </Button>
          </div>
        </div>
      );
    }

    // For 3+ levels, use compact format: R > First > ... > Latest
    const firstItem = breadcrumb[0];
    const lastItem = breadcrumb[totalItems - 1];

    return (
      <div className="p-2 border-b">
        <div className="flex items-center gap-1 text-sm">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs flex-shrink-0"
            onClick={() => handleBreadcrumbClick(-1)}
            title="Go to root"
          >
            R
          </Button>

          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs flex-shrink-0 flex-1 min-w-0"
            onClick={() => handleBreadcrumbClick(0)}
            title={firstItem.name}
          >
            <span className="truncate">{firstItem.name}</span>
          </Button>

          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />

          <div className="flex items-center gap-1 px-2 text-xs text-muted-foreground flex-shrink-0 bg-muted rounded">
            <MoreHorizontal className="h-3 w-3" />
            <span className="text-xs">+{totalItems - 2}</span>
          </div>

          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs flex-shrink-0 flex-1 min-w-0"
            onClick={() => handleBreadcrumbClick(totalItems - 1)}
            title={lastItem.name}
          >
            <span className="truncate">{lastItem.name}</span>
          </Button>
        </div>
      </div>
    );
  };

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
          {renderBreadcrumbs()}

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
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Check
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        value?.id === category.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{category.name}</span>
                    {/* {category.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {category.description}
                      </span>
                    )} */}
                  </div>

                  {category.children && category.children.length > 0 && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {category.children.length}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
