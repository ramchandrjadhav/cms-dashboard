import type {
  Store,
  Warehouse,
  Cluster,
  Category,
  Product,
  DashboardStats,
  Facility,
  Subcategory,
  Subsubcategory,
  ProductVariant,
  User,
  Brand,
  FacilityInventory,
  CategoryNew,
  Attribute,
  ProductType,
  AttributeRequest,
  UpdateProduct,
  SizeChart,
  Tab,
  CustomTab,
  TabRequest,
  SizeChartRequest,
  Section,
  SectionRequest,
  TabSection,
} from "../types";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_MAIN_ROZANA_URL;
const GS1_DATACART_URL = import.meta.env.VITE_GS1_DATACART_API_URL;
const VITE_GS1_DATACART_API_TOKEN = import.meta.env.VITE_GS1_DATACART_API_TOKEN;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Separate axios instance for login (no interceptor)
const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const gs1DatacartApi = axios.create({
  baseURL: GS1_DATACART_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${VITE_GS1_DATACART_API_TOKEN}`,
  },
});

// Add a request interceptor to include Bearer token if present
api.interceptors.request.use(
  (config) => {
    // Check both localStorage and sessionStorage for tokens
    let tokens = localStorage.getItem("tokens");
    if (!tokens) {
      tokens = sessionStorage.getItem("tokens");
    }

    if (tokens) {
      try {
        const tokenData = JSON.parse(tokens);
        (config.headers as any)["Authorization"] = `Bearer ${tokenData.access}`;
      } catch (error) {
        console.error("Error parsing tokens:", error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Do not redirect, do not clear tokens. Let callers handle it.
      // Optionally tag the error so UI can show a message without navigation.
      error.preventRedirect = true;
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export class ApiService {
  // Login (no bearer token)
  static async login(
    username: string,
    password: string
  ): Promise<{ refresh: string; access: string }> {
    const res = await authApi.post("/user/token/", { username, password });
    return res.data;
  }

  static async getUserDetails() {
    const res = await api.get("/user/details/");
    return res.data;
  }

  // Dashboard
  static async getDashboardStats(): Promise<DashboardStats> {
    const res = await api.get("/dashboard/stats");
    return res.data;
  }

  // Stores
  static async getStores(): Promise<Store[]> {
    const res = await api.get("/stores/");
    return res.data;
  }

  static async getStore(id: string): Promise<Store | null> {
    const res = await api.get(`/stores/${id}`);
    return res.data;
  }

  static async createStore(
    store: Omit<Store, "id" | "createdAt" | "updatedAt">
  ): Promise<Store> {
    const res = await api.post("/stores/", store);
    return res.data;
  }

  static async updateStore(id: string, store: Partial<Store>): Promise<Store> {
    const res = await api.put(`/stores/${id}`, store);
    return res.data;
  }

  static async deleteStore(id: string): Promise<void> {
    await api.delete(`/stores/${id}`);
  }

  // Warehouses
  static async getWarehouses(): Promise<Warehouse[]> {
    const res = await api.get("/warehouses/");
    return res.data;
  }

  static async getWarehouse(id: string): Promise<Warehouse | null> {
    const res = await api.get(`/warehouses/${id}`);
    return res.data;
  }

  static async createWarehouse(
    warehouse: Omit<Warehouse, "id" | "createdAt" | "updatedAt">
  ): Promise<Warehouse> {
    const res = await api.post("/warehouses/", warehouse);
    return res.data;
  }

  static async updateWarehouse(
    id: string,
    warehouse: Partial<Warehouse>
  ): Promise<Warehouse> {
    const res = await api.put(`/warehouses/${id}`, warehouse);
    return res.data;
  }

  static async deleteWarehouse(id: string): Promise<void> {
    await api.delete(`/warehouses/${id}`);
  }

  // Clusters
  static async getClusters(): Promise<Cluster[]> {
    const res = await api.get("/cms/clusters/");
    return res.data.results;
  }

  static async getClustersWithPagination(
    page?: number,
    pageSize?: number,
    search?: string,
    status?: boolean,
    facilities?: string,
    createdBefore?: string,
    ordering?: string
  ): Promise<{ results: Cluster[]; count: number, total_active_count: number, total_inactive_count: number }> {
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    if (status !== undefined) params.status = status;
    if (facilities) params.facilities = facilities;
    if (createdBefore) params.created_before = createdBefore;
    if (ordering) params.ordering = ordering;
    const res = await api.get("/cms/clusters/", { params });
    return res.data;
  }

  static async getCluster(id: string): Promise<Cluster | null> {
    const res = await api.get(`/cms/clusters/${id}`);
    return res.data;
  }

  static async createCluster(
    cluster: Omit<Cluster, "id" | "creation_date" | "updatedAt">
  ): Promise<Cluster> {
    const res = await api.post("/cms/clusters/", cluster);
    return res.data;
  }

  /**
   * Update a cluster. The payload's facilities field should be an array of facility ids (number[]), not objects.
   */
  static async updateCluster(
    id: string,
    cluster: Omit<Partial<Cluster>, "facilities"> & { facilities?: number[] }
  ): Promise<Cluster> {
    const res = await api.put(`/cms/clusters/${id}/`, cluster);
    return res.data;
  }

  static async deleteCluster(id: string): Promise<void> {
    await api.delete(`/cms/clusters/${id}/`);
  }

  // New Categories Structure
  static async getCategories(
    page?: number,
    pageSize?: number,
    search?: string
  ): Promise<Category[]> {
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    const res = await api.get("/cms/categories/list/", {
      params,
    });
    return res.data.results;
  }

  static async createCategoryNew(category: Omit<CategoryNew, "id">) {
    const res = await api.post("/cms/categories/", category);
    return res.data;
  }

  // Categories - OLD
  static async getCategoriesWithPagination(
    page?: number,
    pageSize?: number,
    search?: string
  ): Promise<{ results: Category[]; count: number }> {
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    const res = await api.get("/cms/categories/", { params });
    return res.data;
  }

  static async getCategory(id: string): Promise<Category | null> {
    const res = await api.get(`/cms/categories/${id}`);
    return res.data;
  }

  static async createCategory(
    category: Omit<Category, "id" | "createdAt" | "updatedAt">
  ) {
    let data: any = category;
    let config = {};
    if (category.image && typeof category.image !== "string") {
      data = new FormData();
      data.append("name", category.name);
      data.append("description", category.description);
      data.append("is_active", String(category.is_active));
      data.append("image", category.image);
      config = { headers: { "Content-Type": "multipart/form-data" } };
    }
    const res = await api.post("/cms/categories/", data, config);
    return res.data;
  }

  static async updateCategory(
    id: string,
    category: Partial<Category>
  ): Promise<Category> {
    let data: any = {};
    let useFormData = false;
    let config = {};
    if (category.image && typeof category.image !== "string") {
      useFormData = true;
      data = new FormData();
      if (category.name !== undefined) data.append("name", category.name);
      if (category.description !== undefined)
        data.append("description", category.description);
      if (category.is_active !== undefined)
        data.append("is_active", String(category.is_active));
      data.append("image", category.image);
      config = { headers: { "Content-Type": "multipart/form-data" } };
    } else {
      Object.entries(category).forEach(([key, value]) => {
        if (value !== undefined) {
          data[key] = value;
        }
      });
    }
    const res = await api.put(`/cms/categories/${id}/`, data, config);
    return res.data;
  }

  static async deleteCategory(id: string): Promise<void> {
    await api.delete(`/cms/categories/${id}/`);
  }

  // Products
  static async getProducts(
    page?: number,
    pageSize?: number,
    search?: string,
    categoryId?: string,
    brandId?: string,
    status?: number | boolean,
    collectionId?: string,
    clusterId?: string,
    facilityId?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<any> {
    const params: any = {};
    if (search) params.search = search;
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    if (categoryId) params.category = categoryId;
    if (brandId) params.brand = brandId;
    if (status !== undefined) params.status = status;
    if (collectionId) params.collection = collectionId;
    if (clusterId) params.cluster = clusterId;
    if (facilityId) params.facility = facilityId;
    if (sortBy) params.ordering = `${sortOrder === "desc" ? "-" : ""}${sortBy}`;
    const res = await api.get("/cms/products/", { params });
    return res.data;
  }

  // Get rejected products
  static async getRejectedProducts(
    page?: number,
    pageSize?: number,
    search?: string,
    categoryId?: string,
    brandId?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc",
    status?: boolean
  ): Promise<any> {
    const params: any = { rejected: true };
    if (search) params.search = search;
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    if (categoryId) params.category = categoryId;
    if (brandId) params.brand = brandId;
    if (sortBy) params.ordering = `${sortOrder === "desc" ? "-" : ""}${sortBy}`;
    if (status !== undefined) params.is_active = status;

    console.log("API Call - getRejectedProducts:", {
      url: "/cms/products/",
      params,
    });
    const res = await api.get("/cms/products/", { params });
    console.log("API Response - getRejectedProducts:", res.data);
    return res.data;
  }

  // Unified products pricing for pricing matrix
  static async getProductsPricing(
    type: "cluster" | "facility",
    page?: number,
    pageSize?: number,
    search?: string,
    categoryId?: string,
    brandId?: string,
    status?: number | boolean,
    collectionId?: string,
    clusterId?: string,
    facilityId?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<any> {
    const params: any = { type };
    if (search) params.search = search;
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    if (categoryId) params.category = categoryId;
    if (brandId) params.brand = brandId;
    if (status !== undefined) params.status = status;
    if (collectionId) params.collection = collectionId;
    if (clusterId) params.cluster = clusterId;
    if (facilityId) params.facility = facilityId;
    if (sortBy) params.ordering = `${sortOrder === "desc" ? "-" : ""}${sortBy}`;
    const res = await api.get("/cms/products-pricing/", { params });
    return res.data;
  }

  // Legacy methods for backward compatibility
  static async getProductsWithClusterPricing(
    page?: number,
    pageSize?: number,
    search?: string,
    categoryId?: string,
    brandId?: string,
    status?: number | boolean,
    collectionId?: string,
    clusterId?: string,
    facilityId?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<any> {
    return this.getProductsPricing(
      "cluster",
      page,
      pageSize,
      search,
      categoryId,
      brandId,
      status,
      collectionId,
      clusterId,
      facilityId,
      sortBy,
      sortOrder
    );
  }

  static async getProductsWithFacilityPricing(
    page?: number,
    pageSize?: number,
    search?: string,
    categoryId?: string,
    brandId?: string,
    status?: number | boolean,
    collectionId?: string,
    clusterId?: string,
    facilityId?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<any> {
    return this.getProductsPricing(
      "facility",
      page,
      pageSize,
      search,
      categoryId,
      brandId,
      status,
      collectionId,
      clusterId,
      facilityId,
      sortBy,
      sortOrder
    );
  }

  // Bulk update cluster prices
  static async bulkUpdateClusterPrices(
    clusterId: number,
    margin: number,
    categoryId?: string,
    brandId?: string
  ): Promise<any> {
    const payload: any = {
      cluster_id: clusterId,
      margin: margin,
    };

    if (categoryId) payload.category_id = parseInt(categoryId);
    if (brandId) payload.brand_id = parseInt(brandId);

    const res = await api.put("/cms/clusters/bulk-price-update/", payload);
    return res.data;
  }

  // Bulk update facility prices
  static async bulkUpdateFacilityPrices(
    facilityId: number,
    margin: number,
    categoryId?: string,
    brandId?: string
  ): Promise<any> {
    const payload: any = {
      facility_id: facilityId,
      margin: margin,
    };

    if (categoryId) payload.category_id = parseInt(categoryId);
    if (brandId) payload.brand_id = parseInt(brandId);

    const res = await api.put("/cms/facilities/bulk-price-update/", payload);
    return res.data;
  }

  static async getProduct(
    id: string,
    rejected: boolean | null = null
  ): Promise<Product | null> {
    const res = await api.get(
      `/cms/products/${id}/${rejected ? "?rejected=true" : ""}`
    );
    return res.data;
  }

  static async createProduct(product: any): Promise<Product> {
    let data: any = product;
    let config = {};
    if (product instanceof FormData) {
      config = { headers: { "Content-Type": "multipart/form-data" } };
    }
    const res = await api.post("/cms/products/", data, config);
    return res.data;
  }

  static async bulkCreateProducts(products: any[]): Promise<any> {
    const res = await api.post("/cms/products/bulk-create/", products);
    return res.data;
  }

  static async bulkUpdateProducts(products: any[]): Promise<any> {
    const res = await api.put("/cms/products/bulk-update/", products);
    return res.data;
  }

  static async getRequiredFields(categoryId: string): Promise<{
    category_id: number;
    category_name: string;
    required_fields: Array<{
      field_name: string;
      required: boolean;
      type: string;
      description: string;
      min_count?: number;
      attribute_id?: number;
      attribute_name?: string;
      attribute_type?: string;
      options?: string[];
      custom_field_id?: number;
      field_type?: string;
      field_label?: string;
      field_name_key?: string;
    }>;
    optional_fields: Array<{
      field_name: string;
      required: boolean;
      type: string;
      description: string;
      min_count?: number;
      attribute_id?: number;
      attribute_name?: string;
      attribute_type?: string;
      options?: string[];
      custom_field_id?: number;
      field_type?: string;
      field_label?: string;
      field_name_key?: string;
    }>;
    total_required_fields: number;
    total_optional_fields: number;
  }> {
    const res = await api.get(
      `/cms/categories/required-fields/?category_id=${categoryId}`
    );
    return res.data;
  }
  static async updateProduct(
    id: string,
    product: Partial<UpdateProduct>,
    rejected: boolean | null = null
  ): Promise<Product> {
    const res = await api.put(
      `/cms/products/${id}/${rejected ? "?rejected=true" : ""}`,
      product
    );
    return res.data;
  }

  static async updateProductStatus(
    id: string | number,
    is_active: boolean
  ): Promise<Product> {
    const res = await api.patch(`/cms/products/${id}/status/`, {
      is_active: is_active,
    });
    return res.data;
  }

  static async deleteProduct(
    id: string | number,
    rejected: boolean | null = null
  ): Promise<void> {
    await api.delete(`/cms/products/${id}/${rejected ? "?rejected=true" : ""}`);
  }

  // Export products
  static async exportProducts(
    // format: "csv" | "excel" = "excel",
    search?: string,
    categoryId?: string,
    brandId?: string,
    status?: number | boolean,
    collectionId?: string,
    clusterId?: string,
    facilityId?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<Blob> {
    const params: any = {
      // format,
    };
    if (search) params.search = search;
    if (categoryId) params.category = categoryId;
    if (brandId) params.brand = brandId;
    if (status !== undefined) params.status = status;
    if (collectionId) params.collection = collectionId;
    if (clusterId) params.cluster = clusterId;
    if (facilityId) params.facility = facilityId;
    if (sortBy) params.ordering = `${sortOrder === "desc" ? "-" : ""}${sortBy}`;

    const res = await api.get("/cms/products/export/", {
      params,
      responseType: "blob",
    });
    return res.data;
  }

  // ProductVariants
  static async getProductVariants(
    page?: number,
    pageSize?: number,
    search?: string,
    categoryId?: string,
    brandId?: string,
    status?: number | boolean,
    collectionId?: string,
    clusterId?: string,
    facilityId?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<{
    results: ProductVariant[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const params: any = {};
    if (search) params.search = search;
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    if (categoryId) params.category = categoryId;
    if (brandId) params.brand = brandId;
    if (status !== undefined) params.status = status;
    if (collectionId) params.collection = collectionId;
    if (clusterId) params.cluster = clusterId;
    if (facilityId) params.facility = facilityId;
    if (sortBy) params.ordering = `${sortOrder === "desc" ? "-" : ""}${sortBy}`;
    const res = await api.get(`/cms/variants/`, { params });
    return res.data;
  }

  static async getProductVariant(id: string): Promise<ProductVariant | null> {
    const res = await api.get(`/cms/variants/${id}`);
    return res.data;
  }

  static async createProductVariant(
    variant: Omit<ProductVariant, "id" | "created_at"> & { product: string }
  ): Promise<ProductVariant> {
    const res = await api.post(`/cms//variants/`, variant);
    return res.data;
  }

  static async updateProductVariant(
    id: string,
    variant: Partial<ProductVariant>
  ): Promise<ProductVariant> {
    const res = await api.put(`/cms/variants/${id}/`, variant);
    return res.data;
  }

  static async deleteProductVariant(id: string): Promise<void> {
    await api.delete(`/cms/variants/${id}`);
  }

  // Facilities
  static async getFacilities(): Promise<Facility[]> {
    const res = await api.get("/cms/facilities/");
    return res.data.results;
  }
  
  

  static async getFacilitiesWithPagination(
    page?: number,
    pageSize?: number,
    search?: string,
    facilityType?: string,
    status?: boolean,
    ordering?: string
  ): Promise<{
    results: Facility[];
    count: number;
    next: string | null;
    previous: string | null;
    total_active_count: number;
    total_inactive_count: number;
  }> {
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    if (facilityType && facilityType !== "all")
      params.facility_type = facilityType;
    if (status !== undefined) params.status = status;
    if (ordering) params.ordering = ordering;
    const res = await api.get("/cms/facilities/", { params });
    return res.data;
  }


  static async getFacility(id: string): Promise<Facility | null> {
    const res = await api.get(`/cms/facilities/${id}/`);
    return res.data;
  }

  static async createFacility(
    facility: Omit<Facility, "id" | "createdAt" | "updatedAt">
  ): Promise<Facility> {
    let data = { ...facility };
    if (!data.clusters) {
      const { clusters, ...rest } = data;
      data = rest;
    }
    const res = await api.post("/cms/facilities/", data);
    return res.data;
  }

  static async updateFacility(
    id: string,
    facility: Partial<Facility>
  ): Promise<Facility> {
    let data = { ...facility };
    if (!data.clusters) {
      const { clusters, ...rest } = data;
      data = rest;
    }
    const res = await api.put(`/cms/facilities/${id}/`, data);
    return res.data;
  }

  static async deleteFacility(id: string): Promise<void> {
    await api.delete(`/cms/facilities/${id}/`);
  }

  // Subcategories
  static async getSubcategories(): Promise<Subcategory[]> {
    const res = await api.get("/cms/subcategories/", {
      params: { page_size: 1000 },
    });
    return res.data.results;
  }

  static async getSubcategoriesWithPagination(
    page?: number,
    pageSize?: number,
    search?: string
  ): Promise<{ results: Subcategory[]; count: number }> {
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    const res = await api.get("/cms/subcategories/", { params });
    return res.data;
  }

  static async getSubcategory(id: string): Promise<Subcategory | null> {
    const res = await api.get(`/cms/subcategories/${id}/`);
    return res.data;
  }

  static async createSubcategory(
    subcategory: Omit<Subcategory, "id" | "createdAt" | "updatedAt">
  ): Promise<Subcategory> {
    let data: any = subcategory;
    let config = {};
    if (subcategory.image && typeof subcategory.image !== "string") {
      data = new FormData();
      data.append("category", subcategory.category);
      data.append("name", subcategory.name);
      data.append("description", subcategory.description);
      data.append("is_active", String(subcategory.is_active));
      data.append("image", subcategory.image);
      config = { headers: { "Content-Type": "multipart/form-data" } };
    }
    const res = await api.post("/cms/subcategories/", data, config);
    return res.data;
  }

  static async updateSubcategory(
    id: string,
    subcategory: Partial<Subcategory>
  ): Promise<Subcategory> {
    let data: any = {};
    let config = {};
    if (subcategory.image && typeof subcategory.image !== "string") {
      data = new FormData();
      if (subcategory.category !== undefined)
        data.append("category", subcategory.category);
      if (subcategory.name !== undefined) data.append("name", subcategory.name);
      if (subcategory.description !== undefined)
        data.append("description", subcategory.description);
      if (subcategory.is_active !== undefined)
        data.append("is_active", String(subcategory.is_active));
      data.append("image", subcategory.image);
      config = { headers: { "Content-Type": "multipart/form-data" } };
    } else {
      Object.entries(subcategory).forEach(([key, value]) => {
        if (value !== undefined) {
          data[key] = value;
        }
      });
    }
    const res = await api.put(`/cms/subcategories/${id}/`, data, config);
    return res.data;
  }

  static async deleteSubcategory(id: string): Promise<void> {
    await api.delete(`/cms/subcategories/${id}/`);
  }

  // Subsubcategories
  static async getSubsubcategories(): Promise<Subsubcategory[]> {
    const res = await api.get("/cms/subsubcategories/", {
      params: { page_size: 1000 },
    });
    return res.data.results;
  }

  static async getSubsubcategoriesWithPagination(
    page?: number,
    pageSize?: number,
    search?: string
  ): Promise<{ results: Subsubcategory[]; count: number }> {
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    const res = await api.get("/cms/subsubcategories/", { params });
    return res.data;
  }

  static async getSubsubcategoriesWithCategoryInfo(): Promise<any[]> {
    const res = await api.get("/cms/subsubcategories/", {
      params: { page_size: 100 },
    });
    return res.data.results;
  }

  static async getSubsubcategory(id: string): Promise<Subsubcategory | null> {
    const res = await api.get(`/cms/subsubcategories/${id}/`);
    return res.data;
  }

  static async createSubsubcategory(
    subsubcategory: Omit<Subsubcategory, "id" | "createdAt" | "updatedAt">
  ): Promise<Subsubcategory> {
    let data: any = subsubcategory;
    let config = {};
    if (subsubcategory.image && typeof subsubcategory.image !== "string") {
      data = new FormData();
      data.append("category", subsubcategory.category);
      data.append("subcategory", subsubcategory.subcategory);
      data.append("name", subsubcategory.name);
      data.append("description", subsubcategory.description);
      data.append("is_active", String(subsubcategory.is_active));
      data.append("image", subsubcategory.image);
      config = { headers: { "Content-Type": "multipart/form-data" } };
    }
    const res = await api.post("/cms/subsubcategories/", data, config);
    return res.data;
  }

  static async updateSubsubcategory(
    id: string,
    subsubcategory: Partial<Subsubcategory>
  ): Promise<Subsubcategory> {
    let data: any = {};
    let config = {};
    if (subsubcategory.image && typeof subsubcategory.image !== "string") {
      data = new FormData();
      if (subsubcategory.category !== undefined)
        data.append("category", subsubcategory.category);
      if (subsubcategory.subcategory !== undefined)
        data.append("subcategory", subsubcategory.subcategory);
      if (subsubcategory.name !== undefined)
        data.append("name", subsubcategory.name);
      if (subsubcategory.description !== undefined)
        data.append("description", subsubcategory.description);
      if (subsubcategory.is_active !== undefined)
        data.append("is_active", String(subsubcategory.is_active));
      data.append("image", subsubcategory.image);
      config = { headers: { "Content-Type": "multipart/form-data" } };
    } else {
      Object.entries(subsubcategory).forEach(([key, value]) => {
        if (value !== undefined) {
          data[key] = value;
        }
      });
    }
    const res = await api.put(`/cms/subsubcategories/${id}/`, data, config);
    return res.data;
  }

  static async deleteSubsubcategory(id: string): Promise<void> {
    await api.delete(`/cms/subsubcategories/${id}/`);
  }

  // Users
  static async getUsers() {
    const res = await api.get("/user/users/");
    return res.data.results;
  }

  static async getUsersWithPagination(
    page?: number,
    pageSize?: number,
    search?: string,
    role?: string,
    isActive?: boolean,
    name?: string,
    email?: string,
    username?: string,
    ordering?: string,
   

  ): Promise<{ results: User[]; count: number, total_active_count: number, total_inactive_count: number,total_managers_count: number,total_masters_count: number }> {
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    if (role) params.role = role;
    if (isActive !== undefined) params.is_active = isActive;
    if (name) params.name = name;
    if (email) params.email = email;
    if (username) params.username = username;
    if (ordering) params.ordering = ordering;

    const res = await api.get("/user/users/", { params });
    return res.data;
  }

  static async getUser(id: string) {
    const res = await api.get(`/user/users/${id}`);
    return res.data;
  }

  static async createUser(user: Omit<User, "id"> & { password: string }) {
    const res = await api.post("/user/users/", user);
    return res.data;
  }

  static async updateUser(id: string, user: Partial<User>) {
    let data: any = {};
    Object.entries(user).forEach(([key, value]) => {
      if (value !== undefined) {
        data[key] = value;
      }
    });
    const res = await api.put(`/user/users/${id}/`, data);
    return res.data;
  }

  static async deleteUser(id: string) {
    await api.delete(`/user/users/${id}/`);
  }

  // Brands
  static async getBrands(page?: number, pageSize?: number): Promise<Brand[]> {
    const res = await api.get("/cms/brands/", {
      params: { page, page_size: 100 },
    });
    return res.data.results;
  }

  static async getBrandsWithPagination(
    page?: number,
    pageSize?: number,
    search?: string,
    filters?: {
      status?: boolean;
      name?: string;
      description?: string;
      created_after?: string;
      created_before?: string;
      ordering?: string;
    }
  ): Promise<{
    results: Brand[];
    count: number;
    next: string | null;
    previous: string | null;
    total_active_count: number;
    total_inactive_count: number;
    total_brands_with_images_count: number;
  }> {
    const params: any = { page, page_size: pageSize };

    // Add search parameter
    if (search) params.search = search;

    // Add filter parameters
    if (filters) {
      if (filters.status !== undefined) params.status = filters.status;
      if (filters.name) params.name = filters.name;
      if (filters.description) params.description = filters.description;
      if (filters.created_after) params.created_after = filters.created_after;
      if (filters.created_before)
        params.created_before = filters.created_before;
      if (filters.ordering) params.ordering = filters.ordering;
    }

    const res = await api.get("/cms/brands/", { params });
    return res.data;
  }

  static async getBrand(id: string): Promise<Brand | null> {
    const res = await api.get(`/cms/brands/${id}/`);
    return res.data;
  }

  static async createBrand(brand: Omit<Brand, "id">): Promise<Brand> {
    let data: any = brand;
    let config = {};
    if (brand.image && typeof brand.image !== "string") {
      data = new FormData();
      data.append("name", brand.name);
      data.append("description", brand.description);
      data.append("is_active", String(brand.is_active));
      data.append("image", brand.image);
      config = { headers: { "Content-Type": "multipart/form-data" } };
    }
    const res = await api.post("/cms/brands/", data, config);
    return res.data;
  }

  static async updateBrand(id: string, brand: Partial<Brand>): Promise<Brand> {
    let data: any = {};
    let config = {};
    if (brand.image && typeof brand.image !== "string") {
      data = new FormData();
      if (brand.name !== undefined) data.append("name", brand.name);
      if (brand.description !== undefined)
        data.append("description", brand.description);
      if (brand.is_active !== undefined)
        data.append("is_active", String(brand.is_active));
      data.append("image", brand.image);
      config = { headers: { "Content-Type": "multipart/form-data" } };
    } else {
      Object.entries(brand).forEach(([key, value]) => {
        if (value !== undefined) {
          data[key] = value;
        }
      });
    }
    const res = await api.put(`/cms/brands/${id}/`, data, config);
    return res.data;
  }

  static async deleteBrand(id: string): Promise<void> {
    await api.delete(`/cms/brands/${id}/`);
  }

  // Upload Images
  static async uploadImages(images: File[]): Promise<any> {
    const formData = new FormData();
    images.forEach((file) => {
      formData.append("files", file);
    });
    const config = { headers: { "Content-Type": "multipart/form-data" } };
    const res = await api.post("/cms/upload/", formData, config);
    return res.data.files;
  }

  // Collection CRUD
  static async getCollections() {
    const res = await api.get("/cms/collections/");
    return res.data.results;
  }

  static async getCollectionsWithPagination(
    page?: number,
    pageSize?: number,
    search?: string,
    filters?: {
      status?: boolean;
      name?: string;
      description?: string;
      products?: number;
      created_after?: string;
      created_before?: string;
      ordering?: string;
    }
  ): Promise<{ results: any[]; count: number }> {
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    if (filters) {
      if (filters.status !== undefined) params.status = filters.status;
      if (filters.name) params.name = filters.name;
      if (filters.description) params.description = filters.description;
      if (filters.products !== undefined) params.products = filters.products;
      if (filters.created_after) params.created_after = filters.created_after;
      if (filters.created_before)
        params.created_before = filters.created_before;
      if (filters.ordering) params.ordering = filters.ordering;
    }
    const res = await api.get("/cms/collections/", { params });
    return res.data;
  }

  static async getCollection(id: string) {
    const res = await api.get(`/cms/collections/${id}/`);
    return res.data;
  }

  static async createCollection(collection: any) {
    const res = await api.post("/cms/collections/", collection);
    return res.data;
  }

  static async updateCollection(id: string, collection: any) {
    const res = await api.put(`/cms/collections/${id}/`, collection);
    return res.data;
  }

  static async deleteCollection(id: string) {
    await api.delete(`/cms/collections/${id}/`);
  }

  // Facility Inventory
  static async getFacilityInventories() {
    const res = await api.get(`/cms/facilityinventory/`);
    return res.data.results;
  }

  static async getFacilityInventory(facilityId: string) {
    const res = await api.get(`/cms/facilityinventory/${facilityId}/`);
    return res.data.results;
  }
  static async getFacilityInventoryByFacilityId(facilityId: string) {
    const res = await api.get(
      `/cms/facilityinventory/?facility_id=${facilityId}`
    );
    return res.data.results;
  }

  static async addFacilityInventory(inventory: Omit<FacilityInventory, "id">) {
    const res = await api.post(`/cms/facilityinventory/`, inventory);
    return res.data;
  }

  static async addProductsToFacility(id: string, product_variants: string[]) {
    const res = await api.post(`/cms/facilityinventory/add/`, {
      facility: Number(id),
      product_variant: product_variants,
    });
    return res.data;
  }

  static async updateFacilityInventory(
    facilityId: string,
    id: string,
    inventory: Partial<FacilityInventory>
  ): Promise<FacilityInventory> {
    const res = await api.put(`/cms/facilityinventory/`, inventory);
    return res.data;
  }

  static async deleteFacilityInventory(
    facilityInventoryId: string
  ): Promise<void> {
    await api.delete(`/cms/facilityinventory/${facilityInventoryId}/`);
  }

  static async getFacilityProducts(id: string) {
    const res = await api.get(`/cms/variants/${id}/`);
    return res.data.results;
  }

  // Image analysis component
  static async analyzeProductImage(
    imageFile: File,
    productName: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("item_section", productName);

    // Get access token from localStorage
    const tokens = localStorage.getItem("tokens");
    if (tokens) {
      formData.append("access_token", JSON.parse(tokens).access);
    }

    const response = await fetch(
      "https://backend-rozana-image.nbjfit.easypanel.host/analyze",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  static async getGS1DatacartProducts(ean: number | string): Promise<{
    status: boolean;
    message: string;
    pageInfo: {
      totalResults: number;
      resultsPerPage: number;
      totalPage: number;
      currentPageResults: number;
      currentPage: number;
    };
    items: any[];
  }> {
    const res = await api.get(`/cms/gs1?ean=${ean}`);
    return res.data;
  }

  // Attributes API
  static async getAttributes(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    isActive?: boolean,
    ordering?: string
  ): Promise<{
    count: number;
    next: string | null;
    previous: string | null;
    results: Attribute[];
  }> {
    const params: any = {
      page,
      page_size: pageSize,
    };

    if (search) params.search = search;
    if (isActive !== undefined) params.is_active = isActive;
    if (ordering) params.ordering = ordering;

    const res = await api.get("/cms/attributes/", { params });
    return res.data;
  }

  static async getAttribute(id: number): Promise<Attribute> {
    const res = await api.get(`/cms/attributes/${id}/`);
    return res.data;
  }

  static async createAttribute(data: AttributeRequest): Promise<Attribute> {
    const res = await api.post("/cms/attributes/", data);
    return res.data;
  }

  static async updateAttribute(
    id: number,
    data: AttributeRequest
  ): Promise<Attribute> {
    const res = await api.put(`/cms/attributes/${id}/`, data);
    return res.data;
  }

  static async deleteAttribute(id: number): Promise<void> {
    await api.delete(`/cms/attributes/${id}/`);
  }

  static async toggleAttributeStatus(
    id: number,
    isActive: boolean,
    name: string
  ): Promise<Attribute> {
    const res = await api.put(`/cms/attributes/${id}/`, {
      name: name,
      is_active: isActive,
    });
    return res.data;
  }

  // Product Types API (Category Attribute Assignment)
  static async getProductTypes(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    isActive?: boolean,
    ordering?: string
  ): Promise<{
    count: number;
    next: string | null;
    previous: string | null;
    results: ProductType[];
  }> {
    const params: any = {
      page,
      page_size: pageSize,
    };

    if (search) params.search = search;
    if (isActive !== undefined) params.is_active = isActive;
    if (ordering) params.ordering = ordering;

    const res = await api.get("/cms/product-types/", { params });
    return res.data;
  }

  static async getProductType(id: number | string): Promise<ProductType> {
    const res = await api.get(`/cms/product-types/${id}/`);
    return res.data;
  }

  static async getProductTypesByCategory(
    categoryId: number,
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    isActive?: boolean,
    ordering?: string
  ): Promise<{
    count: number;
    next: string | null;
    previous: string | null;
    results: ProductType[];
  }> {
    const params: any = {
      page,
      page_size: pageSize,
      category: categoryId,
    };

    if (search) params.search = search;
    if (isActive !== undefined) params.is_active = isActive;
    if (ordering) params.ordering = ordering;

    const res = await api.get("/cms/product-types/", { params });
    return res.data;
  }

  static async updateProductType(
    id: number,
    data: {
      category: number;
      attributes:
        | number[]
        | Array<{
            attribute_id: number;
            value_ids: number[];
          }>;
      is_active: boolean;
    }
  ): Promise<ProductType> {
    const res = await api.put(`/cms/product-types/${id}/`, data);
    return res.data;
  }

  static async createProductType(data: {
    category?: number;
    categories?: number[];
    attributes:
      | number[]
      | Array<{
          attribute_id: number;
          value_ids: number[];
        }>;
    is_active: boolean;
  }): Promise<ProductType> {
    const res = await api.post("/cms/product-types/", data);
    return res.data;
  }

  static async deleteProductType(id: number): Promise<void> {
    await api.delete(`/cms/product-types/${id}/`);
  }

  // Size Charts API
  static async getSizeCharts(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    isActive?: boolean,
    ordering?: string
  ): Promise<{
    count: number;
    next: string | null;
    previous: string | null;
    results: SizeChart[];
  }> {
    const params: any = {
      page,
      page_size: pageSize,
    };

    if (search) params.search = search;
    if (isActive !== undefined) params.is_active = isActive;
    if (ordering) params.ordering = ordering;

    const res = await api.get("/cms/size-charts/", { params });
    return res.data;
  }

  static async getSizeChart(id: number): Promise<SizeChart> {
    const res = await api.get(`/cms/size-charts/${id}/`);
    return res.data;
  }

  static async createSizeChart(data: SizeChartRequest): Promise<SizeChart> {
    const res = await api.post("/cms/size-charts/", data);
    return res.data;
  }

  static async updateSizeChart(
    id: number,
    data: SizeChartRequest
  ): Promise<SizeChart> {
    const res = await api.put(`/cms/size-charts/${id}/`, data);
    return res.data;
  }

  // Tabs API
  static async getTabs(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    isActive?: boolean,
    ordering?: string
  ): Promise<{
    count: number;
    next: string | null;
    previous: string | null;
    results: Tab[];
  }> {
    const params: any = { page, page_size: pageSize };

    if (search) params.search = search;
    if (isActive !== undefined) params.is_active = isActive;
    if (ordering) params.ordering = ordering;

    const res = await api.get("/cms/custom-tabs/", { params });
    return res.data;
  }

  static async getTab(id: number): Promise<Tab> {
    const res = await api.get(`/cms/custom-tabs/${id}/`);
    return res.data;
  }

  static async createTab(
    data: TabRequest | { categories: number[]; name: string; sections: number[]; is_active: boolean }
  ): Promise<Tab> {
    const res = await api.post("/cms/custom-tabs/", data);
    return res.data;
  }

  static async updateTab(
    id: number,
    data: TabRequest | { categories: number[]; name: string; sections: number[]; is_active: boolean }
  ): Promise<Tab> {
    const res = await api.put(`/cms/custom-tabs/${id}/`, data);
    return res.data;
  }

  static async deleteTab(id: number): Promise<void> {
    await api.delete(`/cms/custom-tabs/${id}/`);
  }

  static async getTabByCategory(categoryId: number): Promise<CustomTab[]> {
    const res = await api.get(`/cms/custom-tabs?category=${categoryId}`);
    return res.data.results || [];
  }

  static async toggleTabStatus(
    id: number,
    isActive: boolean,
    name: string
  ): Promise<Tab> {
    const res = await api.put(`/cms/custom-tabs/${id}/`, {
      name: name,
      is_active: isActive,
    });
    return res.data;
  }

  // Sections API
  static async getSections(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    isActive?: boolean,
    ordering?: string
  ): Promise<{
    count: number;
    next: string | null;
    previous: string | null;
    results: Section[];
  }> {
    const params: any = { page, page_size: pageSize };

    if (search) params.search = search;
    if (isActive !== undefined) params.is_active = isActive;
    if (ordering) params.ordering = ordering;

    const res = await api.get("/cms/custom-sections/", { params });
    return res.data;
  }

  static async getSection(id: number): Promise<Section> {
    const res = await api.get(`/cms/custom-sections/${id}/`, {
      params: {
        expand: "category",
        include: "category",
      },
    });
    return res.data;
  }

  static async createSection(
    data: SectionRequest | Omit<SectionRequest, "category">
  ): Promise<Section> {
    const res = await api.post("/cms/custom-sections/", data);
    return res.data;
  }

  static async updateSection(
    id: number,
    data: SectionRequest | Omit<SectionRequest, "category">
  ): Promise<Section> {
    const res = await api.put(`/cms/custom-sections/${id}/`, data);
    return res.data;
  }

  static async deleteSection(id: number): Promise<void> {
    await api.delete(`/cms/custom-sections/${id}/`);
  }

  // Custom Sections API - fetch sections by tab ID
  static async getCustomSectionsByTab(tabId: number): Promise<TabSection[]> {
    const res = await api.get(`/cms/custom-sections?tab=${tabId}`);
    return res.data.results || [];
  }

  // Custom Tab Details API - fetch tab with sections by tab ID
  static async getCustomTabDetails(tabId: number): Promise<CustomTab> {
    const res = await api.get(`/cms/custom-tabs/${tabId}/`);
    return res.data;
  }

  static async toggleSectionStatus(
    id: number,
    isActive: boolean,
    name: string
  ): Promise<Section> {
    const res = await api.put(`/cms/custom-sections/${id}/`, {
      name: name,
      is_active: isActive,
    });
    return res.data;
  }

  // Custom Sections API
  static async getCustomSectionsByCategory(categoryId: number): Promise<Tab[]> {
    const res = await api.get(`/cms/custom-sections?category=${categoryId}`);
    return res.data;
  }

  // Shelf Life API
  static async bulkUpdateShelfLife(data: {
    categories: Array<{
      id: number;
      shelf_life_required: boolean;
    }>;
  }): Promise<any> {
    const res = await api.post("/cms/categories/bulk-shelf-life-update/", data);
    return res.data;
  }

  static async getCategoriesWithShelfLife(
    page: number = 1,
    pageSize: number = 10,
    search?: string
  ): Promise<{
    count: number;
    next: string | null;
    previous: string | null;
    results: Array<{
      id: number;
      name: string;
      description: string;
      parent: number | null;
      image: string | null;
      is_active: boolean;
      rank: number;
      shelf_life_required: boolean;
    }>;
  }> {
    const params: any = {
      page,
      page_size: pageSize,
      shelf_life_required: true,
    };

    if (search) params.search = search;

    const res = await api.get("/cms/categories/", { params });
    return res.data;
  }

  // Size Charts by Category API
  static async getSizeChartsByCategory(categoryId: number): Promise<{
    count: number;
    next: string | null;
    previous: string | null;
    results: Array<{
      id: number;
      category: {
        id: number;
        name: string;
      };
      attribute: {
        id: number;
        name: string;
        attribute_type: string;
        values: Array<{
          id: number;
          attribute: number;
          value: string;
          is_active: boolean;
          rank: number;
        }>;
      };
      name: string;
      description: string;
      is_active: boolean;
      measurements: Array<{
        id: number;
        name: string;
        unit: string;
        is_required: boolean;
        is_active: boolean;
        rank: number;
      }>;
      measurements_count: number;
    }>;
  }> {
    const res = await api.get(`/cms/size-charts/?category=${categoryId}`);
    return res.data;
  }

  // Global search
  static async search(
    query: string,
    limit: number = 20
  ): Promise<{
    query: string;
    total_results: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
    results: Array<{
      type:
        | "product"
        | "brand"
        | "category"
        | "collection"
        | "facility"
        | "cluster"
        | "user";
      id: number;
      name: string;
      description?: string;
      category_name?: string;
      brand_name?: string;
      parent_name?: string;
      is_active: boolean;
      search_highlight: string[];
      url: string;
      relevance_score: number;
      priority_weight: number;
    }>;
    results_by_type: {
      products: any[];
      collections: any[];
      brands: any[];
      facilities: any[];
      categories: any[];
      clusters: any[];
      users: any[];
    };
  }> {
    const params = {
      q: query,
      limit: limit,
    };

    const res = await api.get("/cms/search/", { params });
    return res.data;
  }

  // Export methods for all entities
  static async exportBrands(
    search?: string,
    status?: boolean,
    createdAfter?: string,
    createdBefore?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<Blob> {
    const params: any = {};
    if (search) params.search = search;
    if (status !== undefined) params.status = status;
    if (createdAfter) params.created_after = createdAfter;
    if (createdBefore) params.created_before = createdBefore;
    if (sortBy) params.ordering = `${sortOrder === "desc" ? "-" : ""}${sortBy}`;

    const res = await api.get("/cms/brands/export/", {
      params,
      responseType: "blob",
    });
    return res.data;
  }

  static async exportCategories(
    search?: string,
    status?: boolean,
    parent?: string,
    rank?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<Blob> {
    const params: any = {};
    if (search) params.search = search;
    if (status !== undefined) params.status = status;
    if (parent) params.parent = parent;
    if (rank !== undefined) params.rank = rank;
    if (sortBy) params.ordering = `${sortOrder === "desc" ? "-" : ""}${sortBy}`;

    const res = await api.get("/cms/categories/export/", {
      params,
      responseType: "blob",
    });
    return res.data;
  }

  static async exportCollections(
    search?: string,
    status?: boolean,
    products?: string,
    facilities?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<Blob> {
    const params: any = {};
    if (search) params.search = search;
    if (status !== undefined) params.status = status;
    if (products) params.products = products;
    if (facilities) params.facilities = facilities;
    if (sortBy) params.ordering = `${sortOrder === "desc" ? "-" : ""}${sortBy}`;

    const res = await api.get("/cms/collections/export/", {
      params,
      responseType: "blob",
    });
    return res.data;
  }

  static async exportClusters(
    search?: string,
    status?: boolean,
    region?: string,
    facilities?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<Blob> {
    const params: any = {};
    if (search) params.search = search;
    if (status !== undefined) params.status = status;
    if (region) params.region = region;
    if (facilities) params.facilities = facilities;
    if (sortBy) params.ordering = `${sortOrder === "desc" ? "-" : ""}${sortBy}`;

    const res = await api.get("/cms/clusters/export/", {
      params,
      responseType: "blob",
    });
    return res.data;
  }

  static async exportFacilities(
    search?: string,
    status?: boolean,
    facilityType?: string,
    city?: string,
    region?: string,
    managers?: string,
    cluster?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<Blob> {
    const params: any = {};
    if (search) params.search = search;
    if (status !== undefined) params.status = status;
    if (facilityType) params.facility_type = facilityType;
    if (city) params.city = city;
    if (region) params.region = region;
    if (managers) params.managers = managers;
    if (cluster) params.cluster = cluster;
    if (sortBy) params.ordering = `${sortOrder === "desc" ? "-" : ""}${sortBy}`;

    const res = await api.get("/cms/facilities/export/", {
      params,
      responseType: "blob",
    });
    return res.data;
  }

  static async exportUsers(
    search?: string,
    role?: string,
    email?: string,
    username?: string,
    firstName?: string,
    lastName?: string,
    isActive?: boolean,
    isStaff?: boolean,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<Blob> {
    const params: any = {};
    if (search) params.search = search;
    if (role) params.role = role;
    if (email) params.email = email;
    if (username) params.username = username;
    if (firstName) params.first_name = firstName;
    if (lastName) params.last_name = lastName;
    if (isActive !== undefined) params.is_active = isActive;
    if (isStaff !== undefined) params.is_staff = isStaff;
    if (sortBy) params.ordering = `${sortOrder === "desc" ? "-" : ""}${sortBy}`;

    const res = await api.get("/user/export/", {
      params,
      responseType: "blob",
    });
    return res.data;
  }
  // Combos (Combo Products)
  static async getComboProducts(
    page?: number,
    pageSize?: number,
    search?: string,
    filters?: {
      status?: boolean;
    }
  ): Promise<any> {
    const params: any = {};
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    if (search) params.search = search;
    if (filters) {
      if (filters.status !== undefined) params.status = filters.status;
    }
    const res = await api.get("/cms/combo-products/", { params });
    return res.data;
  }

  static async getComboProduct(id: number): Promise<any> {
    const res = await api.get(`/cms/combo-products/${id}/`);
    return res.data;
  }

  static async createComboProduct(data: any): Promise<any> {
    const res = await api.post("/cms/combo-products/", data);
    return res.data;
  }

  static async updateComboProduct(
    id: string | number,
    data: any
  ): Promise<any> {
    const res = await api.put(`/cms/combo-products/${id}/`, data);
    return res.data;
  }

  static async deleteComboProduct(id: string | number): Promise<void> {
    await api.delete(`/cms/combo-products/${id}/`);
  }
  // Override Price API
  static async getOverridePrice(
    page: number = 1,
    pageSize: number = 100,
    requestBody: {
      cluster_ids: number[];
      facility_ids: number[];
      category_ids: number[];
      brand_ids?: number[];
      margin: number;
      type: "all";
      product_name?: string; // optional: search by product name only
    }
  ): Promise<{
    clusters: Array<{
      id: number;
      name: string;
    }>;
    facilities: Array<{
      id: number;
      name: string;
      city: string;
    }>;
    variants: Array<{
      id: number;
      name: string;
      sku: string;
      product_name: string;
      product_id: number;
    }>;
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const params = {
      page,
      page_size: pageSize,
    };

    const res = await api.post("/cms/override-price/", requestBody, { params });
    return res.data;
  }
}
