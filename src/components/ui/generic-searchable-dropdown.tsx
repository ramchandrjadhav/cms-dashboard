import React, { useState, useRef, useCallback } from "react";
import { Check, ChevronDown, X, Plus, Loader2 } from "lucide-react";
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

export interface SearchableOption {
  id: string | number;
  label: string;
  value: string;
  [key: string]: any; // Allow additional properties
}

interface GenericSearchableDropdownProps<T extends SearchableOption> {
  options: T[];
  value?: T | T[] | null;
  onValueChange: (value: T | T[] | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  displayField?: keyof T;
  searchFields?: (keyof T)[];
  emptyMessage?: string;
  maxHeight?: string;
  triggerClassName?: string;
  contentClassName?: string;
  showAddNew?: boolean;
  addNewLabel?: string;
  onAddNew?: () => void;
  addNewDisabled?: boolean;
  multiple?: boolean;
  hasMore?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => void;
  onSearch?: (searchTerm: string) => void;
  enableBackendSearch?: boolean;
}

export function GenericSearchableDropdown<T extends SearchableOption>({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  disabled = false,
  className,
  displayField = "label",
  searchFields = ["label", "value"],
  emptyMessage = "No options found.",
  maxHeight = "max-h-60",
  triggerClassName,
  contentClassName,
  showAddNew = false,
  addNewLabel = "Add New",
  onAddNew,
  addNewDisabled = false,
  multiple = false,
  hasMore = false,
  isLoading = false,
  onLoadMore,
  onSearch,
  enableBackendSearch = false,
}: GenericSearchableDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const scrollPercentage =
        (target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100;

      if (scrollPercentage > 80 && hasMore && !isLoading && onLoadMore) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  const handleSearchChange = useCallback(
    (search: string) => {
      setSearchTerm(search);

      if (enableBackendSearch && onSearch) {
        // Clear previous timeout
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }

        // Debounce search by 300ms
        searchTimeoutRef.current = setTimeout(() => {
          onSearch(search);
        }, 300);
      }
    },
    [enableBackendSearch, onSearch]
  );

  const handleSelect = (selectedValue: string) => {
    const selected = options.find(
      (option) => option.id.toString() === selectedValue
    );

    if (!selected) return;

    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const isAlreadySelected = currentValues.some((v) => v.id === selected.id);

      if (isAlreadySelected) {
        // Remove if already selected
        const newValues = currentValues.filter((v) => v.id !== selected.id);
        onValueChange(newValues.length > 0 ? newValues : null);
      } else {
        // Add to selection
        onValueChange([...currentValues, selected]);
      }
    } else {
      onValueChange(selected);
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValueChange(null);
    if (!multiple) {
      setOpen(false);
    }
  };

  const handleAddNew = () => {
    if (onAddNew) {
      onAddNew();
      setOpen(false);
    }
  };

  const getSearchValue = (option: T) => {
    return searchFields.map((field) => option[field]).join(" ");
  };

  const getDisplayValue = (option?: T) => {
    if (!option) {
      if (multiple) {
        if (Array.isArray(value) && value.length > 0) {
          if (value.length === 1) {
            return getDisplayValue(value[0]);
          }
          return `${value.length} selected`;
        }
        return placeholder;
      }
      return value ? getDisplayValue(value as T) : placeholder;
    }
    return option[displayField] as string;
  };

  const isSelected = (option: T) => {
    if (multiple) {
      return Array.isArray(value) && value.some((v) => v.id === option.id);
    }
    return Array.isArray(value) ? false : value?.id === option.id;
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
              !value || (Array.isArray(value) && value.length === 0)
                ? "text-muted-foreground"
                : "",
              triggerClassName
            )}
            disabled={disabled}
          >
            {getDisplayValue()}
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
            value={searchTerm}
            onValueChange={handleSearchChange}
          />
          <CommandList
            ref={scrollRef}
            className="flex-1 overflow-auto"
            onScroll={handleScroll}
          >
            <CommandEmpty>
              {showAddNew && onAddNew ? (
                <div className="p-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    {emptyMessage}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleAddNew}
                    disabled={addNewDisabled}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {addNewLabel}
                  </Button>
                </div>
              ) : (
                emptyMessage
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={getSearchValue(option)}
                  onSelect={() => handleSelect(option.id.toString())}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      isSelected(option) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>{getDisplayValue(option)}</span>
                </CommandItem>
              ))}
              {isLoading && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Loading more...
                  </span>
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
