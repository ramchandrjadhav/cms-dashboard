// Shared variant-first types across the application

export interface ProductVariant {
  id: string;
  productId: string;
  productName: string;
  title: string;
  customTitle?: string;
  optionValueIds: string[];
  sku?: string;
  barcode?: string;
  price?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  imageUrl?: string;
  inventory?: number;
  enabled: boolean;
  metadata?: Record<string, any>;
  // Impact tracking
  impactType?: 'NEW' | 'ORPHANED';
  
  // Facility-specific data
  facilityAssignments?: VariantFacilityAssignment[];
  totalStock?: number;
}

export interface VariantFacilityAssignment {
  variantId: string;
  facilityId: string;
  facilityName: string;
  isAssigned: boolean;
  stockLevel: number;
  minStock: number;
  maxStock: number;
  priceOverride?: number;
  lastUpdated: Date;
}

export interface ProductWithVariants {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
  category: string;
  status: 'active' | 'inactive' | 'draft';
  taxGroupId?: string;
  variants: ProductVariant[];
  // Derived properties
  variantCount: number;
  hasActiveVariants: boolean;
  totalStock: number;
  availability: 'in-stock' | 'out-of-stock' | 'low-stock';
  assignedFacilities: string[];
}

export interface VariantPriceOverride {
  variantId: string;
  facilityId?: string;
  clusterId?: string;
  price: number;
  isOverride: boolean;
  lastUpdated: Date;
  hasUnsavedChanges?: boolean;
}

export interface PromotionTarget {
  type: 'product' | 'category' | 'variant';
  id: string;
  name: string;
  conditions?: Record<string, any>;
}

export interface AvailabilityCheck {
  variantId: string;
  facilityIds: string[];
  requiredQuantity: number;
  result: {
    isAvailable: boolean;
    availableQuantity: number;
    facilitiesWithStock: Array<{
      facilityId: string;
      stockLevel: number;
    }>;
  };
}