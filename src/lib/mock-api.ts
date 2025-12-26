// Mock API service for all application data
import { ProductWithVariants, ProductVariant } from '@/types/variant-types';

// Original mock data for backward compatibility
const mockProducts = [
  {
    id: '1',
    name: 'Smartphone Pro',
    sku: 'SP-001',
    price: 999.99,
    category: 'Electronics',
    status: 'active',
    stock: 25,
    availability: 'in-stock',
    assignedFacilities: ['Warehouse A', 'Warehouse B'],
    facilityStock: { 'Warehouse A': 15, 'Warehouse B': 10 },
    metadata: { brand: 'TechCorp', model: '2024' }
  },
  {
    id: '2',
    name: 'Laptop Ultra',
    sku: 'LU-002',
    price: 1299.99,
    category: 'Electronics',
    status: 'active',
    stock: 8,
    availability: 'low-stock',
    assignedFacilities: ['Distribution Center'],
    facilityStock: { 'Distribution Center': 8 },
    metadata: { brand: 'CompTech', model: 'Ultra' }
  },
  {
    id: '3',
    name: 'Wireless Headphones',
    sku: 'WH-003',
    price: 199.99,
    category: 'Electronics',
    status: 'active',
    stock: 45,
    availability: 'in-stock',
    assignedFacilities: ['Warehouse A', 'Warehouse B', 'Distribution Center'],
    facilityStock: { 'Warehouse A': 20, 'Warehouse B': 15, 'Distribution Center': 10 },
    metadata: { brand: 'AudioMax', type: 'wireless' }
  },
  {
    id: '4',
    name: 'Smart Watch',
    sku: 'SW-004',
    price: 299.99,
    category: 'Electronics',
    status: 'draft',
    stock: 0,
    availability: 'out-of-stock',
    assignedFacilities: [],
    facilityStock: {},
    metadata: { brand: 'WearTech', features: ['GPS', 'Heart Rate'] }
  }
];

// Variant-first mock data
const mockProductsWithVariants: ProductWithVariants[] = [
  {
    id: '1',
    name: 'Smartphone Pro',
    sku: 'SP-001',
    basePrice: 999.99,
    category: 'Electronics',
    status: 'active',
    taxGroupId: '1',
    variants: [
      {
        id: 'var-1-1',
        productId: '1',
        productName: 'Smartphone Pro',
        title: 'Black / 128GB',
        optionValueIds: ['color-black', 'storage-128gb'],
        sku: 'SP-001-BLK-128',
        price: 999.99,
        inventory: 25,
        enabled: true,
        facilityAssignments: [
          {
            variantId: 'var-1-1',
            facilityId: 'fac-1',
            facilityName: 'Warehouse A',
            isAssigned: true,
            stockLevel: 15,
            minStock: 5,
            maxStock: 50,
            lastUpdated: new Date()
          }
        ]
      },
      {
        id: 'var-1-2',
        productId: '1',
        productName: 'Smartphone Pro',
        title: 'White / 256GB',
        optionValueIds: ['color-white', 'storage-256gb'],
        sku: 'SP-001-WHT-256',
        price: 1199.99,
        inventory: 10,
        enabled: true,
        facilityAssignments: []
      }
    ],
    variantCount: 2,
    hasActiveVariants: true,
    totalStock: 35,
    availability: 'in-stock',
    assignedFacilities: ['Warehouse A', 'Warehouse B']
  },
  {
    id: '2',
    name: 'Laptop Ultra',
    sku: 'LU-002',
    basePrice: 1299.99,
    category: 'Electronics',
    status: 'active',
    taxGroupId: '1',
    variants: [
      {
        id: 'var-2-1',
        productId: '2',
        productName: 'Laptop Ultra',
        title: 'Silver / 16GB RAM',
        optionValueIds: ['color-silver', 'ram-16gb'],
        sku: 'LU-002-SLV-16',
        price: 1299.99,
        inventory: 8,
        enabled: true,
        facilityAssignments: []
      }
    ],
    variantCount: 1,
    hasActiveVariants: true,
    totalStock: 8,
    availability: 'low-stock',
    assignedFacilities: ['Distribution Center']
  },
  {
    id: '3',
    name: 'Wireless Headphones',
    sku: 'WH-003',
    basePrice: 199.99,
    category: 'Electronics',
    status: 'active',
    taxGroupId: '1',
    variants: [
      {
        id: 'var-3-1',
        productId: '3',
        productName: 'Wireless Headphones',
        title: 'Black',
        optionValueIds: ['color-black'],
        sku: 'WH-003-BLK',
        price: 199.99,
        inventory: 45,
        enabled: true,
        facilityAssignments: []
      }
    ],
    variantCount: 1,
    hasActiveVariants: true,
    totalStock: 45,
    availability: 'in-stock',
    assignedFacilities: ['Warehouse A', 'Warehouse B', 'Distribution Center']
  },
  {
    id: '4',
    name: 'Smart Watch',
    sku: 'SW-004',
    basePrice: 299.99,
    category: 'Electronics',
    status: 'draft',
    taxGroupId: '1',
    variants: [],
    variantCount: 0,
    hasActiveVariants: false,
    totalStock: 0,
    availability: 'out-of-stock',
    assignedFacilities: []
  }
];

