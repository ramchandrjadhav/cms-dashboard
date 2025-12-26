import { create } from 'zustand';
import { ProductVariant, ProductWithVariants } from '@/types/variant-types';
import { apiClient } from '@/lib/api-client';
import { useMemo } from 'react';

interface ProductOption {
  id: string;
  name: string;
  displayName: string;
  position: number;
  values: ProductOptionValue[];
}

interface ProductOptionValue {
  id: string;
  value: string;
  displayValue: string;
  position: number;
}

interface VariantMatrixRow {
  id: string;
  title: string;
  optionCombination: string;
  optionValueIds: string[];
  sku: string;
  price: number;
  enabled: boolean;
  inventory: number;
  impactType?: 'NEW' | 'ORPHANED';
}

interface ProductStore {
  // State
  products: ProductWithVariants[];
  currentProduct: ProductWithVariants | null;
  variants: ProductVariant[];
  options: ProductOption[];
  loading: boolean;
  error: Error | null;

  // Actions
  loadProduct: (productId: string) => Promise<void>;
  loadProducts: (filters?: any) => Promise<void>;
  clearProduct: () => void;
  
  // Variant CRUD operations
  createVariants: (productId: string, variants: Partial<ProductVariant>[]) => Promise<ProductVariant[]>;
  updateVariant: (productId: string, variantId: string, updates: Partial<ProductVariant>) => Promise<ProductVariant>;
  toggleVariantEnabled: (productId: string, variantId: string) => Promise<void>;
  deleteVariant: (productId: string, variantId: string) => Promise<void>;
  bulkUpdateVariants: (updates: Array<{ variantId: string; updates: Partial<ProductVariant> }>) => Promise<ProductVariant[]>;
  
  // Option management
  addOption: (productId: string, option: Partial<ProductOption>) => Promise<ProductOption>;
  updateOption: (productId: string, optionId: string, updates: Partial<ProductOption>) => Promise<ProductOption>;
  reorderOptions: (productId: string, optionIds: string[]) => Promise<void>;
  deleteOption: (productId: string, optionId: string) => Promise<void>;
  
  // Bulk operations
  bulkUpdateInventory: (updates: Array<{ variantId: string; inventory: number }>) => Promise<void>;
}

// Memoized variant matrix selector
export const useVariantMatrix = (variants: ProductVariant[], options: ProductOption[]) => {
  return useMemo((): VariantMatrixRow[] => {
    return variants.map((variant) => {
      const optionCombination = variant.optionValueIds
        .map(valueId => {
          const option = options.find(opt => 
            opt.values.some(val => val.id === valueId)
          );
          const value = option?.values.find(val => val.id === valueId);
          return value?.displayValue || value?.value || '';
        })
        .join(' / ');

      return {
        id: variant.id,
        title: variant.title,
        optionCombination,
        optionValueIds: variant.optionValueIds,
        sku: variant.sku || '',
        price: variant.price || 0,
        enabled: variant.enabled,
        inventory: variant.inventory || 0,
        impactType: variant.impactType
      };
    });
  }, [variants, options]);
};

