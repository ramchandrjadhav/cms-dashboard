import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Folder,
  FolderOpen,
  Settings,
  Package,
  GripVertical,
  Copy,
  Loader2,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  getCategoryLevelLabel,
} from "@/lib/category-level";
import { ExportButton } from "@/components/ui/export-button";

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string | File;
  is_active?: boolean;
  parent?: string | null;
  rank?: number;
  children?: Category[];
}

interface CategoryWithUI extends Category {
  isExpanded?: boolean;
}

// Root Drop Zone Component
const RootDropZone = () => {
  const { setNodeRef, isOver } = useDroppable({
    id: "root-drop-zone",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-2 border-dashed rounded-lg p-4 mb-4 transition-all duration-200",
        isOver
          ? "border-primary bg-primary/5 scale-105"
          : "border-muted-foreground/20 bg-muted/20 scale-100"
      )}
      style={{
        transition: "all 0.2s ease",
      }}
    >
      <div className="text-center text-sm text-muted-foreground">
        <Folder className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
        <p className="font-medium">Drop here to make category root</p>
        <p className="text-xs">
          Drag any category here to make it a top-level category
        </p>
      </div>
    </div>
  );
};

// Sortable Category Item Component
const SortableCategoryItem = ({
  category,
  level,
  index,
  isDragOver,
  isDragging,
  onToggleExpanded,
  onEdit,
  onDelete,
  onAddChild,
  canManageCategories,
  editingKey,
  onSaveEdit,
  onCancelEdit,
  isProposedParent,
}: {
  category: CategoryWithUI & { level: number; type: "category" };
  level: number;
  index: number;
  isDragOver: boolean;
  isDragging: boolean;
  onToggleExpanded: (id: string) => void;
  onEdit: (key: string) => void;
  onDelete: (category: CategoryWithUI) => void;
  onAddChild: (category: CategoryWithUI) => void;
  canManageCategories: boolean;
  editingKey: string | null;
  onSaveEdit: (id: string, values: any) => Promise<void>;
  onCancelEdit: () => void;
  isProposedParent?: boolean;
}) => {
  const { toast } = useToast();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: category.id,
    data: {
      type: "category",
      category,
    },
  });

  // Create a more precise drop zone detection
  const [isOverMiddle, setIsOverMiddle] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const hasChildren = category.children && category.children.length > 0;
  const compositeKey = `category:${category.id}`;
  const isEditing = editingKey === compositeKey;

  const [editName, setEditName] = useState(category.name);
  const [editDescription, setEditDescription] = useState(
    category.description || ""
  );
  const [editImage, setEditImage] = useState<string | File>(
    category.image || ""
  );
  const [editActive, setEditActive] = useState(category.is_active ?? true);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (isEditing && !hasInitialized.current) {
      setEditName(category.name);
      setEditDescription(category.description || "");
      setEditImage(category.image || "");
      setEditActive(category.is_active ?? true);
      hasInitialized.current = true;
    }
  }, [isEditing, category]);

  const showExpandButton = hasChildren;
  const showAddButton = canManageCategories;
  const showEditButton = canManageCategories;

  return (
    <div
      // data attribute to allow precise DOM lookup for pointer math
      data-category-id={category.id}
      ref={(node) => {
        setNodeRef(node);
        itemRef.current = node;
      }}
      className={cn(
        "group relative border rounded-lg p-4 bg-background transition-all duration-200",
        isSortableDragging && "shadow-lg scale-105 opacity-50",
        isDragOver && "ring-2 ring-blue-500",
        isProposedParent && "ring-2 ring-emerald-500 bg-emerald-50/30",
        isDragOver && isOverMiddle && "bg-blue-50/30",
        isDragging && "opacity-50 scale-95 shadow-lg"
      )}
      style={{
        marginLeft: `${level * 20}px`,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
      }}
      onMouseEnter={(e) => {
        if (isDragOver && itemRef.current) {
          const rect = itemRef.current.getBoundingClientRect();
          const mouseY = e.clientY;
          const itemTop = rect.top;
          const itemHeight = rect.height;
          const middleThreshold = itemTop + itemHeight * 0.4; // Only activate in bottom 60%

          setIsOverMiddle(mouseY > middleThreshold);
        }
      }}
      onMouseMove={(e) => {
        if (isDragOver && itemRef.current) {
          const rect = itemRef.current.getBoundingClientRect();
          const mouseY = e.clientY;
          const itemHeight = rect.height;
          const itemTop = rect.top;
          const middleThreshold = itemTop + itemHeight * 0.4; // Only activate in bottom 60%

          setIsOverMiddle(e.clientY > middleThreshold);
        }
      }}
      onMouseLeave={() => {
        setIsOverMiddle(false);
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            {showExpandButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleExpanded(category.id)}
                className="h-6 w-6 p-0"
              >
                {category.isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            {!showExpandButton && <div className="w-6" />}

            {level === 0 ? (
              category.isExpanded ? (
                <FolderOpen className="h-4 w-4 text-primary" />
              ) : (
                <Folder className="h-4 w-4 text-muted-foreground" />
              )
            ) : level === 1 ? (
              <Folder className="h-4 w-4 text-blue-500" />
            ) : (
              <Package className="h-4 w-4 text-green-500" />
            )}

            {/* Drag Handle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Category name"
                  className="h-8"
                />
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Category description"
                  rows={2}
                  className="text-sm"
                />
                <div className="flex items-center gap-4">
                  {editImage && (
                    <img
                      src={
                        typeof editImage === "string"
                          ? editImage.startsWith("http")
                            ? editImage
                            : `${
                                import.meta.env.VITE_AWS_S3_BASE_URL
                              }${editImage}`
                          : editImage instanceof File
                          ? URL.createObjectURL(editImage)
                          : ""
                      }
                      alt="Category Preview"
                      className="h-24 w-24 object-cover rounded border"
                    />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const uploadResult = await ApiService.uploadImages([
                            file,
                          ]);
                          const imagePath = uploadResult[0].file_path;
                          setEditImage(imagePath);
                        } catch (uploadError) {
                          console.error("Upload failed:", uploadError);
                        }
                      }
                    }}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={editActive}
                    onCheckedChange={setEditActive}
                  />
                  <Label htmlFor="active" className="text-sm">
                    Active
                  </Label>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{category.name}</span>
                  <Badge
                    variant={category.is_active ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {category.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getCategoryLevelLabel(level)}
                  </Badge>
                </div>
                {category.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {category.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await onSaveEdit(category.id, {
                    name: editName,
                    description: editDescription,
                    image: editImage,
                    is_active: editActive,
                  });
                }}
                className="h-8 w-8 p-0"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelEdit}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              {showAddButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddChild(category)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(String(category.id));
                    toast({
                      title: "ID Copied",
                      description: `Category ID ${category.id} has been copied to clipboard.`,
                    });
                  } catch (error) {
                    console.error("Failed to copy ID:", error);
                    toast({
                      title: "Copy Failed",
                      description:
                        "Failed to copy ID to clipboard. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
                className="h-8 w-8 p-0"
                title={`Copy ID ${category.id}`}
              >
                <Copy className="h-4 w-4" />
              </Button>
              {showEditButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(compositeKey)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {canManageCategories && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Category</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{category.name}
                        "? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(category)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function CategoryTree() {
  const { hasRole, hasGroup } = useAuth();
  const canManageCategories = () => {
    return hasRole("master") ||
    hasGroup("CATALOG_EDITOR") ||
    hasGroup("CATALOG_ADMIN")
  };

  const [categories, setCategories] = useState<CategoryWithUI[]>([]);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(
    null
  );
  const [selectedCategoryObj, setSelectedCategoryObj] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingParent, setAddingParent] = useState<CategoryWithUI | null>(null);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Category[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [newCategoryImageFile, setNewCategoryImageFile] = useState<File | null>(
    null
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const defaultCategoryForm = {
    name: "",
    description: "",
    image: "",
    is_active: true,
  };
  const [categoryForm, setCategoryForm] = useState<any>(defaultCategoryForm);

  // Drag and Drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // -- pointer tracking & proposal state --
  const pointerXRef = useRef<number | null>(null);
  const pointerYRef = useRef<number | null>(null);
  const pointerMoveListenerRef = useRef<((e: PointerEvent) => void) | null>(
    null
  );
  const [proposedParentId, setProposedParentId] = useState<
    string | null | undefined
  >(undefined); // undefined: no proposal yet, null: root

  // Configure sensors for better drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (showAddDialog) {
      setCategoryForm(defaultCategoryForm);
    }
  }, [showAddDialog]);

  const handleCategoryFormChange = (field: string, value: any) => {
    setCategoryForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleCategoryFormImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploadResult = await ApiService.uploadImages([file]);
      const imagePath = uploadResult[0].file_path;

      setCategoryForm((prev: any) => ({ ...prev, image: imagePath }));

      toast({
        title: "Image Uploaded",
        description: "Image has been uploaded successfully.",
      });
    } catch (uploadError) {
      toast({
        title: "Image Upload Failed",
        description: "Could not upload image. Please try again.",
        variant: "destructive",
      });
      e.target.value = "";
    }
  };

  const getCategoryFormImagePreview = () => {
    if (!categoryForm.image) return "";

    if (
      typeof categoryForm.image === "string" &&
      categoryForm.image.startsWith("http")
    ) {
      return categoryForm.image;
    }

    if (typeof categoryForm.image === "string") {
      const AWS_S3_BASE_URL = import.meta.env.VITE_AWS_S3_BASE_URL;
      return `${AWS_S3_BASE_URL}${categoryForm.image}`;
    }

    if (categoryForm.image instanceof File) {
      return URL.createObjectURL(categoryForm.image);
    }

    return "";
  };

  const getCategoryLevel = (
    category: CategoryWithUI,
    categories: CategoryWithUI[]
  ): number => {
    if (!category.parent) return 0;
    const parent = findCategoryById(category.parent, categories);
    return parent ? getCategoryLevel(parent, categories) + 1 : 0;
  };

  const findCategoryById = (
    id: string,
    categories: CategoryWithUI[]
  ): CategoryWithUI | null => {
    for (const cat of categories) {
      if (cat.id === id) return cat;
      if (cat.children) {
        const found = findCategoryById(id, cat.children);
        if (found) return found;
      }
    }
    return null;
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name.trim()) return;
    if (!categoryForm.image) {
      toast({
        title: "Image Required",
        description: "Please upload an image.",
        variant: "destructive",
      });
      return;
    }
    try {
      const payload = {
        name: categoryForm.name,
        description: categoryForm.description,
        image: categoryForm.image,
        is_active: categoryForm.is_active,
        parent: addingParent ? addingParent.id : null,
      };

      await ApiService.createCategoryNew(payload);

      setShowAddDialog(false);
      setCategoryForm(defaultCategoryForm);
      setAddingParent(null);

      let title = "Category Added";
      let description = "New category has been created successfully.";

      if (addingParent) {
        const level = getCategoryLevel(addingParent, categories);
        if (level === 0) {
          title = "Subcategory Added";
          description = `New subcategory has been created under '${addingParent.name}'.`;
        } else {
          title = "Child Category Added";
          description = `New child category has been created under '${addingParent.name}'.`;
        }
      }

      toast({
        title,
        description,
      });

      await fetchCategories();
    } catch (err) {
      let errorMessage = "Failed to create category.";
      if (addingParent) {
        errorMessage = "Failed to create child category.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const categoryTree = await ApiService.getCategories(1, 1000);

      const categoriesWithExpansion = addExpansionState(categoryTree);
      setCategories(categoriesWithExpansion);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchCategories = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await ApiService.getCategories(1, 5, query);
      
      // Flatten the results to show child categories that match the search
      const flattenedResults: Category[] = [];
      const addedIds = new Set<string>(); // Track added category IDs to prevent duplicates
      
      const flattenSearchResults = (categories: Category[]) => {
        categories.forEach(category => {
          // Check if any children match the search first
          let hasMatchingChild = false;
          if (category.children && category.children.length > 0) {
            category.children.forEach(child => {
              if (child.name.toLowerCase().includes(query.toLowerCase()) && !addedIds.has(child.id.toString())) {
                // Add the child category to results
                flattenedResults.push(child);
                addedIds.add(child.id.toString());
                hasMatchingChild = true;
              }
            });
            // Recursively check deeper children
            flattenSearchResults(category.children);
          }
          
          // Only add the parent if it matches AND no child matched AND not already added
          if (!hasMatchingChild && 
              category.name.toLowerCase().includes(query.toLowerCase()) && 
              !addedIds.has(category.id.toString())) {
            flattenedResults.push(category);
            addedIds.add(category.id.toString());
          }
        });
      };
      
      flattenSearchResults(results);
      setSearchResults(flattenedResults);
    } catch (error) {
      console.error("Error searching categories:", error);
      toast({
        title: "Error",
        description: "Failed to search categories",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addExpansionState = (cats: Category[]): CategoryWithUI[] => {
    return cats.map((cat) => ({
      ...cat,
      isExpanded: true,
      children: cat.children ? addExpansionState(cat.children) : [],
    }));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCategories(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const flatCategories = useMemo(() => {
    const flatten = (
      cats: CategoryWithUI[],
      level = 0
    ): (Category & {
      level: number;
      type: "category";
    })[] => {
      // Sort categories by rank if available, otherwise maintain current order
      const sortedCats = [...cats].sort((a, b) => {
        const aRank = a.rank ?? 0;
        const bRank = b.rank ?? 0;
        return aRank - bRank;
      });

      return sortedCats.reduce(
        (
          acc: (Category & {
            level: number;
            type: "category";
          })[],
          cat
        ) => {
          const flatCat = { ...cat, level, type: "category" as const };
          acc.push(flatCat);
          if (cat.children && cat.isExpanded) {
            acc.push(...flatten(cat.children, level + 1));
          }
          return acc;
        },
        []
      );
    };
    return flatten(categories);
  }, [categories]);

  const toggleExpanded = useCallback((itemId: string) => {
    setCategories((prev) => {
      const toggleInCategories = (cats: CategoryWithUI[]): CategoryWithUI[] => {
        return cats.map((cat) => {
          if (cat.id === itemId) {
            return { ...cat, isExpanded: !cat.isExpanded };
          }
          if (cat.children) {
            return {
              ...cat,
              children: toggleInCategories(cat.children),
            };
          }
          return cat;
        });
      };
      return toggleInCategories(prev);
    });
  }, []);

  // Drag and Drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);

    // start robust pointer tracking
    pointerXRef.current = (event as any).pointerCoordinates?.x ?? null;
    pointerYRef.current = (event as any).pointerCoordinates?.y ?? null;
    const moveListener = (e: PointerEvent) => {
      pointerXRef.current = e.clientX;
      pointerYRef.current = e.clientY;
    };
    pointerMoveListenerRef.current = moveListener;
    window.addEventListener("pointermove", moveListener);

    // reset proposal
    setProposedParentId(undefined);
    setDragOverId(null);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over, active } = event;
      const overId = over?.id as string | undefined;

      // reset if no over
      if (!overId) {
        setDragOverId(null);
        setProposedParentId(undefined);
        return;
      }

      // Root drop zone -> propose root
      if (overId === "root-drop-zone") {
        setDragOverId(overId);
        setProposedParentId(null);
        return;
      }

      // If hovering over the dragged item itself — ignore
      if (overId === (active.id as string)) {
        setDragOverId(null);
        setProposedParentId(undefined);
        return;
      }

      setDragOverId(overId);

      // Try to locate the DOM element for precise pointer measurement
      const overEl = document.querySelector(
        `[data-category-id="${overId}"]`
      ) as HTMLElement | null;

      const overCategory = findCategoryById(overId, categories);

      if (!overEl || !overCategory) {
        setProposedParentId(undefined);
        return;
      }

      const rect = overEl.getBoundingClientRect();
      const pointerX =
        pointerXRef.current ??
        (event as any).pointerCoordinates?.x ??
        rect.left;
      const pointerY =
        pointerYRef.current ?? (event as any).pointerCoordinates?.y ?? rect.top;

      // threshold: either a minimum px or % of width (whichever is larger)
      const MIN_PX = 20; // min px to the right before proposing child
      const PCT_THRESH = rect.left + rect.width * 0.25; // 25% across element
      const RIGHT_THRESHOLD = Math.max(rect.left + MIN_PX, PCT_THRESH);

      // Check if we're hovering in the lower half of the target (below the center)
      const targetCenter = rect.top + rect.height / 2;
      const isHoveringBelow = pointerY > targetCenter;

      let candidateParent: string | null | undefined;
      if (pointerX > RIGHT_THRESHOLD && isHoveringBelow) {
        candidateParent = overId; // make it child of the hovered node
      } else {
        // keep it as sibling: propose parent = overCategory.parent (could be null for root sibling)
        candidateParent = overCategory.parent ?? null;
      }

      // prevent proposing circular reference
      if (
        typeof candidateParent === "string" &&
        candidateParent !== null &&
        wouldCreateCircularReference(
          active.id as string,
          candidateParent,
          categories
        )
      ) {
        setProposedParentId(undefined);
      } else {
        setProposedParentId(candidateParent);
      }
    },
    [categories]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      // remove pointer listener
      if (pointerMoveListenerRef.current) {
        window.removeEventListener(
          "pointermove",
          pointerMoveListenerRef.current
        );
        pointerMoveListenerRef.current = null;
      }
      pointerXRef.current = null;
      pointerYRef.current = null;

      setActiveId(null);
      setDragOverId(null);

      const finalProposed = proposedParentId;
      setProposedParentId(undefined);

      if (!over || active.id === over.id) {
        return;
      }

      const activeCategory = findCategoryById(active.id as string, categories);

      // Check if dropping on root drop zone
      if (over.id === "root-drop-zone" && activeCategory) {
        await updateCategoryParent(activeCategory.id, null, 0);
        return;
      }

      // Check if dropping on another category
      const overCategory = findCategoryById(over.id as string, categories);
      if (activeCategory && overCategory) {
        const newParentId =
          finalProposed !== undefined
            ? finalProposed
            : overCategory.parent ?? null;

        // validate
        if (newParentId === activeCategory.id) {
          toast({
            title: "Invalid Parent",
            description: "A category cannot be its own parent.",
            variant: "destructive",
          });
          return;
        }

        if (
          newParentId !== null &&
          wouldCreateCircularReference(
            activeCategory.id,
            newParentId,
            categories
          )
        ) {
          toast({
            title: "Invalid Parent",
            description:
              "Cannot set parent as it would create a circular reference.",
            variant: "destructive",
          });
          return;
        }

        // Calculate rank based on position
        const rank = calculateRank(
          activeCategory.id,
          overCategory.id,
          newParentId,
          categories
        );
        await updateCategoryParent(activeCategory.id, newParentId, rank);
      }
    },
    [categories, proposedParentId]
  );

  const updateCategoryParent = async (
    categoryId: string,
    newParentId: string | null,
    rank: number = 0
  ) => {
    try {
      const categoryToUpdate = findCategoryById(categoryId, categories);
      if (!categoryToUpdate) return;

      // If setting a parent (not making it root)
      if (newParentId !== null) {
        if (categoryId === newParentId) {
          toast({
            title: "Invalid Parent",
            description: "A category cannot be its own parent.",
            variant: "destructive",
          });
          return;
        }

        if (wouldCreateCircularReference(categoryId, newParentId, categories)) {
          toast({
            title: "Invalid Parent",
            description:
              "Cannot set parent as it would create a circular reference.",
            variant: "destructive",
          });
          return;
        }
      }

      await ApiService.updateCategory(categoryId, {
        name: categoryToUpdate.name,
        parent: newParentId,
        rank: rank,
      });

      const action = newParentId === null ? "made root" : "moved";
      toast({
        title: "Category Updated",
        description: `Category "${categoryToUpdate.name}" has been ${action} successfully.`,
      });

      await fetchCategories();
    } catch (error) {
      console.error("Error updating category parent:", error);
      toast({
        title: "Error",
        description: "Failed to move category. Please try again.",
        variant: "destructive",
      });
    }
  };

  const wouldCreateCircularReference = (
    categoryId: string,
    newParentId: string,
    categories: CategoryWithUI[]
  ): boolean => {
    const isDescendant = (parentId: string, targetId: string): boolean => {
      const parent = findCategoryById(parentId, categories);
      if (!parent || !parent.children) return false;

      for (const child of parent.children) {
        if (child.id === targetId) return true;
        if (isDescendant(child.id, targetId)) return true;
      }
      return false;
    };

    return isDescendant(categoryId, newParentId);
  };

  // Calculate rank based on position where category is being dropped
  const calculateRank = (
    draggedCategoryId: string,
    targetCategoryId: string,
    newParentId: string | null,
    categories: CategoryWithUI[]
  ): number => {
    // If we're making it a child of the target (proposedParentId === targetCategoryId),
    // it should be the first child (rank 0)
    if (proposedParentId === targetCategoryId) {
      return 0;
    }

    // Get all siblings (categories with the same parent) excluding the dragged category
    const siblings = flatCategories.filter((cat) => {
      const catParent = cat.parent || null;
      return catParent === newParentId && cat.id !== draggedCategoryId;
    });

    // Sort siblings by their current order in the flat list (which represents their visual order)
    siblings.sort((a, b) => {
      const aIndex = flatCategories.findIndex((c) => c.id === a.id);
      const bIndex = flatCategories.findIndex((c) => c.id === b.id);
      return aIndex - bIndex;
    });

    // Find the target category in the siblings list
    const targetIndex = siblings.findIndex(
      (cat) => cat.id === targetCategoryId
    );

    if (targetIndex === -1) {
      // Target not found in siblings, append to end
      return siblings.length;
    }

    // Determine if we're dropping before or after the target based on Y position
    const targetElement = document.querySelector(
      `[data-category-id="${targetCategoryId}"]`
    );
    if (targetElement && pointerYRef.current !== null) {
      const rect = targetElement.getBoundingClientRect();
      const targetCenter = rect.top + rect.height / 2;

      // If mouse is in the upper half of the target, drop before it
      // If mouse is in the lower half, drop after it
      if (pointerYRef.current < targetCenter) {
        // Drop before target: dragged item gets target's current rank
        return targetIndex;
      } else {
        // Drop after target: dragged item gets target's rank + 1
        return targetIndex + 1;
      }
    }

    // Fallback: drop after the target
    return targetIndex + 1;
  };

  const expandAllCategories = useCallback(() => {
    setCategories((prev) => {
      const expandRecursively = (cats: CategoryWithUI[]): CategoryWithUI[] => {
        return cats.map((cat) => ({
          ...cat,
          isExpanded: true,
          children: cat.children ? expandRecursively(cat.children) : [],
        }));
      };
      return expandRecursively(prev);
    });
  }, []);

  const collapseAllCategories = useCallback(() => {
    setCategories((prev) => {
      const collapseRecursively = (
        cats: CategoryWithUI[]
      ): CategoryWithUI[] => {
        return cats.map((cat) => ({
          ...cat,
          isExpanded: false,
          children: cat.children ? collapseRecursively(cat.children) : [],
        }));
      };
      return collapseRecursively(prev);
    });
  }, []);

  const handleSaveEdit = async (
    id: string,
    values: {
      name: string;
      description?: string;
      image?: string | File;
      is_active?: boolean;
    }
  ) => {
    if (!id || !values.name.trim()) return;
    if (!values.image) {
      toast({
        title: "Image Required",
        description: "Please upload an image.",
        variant: "destructive",
      });
      return;
    }
    try {
      const payload: any = {
        name: values.name,
        description: values.description,
        is_active: values.is_active,
      };
      if (values.image) {
        payload.image = values.image;
      }
      await ApiService.updateCategory(id, payload);
      setEditingKey(null);
      toast({
        title: "Category Updated",
        description: "Category has been updated successfully.",
      });

      await fetchCategories();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update category.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (category: CategoryWithUI) => {
    try {
      await ApiService.deleteCategory(category.id);
      toast({
        title: "Category Deleted",
        description: `Category '${category.name}' has been deleted successfully.`,
      });

      await fetchCategories();
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to delete category '${category.name}'.`,
        variant: "destructive",
      });
    }
  };

  const handleAddChild = useCallback((category: CategoryWithUI) => {
    setAddingParent(category);
    setShowAddDialog(true);
  }, []);

  const handleEdit = useCallback((key: string) => {
    setEditingKey(key);
  }, []);

  const expandToCategory = useCallback((categoryId: string) => {
    setCategories((prev) => {
      const expandToCategoryRecursive = (cats: CategoryWithUI[]): CategoryWithUI[] => {
        return cats.map((cat) => {
          if (cat.id === categoryId) {
            return { ...cat, isExpanded: true };
          }
          if (cat.children) {
            const expandedChildren = expandToCategoryRecursive(cat.children);
            // If any child was found and expanded, expand this parent too
            const hasExpandedChild = expandedChildren.some(child => 
              child.id === categoryId || child.isExpanded
            );
            return {
              ...cat,
              isExpanded: hasExpandedChild || cat.isExpanded,
              children: expandedChildren
            };
          }
          return cat;
        });
      };
      return expandToCategoryRecursive(prev);
    });
  }, []);

  const scrollToCategory = useCallback((categoryId: string) => {
    // Wait for the DOM to update after expanding
    setTimeout(() => {
      const element = document.querySelector(`[data-category-id="${categoryId}"]`);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        // Add a highlight effect
        element.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50');
        }, 2000);
      }
    }, 100);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingKey(null);
  }, []);

  // Compute overlay indentation using proposedParentId (so preview matches drop behavior)
  const overlayIndent = useMemo(() => {
    if (!activeId) return "0px";

    if (proposedParentId === undefined) {
      // no proposal: show indentation matching the current hover if any
      if (dragOverId) {
        const overCat = findCategoryById(dragOverId, categories);
        const overLevel = overCat ? getCategoryLevel(overCat, categories) : 0;
        return `${overLevel * 20}px`;
      }
      // fallback to 0
      return "0px";
    }

    if (proposedParentId === null) {
      return "0px";
    }

    // proposedParentId is an id -> find that node level and show one deeper
    const parentNode = findCategoryById(proposedParentId as string, categories);
    const parentLevel = parentNode
      ? getCategoryLevel(parentNode, categories)
      : 0;
    return `${(parentLevel + 1) * 20}px`;
  }, [activeId, proposedParentId, dragOverId, categories]);

  // Export function
  const handleExportCategories = async () => {
    return await ApiService.exportCategories(
      searchQuery || undefined,
      undefined, // status - export all categories
      undefined, // parent - export all categories
      undefined, // rank
      "rank", // sortBy - default to rank
      "asc" // sortOrder
    );
  };

  return (
    <div className="space-y-6 p-6">
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading categories...
            </p>
          </div>
        </div>
      )}

      <PageHeader
        title="Category Management"
        description="Organize your product categories in a hierarchical structure"
        actions={
          canManageCategories() && (
            <Button
              onClick={() => {
                setAddingParent(null);
                setShowAddDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Quick Category Search</CardTitle>
          <p className="text-sm text-muted-foreground">
            Search for categories across all levels. Results are limited to 5
            items.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <ExportButton
                onExport={handleExportCategories}
                filename={`categories-export-${new Date().toISOString().split("T")[0]}`}
                variant="outline"
              >
                Export Categories
              </ExportButton>
              <Input
                placeholder="Search categories by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              {isSearching && (
                <div className="flex items-center px-3 text-sm text-muted-foreground">
                  Searching...
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-lg">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">
                        Name
                      </th>
                      <th className="text-left p-3 text-sm font-medium">Level</th>
                      <th className="text-left p-3 text-sm font-medium">
                        Status
                      </th>
                      <th className="text-left p-3 text-sm font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((category) => (
                      <tr
                        key={category.id}
                        className="border-t hover:bg-muted/30 cursor-pointer"
                        onClick={() => {
                          setSelectedCategoryKey(`category:${category.id}`);
                          setSelectedCategoryObj(category);
                          expandToCategory(category.id);
                          scrollToCategory(category.id);
                        }}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center overflow-hidden">
                              {category.image ? (
                                <img
                                  src={
                                    typeof category.image === "string" &&
                                    category.image.startsWith("http")
                                      ? category.image
                                      : typeof category.image === "string"
                                      ? `${import.meta.env.VITE_AWS_S3_BASE_URL}${
                                          category.image
                                        }`
                                      : category.image instanceof File
                                      ? URL.createObjectURL(category.image)
                                      : ""
                                  }
                                  alt={category.name}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).onerror = null;
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    const icon = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (icon) icon.style.display = 'block';
                                  }}
                                />
                              ) : null}
                              <ImageIcon 
                                className="h-4 w-4 text-muted-foreground" 
                                style={{ display: category.image ? 'none' : 'block' }}
                              />
                            </div>
                            <span className="font-medium">{category.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {(() => {
                            const lvl = getCategoryLevel(
                              category as CategoryWithUI,
                              categories
                            );
                            return getCategoryLevelLabel(lvl);
                          })()}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              category.is_active ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {category.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {canManageCategories() && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingKey(`category:${category.id}`);
                                  setSelectedCategoryObj(category);
                                  expandToCategory(category.id);
                                  scrollToCategory(category.id);
                                }}
                                className="h-7 w-7 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                            {/* <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCategoryKey(
                                  `category:${category.id}`
                                );
                                setSelectedCategoryObj(category);
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <Settings className="h-3 w-3" />
                            </Button> */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !isSearching && (
              <div className="text-center py-8 text-muted-foreground">
                No categories found matching "{searchQuery}"
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Category Tree</CardTitle>
              <p className="text-sm text-muted-foreground">
                Drag and drop categories to change their parent relationships.
              </p>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAllCategories}
                  className="text-xs"
                >
                  Expand All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAllCategories}
                  className="text-xs"
                >
                  Compact View
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                {/* Root Drop Zone - Outside SortableContext */}
                <RootDropZone />

                <SortableContext
                  items={flatCategories.map((cat) => cat.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {flatCategories.map((category, index) => (
                      <SortableCategoryItem
                        key={`${category.type}:${category.id}`}
                        category={category}
                        level={category.level}
                        index={index}
                        isDragOver={dragOverId === category.id}
                        isDragging={activeId === category.id}
                        onToggleExpanded={toggleExpanded}
                        onEdit={handleEdit}
                        onDelete={handleDeleteCategory}
                        onAddChild={handleAddChild}
                        canManageCategories={canManageCategories()}
                        editingKey={editingKey}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={handleCancelEdit}
                        isProposedParent={proposedParentId === category.id}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeId ? (
                    <div
                      className="border rounded-lg p-4 bg-background shadow-lg"
                      style={{
                        marginLeft: overlayIndent,
                        transition: "margin-left 0.2s ease",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {findCategoryById(activeId, categories)?.name}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Category Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCategoryObj ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedCategoryObj.name}
                    </p>
                  </div>
                  {selectedCategoryObj.description && (
                    <div>
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedCategoryObj.description}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">Image</Label>
                    <div className="mt-2">
                      <div className="h-24 w-24 rounded border bg-muted flex items-center justify-center overflow-hidden">
                        {selectedCategoryObj.image &&
                        typeof selectedCategoryObj.image === "string" &&
                        selectedCategoryObj.image.trim() ? (
                          <img
                            src={
                              selectedCategoryObj.image.startsWith("http")
                                ? selectedCategoryObj.image
                                : `${import.meta.env.VITE_AWS_S3_BASE_URL}${
                                    selectedCategoryObj.image
                                  }`
                            }
                            alt={selectedCategoryObj.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).onerror = null;
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                              const icon = e.currentTarget.nextElementSibling as HTMLElement;
                              if (icon) icon.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <ImageIcon 
                          className="h-8 w-8 text-muted-foreground" 
                          style={{ display: (selectedCategoryObj.image && typeof selectedCategoryObj.image === "string" && selectedCategoryObj.image.trim()) ? 'none' : 'block' }}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Products</Label>
                    <p className="text-sm text-muted-foreground">
                      {/* selectedCategory.productCount || 0 */} products
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge
                      variant={
                        selectedCategoryObj.is_active ? "default" : "secondary"
                      }
                      className="xs"
                    >
                      {selectedCategoryObj.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Level</Label>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        const lvl = getCategoryLevel(
                          selectedCategoryObj,
                          categories
                        );
                        return getCategoryLevelLabel(lvl);
                      })()}
                    </p>
                  </div>
                  {selectedCategoryObj.parent && (
                    <div>
                      <Label className="text-sm font-medium">
                        Parent Category
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const parent = findCategoryById(
                            selectedCategoryObj.parent,
                            categories
                          );
                          return parent ? parent.name : "Unknown";
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a category to view details
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {canManageCategories() && (
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {addingParent ? "Add New Child Category" : "Add New Category"}
              </DialogTitle>
              <DialogDescription>
                {addingParent
                  ? `Create a new child category under "${addingParent.name}"`
                  : "Create a new top-level category"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {addingParent && (
                <div>
                  <Label htmlFor="parent-category">Parent Category</Label>
                  <Input
                    id="parent-category"
                    value={addingParent.name}
                    disabled
                    className="bg-muted"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="name">
                  {addingParent ? "Child Category Name" : "Category Name"}
                </Label>
                <Input
                  id="name"
                  value={categoryForm.name}
                  onChange={(e) =>
                    handleCategoryFormChange("name", e.target.value)
                  }
                  placeholder={
                    addingParent
                      ? "Enter child category name"
                      : "Enter category name"
                  }
                />
              </div>
              <div>
                <Label htmlFor="image">Image</Label>
                <div className="relative">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleCategoryFormImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors bg-gray-50 hover:bg-gray-100">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Choose File
                    </p>
                    <p className="text-sm text-gray-500">
                      Click to upload or drag and drop
                    </p>
                  </div>
                </div>
                {categoryForm.image && (
                  <div className="mt-4 relative inline-block">
                    <img
                      src={getCategoryFormImagePreview()}
                      alt="Category Preview"
                      className="h-24 w-24 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCategoryFormChange("image", "")}
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                      title="Remove Image"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={categoryForm.description}
                  onChange={(e) =>
                    handleCategoryFormChange("description", e.target.value)
                  }
                  placeholder={
                    addingParent
                      ? "Enter child category description"
                      : "Enter category description"
                  }
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={categoryForm.is_active}
                  onCheckedChange={(checked) =>
                    handleCategoryFormChange("is_active", checked)
                  }
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setAddingParent(null);
                  setCategoryForm(defaultCategoryForm);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddCategory}>
                {addingParent ? "Add Child Category" : "Add Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