// Mock dashboard stats
const mockDashboardStats = {
  totalProducts: mockProducts.length,
  totalVariants: mockProductsWithVariants.reduce((acc, p) => acc + p.variantCount, 0),
  totalFacilities: 5,
  totalCategories: 3,
  totalRevenue: 125000,
  monthlyGrowth: 12.5,
  recentActivity: [
    { id: '1', message: 'New product created', timestamp: new Date() },
    { id: '2', message: 'Variant stock updated', timestamp: new Date() }
  ]
};

// Mock categories
const mockCategories = [
  { id: '1', name: 'Electronics', productCount: 15 },
  { id: '2', name: 'Clothing', productCount: 8 },
  { id: '3', name: 'Books', productCount: 12 }
];

// Mock facilities
const mockFacilities = [
  { id: '1', name: 'Warehouse A', type: 'warehouse', location: 'New York' },
  { id: '2', name: 'Warehouse B', type: 'warehouse', location: 'Los Angeles' },
  { id: '3', name: 'Distribution Center', type: 'distribution', location: 'Chicago' }
];

// Mock user profile
const mockUserProfile = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin',
  avatar: 'https://via.placeholder.com/150'
};

// Mock options data
const mockProductOptions = [
  {
    id: 'opt-1',
    name: 'size',
    displayName: 'Size',
    position: 0,
    values: [
      { id: 'size-sm', value: 'small', displayValue: 'Small', position: 0 },
      { id: 'size-md', value: 'medium', displayValue: 'Medium', position: 1 },
      { id: 'size-lg', value: 'large', displayValue: 'Large', position: 2 }
    ]
  },
  {
    id: 'opt-2',
    name: 'color',
    displayName: 'Color',
    position: 1,
    values: [
      { id: 'color-red', value: 'red', displayValue: 'Red', position: 0 },
      { id: 'color-blue', value: 'blue', displayValue: 'Blue', position: 1 },
      { id: 'color-green', value: 'green', displayValue: 'Green', position: 2 }
    ]
  }
];

// Original mock API service for backward compatibility
export const mockApiService = {
  // Dashboard
  getDashboardStats: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDashboardStats;
  },
  
  // Products (original format)
  getProducts: async (filters?: any) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // If requesting variant-first format, return new format
    if (filters?.variantFirst) {
      return {
        data: mockProductsWithVariants,
        total: mockProductsWithVariants.length,
        totalPages: 1,
        page: 1
      };
    }
    
    // Otherwise return original format
    return {
      data: mockProducts,
      total: mockProducts.length,
      totalPages: 1,
      page: 1
    };
  },
  
  // Categories
  getCategories: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockCategories;
  },
  
  // Facilities
  getFacilities: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockFacilities;
  },
  
  // User
  getUserProfile: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockUserProfile;
  }
};