export const useProductStore = create<ProductStore>((set, get) => ({
  // Initial state
  products: [],
  currentProduct: null,
  variants: [],
  options: [],
  loading: false,
  error: null,

  // Actions
  loadProduct: async (productId: string) => {
    set({ loading: true, error: null });
    try {
      const product = await apiClient.getProductWithVariants(productId);
      const options = await apiClient.getProductOptions(productId);
      set({ 
        currentProduct: product,
        variants: product.variants || [],
        options: options || [],
        loading: false 
      });
    } catch (error) {
      set({ error: error as Error, loading: false });
    }
  },

  loadProducts: async (filters?: any) => {
    set({ loading: true, error: null });
    try {
      const result = await apiClient.getProducts({ ...filters, variantFirst: true });
      set({ products: result.data as ProductWithVariants[], loading: false });
    } catch (error) {
      set({ error: error as Error, loading: false });
    }
  },

  clearProduct: () => {
    set({ 
      currentProduct: null, 
      variants: [], 
      options: [],
      error: null 
    });
  },

  // Variant CRUD operations
  createVariants: async (productId: string, variants: Partial<ProductVariant>[]) => {
    set({ loading: true, error: null });
    try {
      const createdVariants = await apiClient.createVariants(productId, variants);
      set((state) => ({
        variants: [...state.variants, ...createdVariants],
        loading: false
      }));
      return createdVariants;
    } catch (error) {
      set({ error: error as Error, loading: false });
      throw error;
    }
  },

  updateVariant: async (productId: string, variantId: string, updates: Partial<ProductVariant>) => {
    set({ loading: true, error: null });
    try {
      const updatedVariant = await apiClient.updateVariant(productId, variantId, updates);
      set((state) => ({
        variants: state.variants.map(v => 
          v.id === variantId ? { ...v, ...updatedVariant } : v
        ),
        loading: false
      }));
      return updatedVariant;
    } catch (error) {
      set({ error: error as Error, loading: false });
      throw error;
    }
  },

  toggleVariantEnabled: async (productId: string, variantId: string) => {
    const state = get();
    const variant = state.variants.find(v => v.id === variantId);
    if (!variant) return;

    try {
      const updatedVariant = await apiClient.updateVariant(productId, variantId, {
        enabled: !variant.enabled
      });
      set((state) => ({
        variants: state.variants.map(v => 
          v.id === variantId ? { ...v, enabled: !v.enabled } : v
        )
      }));
    } catch (error) {
      set({ error: error as Error });
      throw error;
    }
  },

  deleteVariant: async (productId: string, variantId: string) => {
    set({ loading: true, error: null });
    try {
      await apiClient.deleteVariant(productId, variantId);
      set((state) => ({
        variants: state.variants.filter(v => v.id !== variantId),
        loading: false
      }));
    } catch (error) {
      set({ error: error as Error, loading: false });
      throw error;
    }
  },

  bulkUpdateVariants: async (updates: Array<{ variantId: string; updates: Partial<ProductVariant> }>) => {
    set({ loading: true, error: null });
    try {
      const updatedVariants = await apiClient.bulkUpdateVariants(updates);
      set((state) => ({
        variants: state.variants.map(variant => {
          const update = updatedVariants.find(u => u.id === variant.id);
          return update ? { ...variant, ...update } : variant;
        }),
        loading: false
      }));
      return updatedVariants;
    } catch (error) {
      set({ error: error as Error, loading: false });
      throw error;
    }
  },

  // Option management
  addOption: async (productId: string, option: Partial<ProductOption>) => {
    set({ loading: true, error: null });
    try {
      const newOption = await apiClient.addProductOption(productId, option);
      set((state) => ({
        options: [...state.options, newOption],
        loading: false
      }));
      return newOption;
    } catch (error) {
      set({ error: error as Error, loading: false });
      throw error;
    }
  },

  updateOption: async (productId: string, optionId: string, updates: Partial<ProductOption>) => {
    set({ loading: true, error: null });
    try {
      const updatedOption = await apiClient.updateProductOption(productId, optionId, updates);
      set((state) => ({
        options: state.options.map(opt => 
          opt.id === optionId ? { ...opt, ...updatedOption } : opt
        ),
        loading: false
      }));
      return updatedOption;
    } catch (error) {
      set({ error: error as Error, loading: false });
      throw error;
    }
  },

  reorderOptions: async (productId: string, optionIds: string[]) => {
    set({ loading: true, error: null });
    try {
      await apiClient.reorderProductOptions(productId, optionIds);
      set((state) => ({
        options: optionIds.map((id, index) => {
          const option = state.options.find(opt => opt.id === id);
          return option ? { ...option, position: index } : option;
        }).filter(Boolean) as ProductOption[],
        loading: false
      }));
    } catch (error) {
      set({ error: error as Error, loading: false });
      throw error;
    }
  },

  deleteOption: async (productId: string, optionId: string) => {
    set({ loading: true, error: null });
    try {
      await apiClient.deleteProductOption(productId, optionId);
      set((state) => ({
        options: state.options.filter(opt => opt.id !== optionId),
        loading: false
      }));
    } catch (error) {
      set({ error: error as Error, loading: false });
      throw error;
    }
  },

  // Bulk operations
  bulkUpdateInventory: async (updates: Array<{ variantId: string; inventory: number }>) => {
    set({ loading: true, error: null });
    try {
      await apiClient.bulkUpdateInventory(updates);
      set((state) => ({
        variants: state.variants.map(variant => {
          const update = updates.find(u => u.variantId === variant.id);
          return update ? { ...variant, inventory: update.inventory } : variant;
        }),
        loading: false
      }));
    } catch (error) {
      set({ error: error as Error, loading: false });
      throw error;
    }
  },
}));