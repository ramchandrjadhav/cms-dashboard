import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
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

interface Subsubcategory {
  id: number;
  name: string;
  description: string;
  category: number;
  category_name: string;
  subcategory: number;
  subcategory_name: string;
  image?: string;
  is_active: boolean;
}

interface SearchableDropdownProps {
  options: Subsubcategory[];
  value?: Subsubcategory | null;
  onValueChange: (value: Subsubcategory | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableDropdown({
  options,
  value,
  onValueChange,
  placeholder = "Select subsubcategory...",
  disabled = false,
  className,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (selectedValue: string) => {
    const selected = options.find(
      (option) => option.id.toString() === selectedValue
    );
    onValueChange(selected || null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {value ? (
            <div className="flex flex-col items-start">
              <span className="font-medium">{value.name}</span>
              <span className="text-xs text-muted-foreground">
                {value.category_name} → {value.subcategory_name}
              </span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-1"
        align="start"
      >
        <Command className="h-60">
          <CommandInput placeholder="Search subsubcategories..." />
          <CommandList
            className="flex-1 overflow-auto"
            onWheel={(e) => {
              e.preventDefault();
              const target = e.currentTarget;
              target.scrollTop += e.deltaY;
            }}
          >
            <CommandEmpty>No subsubcategory found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={`${option.name} ${option.category_name} ${option.subcategory_name}`}
                  onSelect={() => handleSelect(option.id.toString())}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.id === option.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{option.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.category_name} → {option.subcategory_name}
                    </span>
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