// Variant-first API client
export const mockApiClient = {
  getProducts: (filters: any) => {
    return Promise.resolve({
      data: mockProductsWithVariants,
      total: mockProductsWithVariants.length,
      totalPages: 1,
      page: 1
    });
  },

  getProductWithVariants: async (productId: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const product = mockProductsWithVariants.find(p => p.id === productId);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  },

  getProductVariants: (productId: string) => {
    const product = mockProductsWithVariants.find(p => p.id === productId);
    return Promise.resolve(product?.variants || []);
  },

  updateVariantAssignment: (variantId: string, facilityId: string, assignment: any) => {
    return Promise.resolve({ success: true });
  },

  getVariantPricing: (variantId: string) => {
    return Promise.resolve({
      variantId,
      basePrice: 999.99,
      overrides: []
    });
  },

  checkVariantAvailability: (variantId: string, facilityIds: string[], quantity: number) => {
    return Promise.resolve({
      isAvailable: true,
      availableQuantity: 50,
      facilitiesWithStock: facilityIds.map(id => ({
        facilityId: id,
        stockLevel: 25
      }))
    });
  },

  // Variant CRUD operations
  createVariants: async (productId: string, variants: any[]): Promise<any[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return variants.map((variant, index) => ({
      id: `variant-${Date.now()}-${index}`,
      productId,
      productName: mockProductsWithVariants.find(p => p.id === productId)?.name || 'Unknown Product',
      title: variant.title || `New Variant ${index + 1}`,
      optionValueIds: variant.optionValueIds || [],
      sku: variant.sku || `SKU-${Date.now()}-${index}`,
      price: variant.price || 0,
      enabled: variant.enabled ?? true,
      inventory: variant.inventory || 0,
      ...variant
    }));
  },

  updateVariant: async (productId: string, variantId: string, updates: any): Promise<any> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const product = mockProductsWithVariants.find(p => p.id === productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const variant = product.variants.find(v => v.id === variantId);
    if (!variant) {
      throw new Error('Variant not found');
    }

    const updatedVariant = { ...variant, ...updates };
    
    // Update in mock data
    const variantIndex = product.variants.findIndex(v => v.id === variantId);
    if (variantIndex !== -1) {
      product.variants[variantIndex] = updatedVariant;
    }

    return updatedVariant;
  },

  deleteVariant: async (productId: string, variantId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const product = mockProductsWithVariants.find(p => p.id === productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const variantIndex = product.variants.findIndex(v => v.id === variantId);
    if (variantIndex === -1) {
      throw new Error('Variant not found');
    }

    product.variants.splice(variantIndex, 1);
  },

  bulkUpdateVariants: async (updates: Array<{ variantId: string; updates: any }>): Promise<any[]> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const updatedVariants = [];
    
    for (const { variantId, updates: variantUpdates } of updates) {
      const product = mockProductsWithVariants.find(p => 
        p.variants.some(v => v.id === variantId)
      );
      
      if (product) {
        const variant = product.variants.find(v => v.id === variantId);
        if (variant) {
          const updatedVariant = { ...variant, ...variantUpdates };
          const variantIndex = product.variants.findIndex(v => v.id === variantId);
          product.variants[variantIndex] = updatedVariant;
          updatedVariants.push(updatedVariant);
        }
      }
    }
    
    return updatedVariants;
  },

  // Option management
  getProductOptions: async (productId: string) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockProductOptions;
  },

  addProductOption: async (productId: string, option: any) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const newOption = {
      id: `opt-${Date.now()}`,
      name: option.name || 'new-option',
      displayName: option.displayName || 'New Option',
      position: mockProductOptions.length,
      values: option.values || []
    };

    mockProductOptions.push(newOption);
    return newOption;
  },

  updateProductOption: async (productId: string, optionId: string, updates: any) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const optionIndex = mockProductOptions.findIndex(opt => opt.id === optionId);
    if (optionIndex === -1) {
      throw new Error('Option not found');
    }

    mockProductOptions[optionIndex] = { ...mockProductOptions[optionIndex], ...updates };
    return mockProductOptions[optionIndex];
  },

  reorderProductOptions: async (productId: string, optionIds: string[]) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const reorderedOptions = optionIds.map((id, index) => {
      const option = mockProductOptions.find(opt => opt.id === id);
      return option ? { ...option, position: index } : null;
    }).filter(Boolean);

    mockProductOptions.splice(0, mockProductOptions.length, ...reorderedOptions);
  },

  deleteProductOption: async (productId: string, optionId: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const optionIndex = mockProductOptions.findIndex(opt => opt.id === optionId);
    if (optionIndex === -1) {
      throw new Error('Option not found');
    }

    mockProductOptions.splice(optionIndex, 1);
  },

  // Bulk operations
  bulkUpdateInventory: async (updates: Array<{ variantId: string; inventory: number }>) => {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    for (const { variantId, inventory } of updates) {
      const product = mockProductsWithVariants.find(p => 
        p.variants.some(v => v.id === variantId)
      );
      
      if (product) {
        const variant = product.variants.find(v => v.id === variantId);
        if (variant) {
          variant.inventory = inventory;
        }
      }
    }
  }
};

// Initialize function for backward compatibility
export const initMockApi = () => {
  // console.log('Mock API initialized with variant-first support');
};

export default mockApiClient;
