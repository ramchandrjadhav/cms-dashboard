import { mockApiService, mockApiClient } from './mock-api';

// API client with variant-first support
export const apiClient = {
  // Dashboard
  getDashboardStats: async () => {
    return await mockApiService.getDashboardStats();
  },
  
  // Products with variant-first support
  getProducts: async (filters?: any) => {
    if (filters?.variantFirst) {
      return await mockApiClient.getProducts(filters);
    }
    return await mockApiService.getProducts(filters);
  },
  
  // Variant-specific methods
  getProductVariants: async (productId: string) => {
    return await mockApiClient.getProductVariants(productId);
  },
  
  updateVariantAssignment: async (variantId: string, facilityId: string, assignment: any) => {
    return await mockApiClient.updateVariantAssignment(variantId, facilityId, assignment);
  },
  
  getVariantPricing: async (variantId: string) => {
    return await mockApiClient.getVariantPricing(variantId);
  },
  
  checkVariantAvailability: async (variantId: string, facilityIds: string[], quantity: number) => {
    return await mockApiClient.checkVariantAvailability(variantId, facilityIds, quantity);
  },

  // Product with variants
  getProductWithVariants: async (productId: string) => {
    return await mockApiClient.getProductWithVariants(productId);
  },

  // Variant CRUD operations
  createVariants: async (productId: string, variants: any[]) => {
    return await mockApiClient.createVariants(productId, variants);
  },

  updateVariant: async (productId: string, variantId: string, updates: any) => {
    return await mockApiClient.updateVariant(productId, variantId, updates);
  },

  deleteVariant: async (productId: string, variantId: string) => {
    return await mockApiClient.deleteVariant(productId, variantId);
  },

  bulkUpdateVariants: async (updates: Array<{ variantId: string; updates: any }>) => {
    return await mockApiClient.bulkUpdateVariants(updates);
  },

  // Option management
  getProductOptions: async (productId: string) => {
    return await mockApiClient.getProductOptions(productId);
  },

  addProductOption: async (productId: string, option: any) => {
    return await mockApiClient.addProductOption(productId, option);
  },

  updateProductOption: async (productId: string, optionId: string, updates: any) => {
    return await mockApiClient.updateProductOption(productId, optionId, updates);
  },

  reorderProductOptions: async (productId: string, optionIds: string[]) => {
    return await mockApiClient.reorderProductOptions(productId, optionIds);
  },

  deleteProductOption: async (productId: string, optionId: string) => {
    return await mockApiClient.deleteProductOption(productId, optionId);
  },

  // Bulk operations
  bulkUpdateInventory: async (updates: Array<{ variantId: string; inventory: number }>) => {
    return await mockApiClient.bulkUpdateInventory(updates);
  },
  
  // Legacy methods
  getCategories: async () => {
    return await mockApiService.getCategories();
  },
  
  getFacilities: async () => {
    return await mockApiService.getFacilities();
  },
  
  getUserProfile: async () => {
    return await mockApiService.getUserProfile();
  },
  
  // Generic methods
  post: async (url: string, data: any) => {
    console.log('POST request to:', url, data);
    return { data: { success: true } };
  },
  
  put: async (url: string, data: any) => {
    console.log('PUT request to:', url, data);
    return { data: { success: true } };
  },
  
  delete: async (url: string) => {
    console.log('DELETE request to:', url);
    return { data: { success: true } };
  }
};

export default apiClient;