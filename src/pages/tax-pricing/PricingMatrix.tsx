import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Save,
  RefreshCw,
  Building,
  Users,
  Copy,
  Settings,
  DollarSign,
  Percent,
  X,
  Check,
  ChevronDown,
  Filter,
  Search,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ApiService } from '@/services/api';

// Interfaces
interface Cluster {
  id: number;
  name: string;
}

interface Facility {
  id: number;
  name: string;
  city: string;
}

interface Variant {
  id: number;
  name: string;
  sku: string;
  mrp: number;
  product_name: string;
  product_id: number;
  base_price?: number;
  selling_price?: number;
}

// Normalize variants from API to ensure base_price is always captured
const mapVariant = (v: any): Variant => ({
  id: Number(v.id),
  name: v.name ?? '',
  sku: v.sku ?? '',
  mrp: v.mrp ?? 0,
  product_name: v.product_name ?? v.product?.name ?? '',
  product_id: Number(v.product_id ?? v.product?.id ?? 0),
  base_price: v.base_price !== undefined && v.base_price !== null
    ? Number(v.base_price)
    : (v.selling_price !== undefined && v.selling_price !== null
        ? Number(v.selling_price)
        : undefined),
  selling_price: v.selling_price !== undefined && v.selling_price !== null
    ? Number(v.selling_price)
    : undefined,
});

interface Category {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

interface PricingUpdate {
  variantId: number;
  currentPrice: number;
  newPrice: number;
  margin: number;
}

export default function PricingMatrix() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Data state
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Selection state
  const [selectedClusters, setSelectedClusters] = useState<number[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<number[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<number[]>([]);

  // Search state
  const [clusterSearchTerm, setClusterSearchTerm] = useState('');
  const [facilitySearchTerm, setFacilitySearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const [variantSearchTerm, setVariantSearchTerm] = useState('');

  // Dialog state
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [marginPercentage, setMarginPercentage] = useState<number>(0);
  const [filteredVariants, setFilteredVariants] = useState<Variant[]>([]);
  const [pricingUpdates, setPricingUpdates] = useState<PricingUpdate[]>([]);

  // Loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    clusters: false,
    facilities: false,
    categories: false,
    brands: false,
    variants: false,
  });
  const [facilitiesCountByCluster, setFacilitiesCountByCluster] = useState<Record<number, number>>({});

  const isAnyLoading =
    loading ||
    loadingStates.clusters ||
    loadingStates.facilities ||
    loadingStates.categories ||
    loadingStates.brands ||
    loadingStates.variants;

  // New loading states for dialog actions
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);
  const [isUpdatingSelected, setIsUpdatingSelected] = useState(false);

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'all' | 'selected' | null>(null);

  // Load all data with pagination
  const loadAllDataWithPagination = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load clusters (no pagination needed)
      setLoadingStates(prev => ({ ...prev, clusters: true }));
      const clustersData = await ApiService.getClusters();
      const clustersWithFacilities = clustersData.filter((cluster: any) => cluster.facilities?.length > 0);
      setClusters(clustersWithFacilities.map((cluster: any) => ({
        id: cluster.id,
        name: cluster.name,
      })));
      // Precompute facilities count per cluster if present in response
      try {
        const counts: Record<number, number> = {};
        clustersData.forEach((c: any) => {
          const fidCount = Array.isArray(c.facilities) ? c.facilities.length : 0;
          counts[Number(c.id)] = fidCount;
        });
        setFacilitiesCountByCluster(counts);
      } catch {}
      setLoadingStates(prev => ({ ...prev, clusters: false }));

      // Load facilities (no pagination needed)
      setLoadingStates(prev => ({ ...prev, facilities: true }));
      const facilitiesData = await ApiService.getFacilities();
      setFacilities(facilitiesData.map((facility: any) => ({
        id: facility.id,
        name: facility.name,
        city: facility.city || '',
      })));
      setLoadingStates(prev => ({ ...prev, facilities: false }));

      // Load all categories with pagination
      setLoadingStates(prev => ({ ...prev, categories: true }));
      let allCategories: any[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const categoriesData = await ApiService.getCategories(page, 10000);
        allCategories = [...allCategories, ...categoriesData];
        hasMore = categoriesData.length === 10000;
        page++;
      }
      
      setCategories(allCategories.map((category: any) => ({
        id: category.id,
        name: category.name,
      })));
      setLoadingStates(prev => ({ ...prev, categories: false }));

      // Load all brands with pagination
      setLoadingStates(prev => ({ ...prev, brands: true }));
      let allBrands: any[] = [];
      page = 1;
      hasMore = true;
      
      while (hasMore) {
        const brandsData = await ApiService.getBrands(page, 10000);
        allBrands = [...allBrands, ...brandsData];
        hasMore = brandsData.length === 10000;
        page++;
      }
      
      setBrands(allBrands.map((brand: any) => ({
        id: brand.id,
        name: brand.name,
      })));
      setLoadingStates(prev => ({ ...prev, brands: false }));

      // Load all variants with pagination
      setLoadingStates(prev => ({ ...prev, variants: true }));
      let allVariants: any[] = [];
      page = 1;
      hasMore = true;
      
      while (hasMore) {
        const variantsData = await ApiService.getProductVariants(page, 1000);
        allVariants = [...allVariants, ...variantsData.results];
        hasMore = variantsData.results.length === 1000;
        page++;
      }
      
      setVariants(allVariants.map((variant: any) => mapVariant(variant)));
      setLoadingStates(prev => ({ ...prev, variants: false }));

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
      toast({
        title: 'Error',
        description: 'Failed to load data. Please try again.',
        variant: 'destructive',
      });
      // Reset loading states
      setLoadingStates({
        clusters: false,
        facilities: false,
        categories: false,
        brands: false,
        variants: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // Load all data on component mount
  useEffect(() => {
    loadAllDataWithPagination();
  }, [toast]);

  // Clear other selections when clusters are deselected
  useEffect(() => {
    if (selectedClusters.length === 0) {
      setSelectedFacilities([]);
      setSelectedCategories([]);
      setSelectedBrands([]);
      setSelectedVariants([]);
    }
  }, [selectedClusters]);

  // Search filters
  const filteredClustersForSearch = useMemo(() => {
    return clusters.filter(cluster =>
      (cluster.name ?? '').toLowerCase().includes((clusterSearchTerm ?? '').toLowerCase())
    );
  }, [clusters, clusterSearchTerm]);

  const filteredFacilitiesForSearch = useMemo(() => {
    return facilities.filter(facility =>
      (facility.name ?? '').toLowerCase().includes((facilitySearchTerm ?? '').toLowerCase())
    );
  }, [facilities, facilitySearchTerm]);

  const filteredCategoriesForSearch = useMemo(() => {
    return categories.filter(category =>
      (category.name ?? '').toLowerCase().includes((categorySearchTerm ?? '').toLowerCase())
    );
  }, [categories, categorySearchTerm]);

  const filteredBrandsForSearch = useMemo(() => {
    return brands.filter(brand =>
      (brand.name ?? '').toLowerCase().includes((brandSearchTerm ?? '').toLowerCase())
    );
  }, [brands, brandSearchTerm]);

  const filteredVariantsForSearch = useMemo(() => {
    return variants.filter(variant =>
      ((variant.product_name ?? '').toLowerCase().includes((variantSearchTerm ?? '').toLowerCase()) ||
      (variant.sku ?? '').toLowerCase().includes((variantSearchTerm ?? '').toLowerCase()))
    );
  }, [variants, variantSearchTerm]);

  // Handle cluster selection
  const handleClusterToggle = (clusterId: number) => {
    // If cluster has no facilities, block selection and show error
    const facilityCount = facilitiesCountByCluster[clusterId] ?? 0;
    if (facilityCount === 0) {
      toast({
        title: 'No facilities in cluster',
        description: 'This cluster has no facilities. Please select a different cluster.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedClusters(prev => {
      const newSelection = prev.includes(clusterId) 
        ? prev.filter(id => id !== clusterId)
        : [...prev, clusterId];
      
      // If no clusters selected, clear all other selections
      if (newSelection.length === 0) {
        setSelectedFacilities([]);
        setSelectedCategories([]);
        setSelectedBrands([]);
        setSelectedVariants([]);
      }
      
      return newSelection;
    });
  };

  // Handle facility selection
  const handleFacilityToggle = (facilityId: number) => {
    setSelectedFacilities(prev => 
      prev.includes(facilityId) 
        ? prev.filter(id => id !== facilityId)
        : [...prev, facilityId]
    );
  };

  // Handle category selection
  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Handle brand selection
  const handleBrandToggle = (brandId: number) => {
    setSelectedBrands(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  // Handle variant selection
  const handleVariantToggle = (variantId: number) => {
    setSelectedVariants(prev => 
      prev.includes(variantId) 
        ? prev.filter(id => id !== variantId)
        : [...prev, variantId]
    );
  };

  // Handle select all clusters
  const handleSelectAllClusters = () => {
    if (selectedClusters.length === filteredClustersForSearch.length) {
      setSelectedClusters([]);
      // Clear all other selections when deselecting all clusters
      setSelectedFacilities([]);
      setSelectedCategories([]);
      setSelectedBrands([]);
      setSelectedVariants([]);
    } else {
      // Check if any clusters don't have facilities before selecting all
      const clustersWithoutFacilities = filteredClustersForSearch.filter(
        cluster => (facilitiesCountByCluster[cluster.id] ?? 0) === 0
      );
      
      if (clustersWithoutFacilities.length > 0) {
        toast({
          title: 'Some clusters don\'t have facilities',
          description: `The following clusters have no facilities and cannot be selected.`,
          variant: 'destructive',
        });
        return;
      }
      
      setSelectedClusters(filteredClustersForSearch.map(c => c.id));
    }
  };

  // Handle select all facilities
  const handleSelectAllFacilities = () => {
    if (selectedFacilities.length === filteredFacilitiesForSearch.length) {
      setSelectedFacilities([]);
    } else {
      setSelectedFacilities(filteredFacilitiesForSearch.map(f => f.id));
    }
  };

  // Handle select all categories
  const handleSelectAllCategories = () => {
    if (selectedCategories.length === filteredCategoriesForSearch.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(filteredCategoriesForSearch.map(c => c.id));
    }
  };

  // Handle select all brands
  const handleSelectAllBrands = () => {
    if (selectedBrands.length === filteredBrandsForSearch.length) {
      setSelectedBrands([]);
    } else {
      setSelectedBrands(filteredBrandsForSearch.map(b => b.id));
    }
  };

  // Handle select all variants
  const handleSelectAllVariants = () => {
    if (selectedVariants.length === filteredVariantsForSearch.length) {
      setSelectedVariants([]);
      } else {
      setSelectedVariants(filteredVariantsForSearch.map(v => v.id));
    }
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedClusters([]);
    setSelectedFacilities([]);
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedVariants([]);
  };

  // Get display text for selected items
  const getSelectedClustersDisplay = () => {
    if (selectedClusters.length === 0) return 'Select Clusters';
    if (selectedClusters.length === 1) {
      const cluster = clusters.find(c => c.id === selectedClusters[0]);
      return cluster?.name || 'Select Clusters';
    }
    return `${selectedClusters.length} clusters selected`;
  };

  const getSelectedFacilitiesDisplay = () => {
    if (selectedFacilities.length === 0) return 'Select Facilities';
    if (selectedFacilities.length === 1) {
      const facility = facilities.find(f => f.id === selectedFacilities[0]);
      return facility?.name || 'Select Facilities';
    }
    return `${selectedFacilities.length} facilities selected`;
  };

  const getSelectedCategoriesDisplay = () => {
    if (selectedCategories.length === 0) return 'Select Categories';
    if (selectedCategories.length === 1) {
      const category = categories.find(c => c.id === selectedCategories[0]);
      return category?.name || 'Select Categories';
    }
    return `${selectedCategories.length} categories selected`;
  };

  const getSelectedBrandsDisplay = () => {
    if (selectedBrands.length === 0) return 'Select Brands';
    if (selectedBrands.length === 1) {
      const brand = brands.find(b => b.id === selectedBrands[0]);
      return brand?.name || 'Select Brands';
    }
    return `${selectedBrands.length} brands selected`;
  };

  const getSelectedVariantsDisplay = () => {
    if (selectedVariants.length === 0) return 'Select Variants';
    if (selectedVariants.length === 1) {
      const variant = variants.find(v => v.id === selectedVariants[0]);
      return variant?.product_name || 'Select Variants';
    }
    return `${selectedVariants.length} variants selected`;
  };

  // Handle apply filters
  const handleApplyFilters = () => {
    if (selectedClusters.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one cluster to apply filters.',
        variant: 'destructive',
      });
      return;
    }

    // Filter variants based on selected criteria
    let filteredVariants = variants;

    if (selectedFacilities.length > 0) {
      // Filter by facilities if needed
      // For now, we'll show all variants since we don't have facility-variant relationship
    }

    if (selectedCategories.length > 0) {
      // Filter by categories if needed
      // For now, we'll show all variants since we don't have category-variant relationship
    }

    if (selectedBrands.length > 0) {
      // Filter by brands if needed
      // For now, we'll show all variants since we don't have brand-variant relationship
    }

    if (selectedVariants.length > 0) {
      filteredVariants = filteredVariants.filter(variant => 
        selectedVariants.includes(variant.id)
      );
    }

    setFilteredVariants(filteredVariants);
    setIsApplyDialogOpen(true);
  };

  // Handle margin calculation
  const handleMarginChange = (value: number) => {
    setMarginPercentage(value);
    
    const updates = filteredVariants.map(variant => {
      const base = typeof variant.base_price === 'number' ? variant.base_price : (typeof variant.selling_price === 'number' ? variant.selling_price : 100);
      const newPrice = base * (1 + value / 100);
      return {
        variantId: variant.id,
        currentPrice: base,
        newPrice: Math.round(newPrice),
        margin: value
      };
    });
    setPricingUpdates(updates);
  };

  const isAllVariantsSelected =
  selectedVariants.length > 0 &&
  selectedVariants.length === filteredVariantsForSearch.length;

  // Handle update prices
  const handleUpdatePrices = async () => {
    if (!isApplyDialogOpen || marginPercentage <= 0) {
      toast({ title: 'Enter margin', description: 'Add a margin before updating.', variant: 'destructive' });
      return;
    }
    // open confirmation for selected path
    setPendingAction('selected');
    setConfirmOpen(true);
  };

  // Confirm update all variants for selected filters
  const handleConfirmUpdateAll = async () => {
    if (marginPercentage <= 0) {
      toast({ title: 'Enter margin', description: 'Add a margin before updating.', variant: 'destructive' });
      return;
    }
    setIsUpdatingAll(true);
    try {
      const payload: any = {
        cluster_ids: selectedClusters,
        margin: marginPercentage,
        type: 'all',
      };
      if (selectedFacilities.length) payload.facility_ids = selectedFacilities;
      if (selectedCategories.length) payload.category_ids = selectedCategories;
      if (selectedBrands.length) payload.brand_ids = selectedBrands;

      await ApiService.getOverridePrice(1, 100, payload);
      toast({ title: 'Prices Updated', description: `Applied ${marginPercentage}% margin to all variants in selected filters.` });
    } catch (e) {
      console.error(e);
      toast({ title: 'Update Failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsUpdatingAll(false);
      setIsApplyDialogOpen(false); // close dialog after loading finishes
      setMarginPercentage(0);
      setPricingUpdates([]);
    }
  };

  // Confirm and execute the pending action
  const executeConfirmedUpdate = async () => {
    if (pendingAction === 'all') {
      await handleConfirmUpdateAll();
    } else if (pendingAction === 'selected') {
      // run the same logic as update selected
      if (marginPercentage <= 0) {
        toast({ title: 'Enter margin', description: 'Add a margin before updating.', variant: 'destructive' });
          return;
        }
      if (selectedVariantObjects.length === 0) {
        toast({ title: 'No variants', description: 'Select at least one variant.', variant: 'destructive' });
        return;
      }
      setIsUpdatingSelected(true);
      try {
        const payload: any = {
          cluster_ids: selectedClusters,
          margin: marginPercentage,
          variant_ids: selectedVariantObjects.map(v => v.id),
        };
        if (selectedFacilities.length) payload.facility_ids = selectedFacilities;
        if (selectedCategories.length) payload.category_ids = selectedCategories;
        if (selectedBrands.length) payload.brand_ids = selectedBrands;

        await ApiService.getOverridePrice(1, 100, payload);
        toast({ title: 'Prices Updated', description: `Updated ${selectedVariantObjects.length} variants by ${marginPercentage}%.` });
        setIsApplyDialogOpen(false);
        setMarginPercentage(0);
        setPricingUpdates([]);
      } finally {
        setIsUpdatingSelected(false);
      }
    }
    setConfirmOpen(false);
    setPendingAction(null);
  };

  // Check if other dropdowns should be disabled
  const areOtherDropdownsDisabled = selectedClusters.length === 0;

  // Build discovery payload (no margin, no type)
  const buildDiscoveryPayload = () => {
    const payload: any = {
      cluster_ids: selectedClusters,
    };
    if (selectedFacilities.length) payload.facility_ids = selectedFacilities;
    if (selectedCategories.length) payload.category_ids = selectedCategories;
    if (selectedBrands.length) payload.brand_ids = selectedBrands;
    return payload;
  };

  // Fetch and populate when clusters change (includes facilities)
  const fetchOnClustersChange = async () => {
    if (!selectedClusters.length) {
      setFacilities([]); setBrands([]); setVariants([]); setCategories([]);
            return;
          }
    // Show facilities loader and clear list so spinner is visible
    setLoadingStates(prev => ({ ...prev, facilities: true }));
    setFacilities([]);
    const res = await ApiService.getOverridePrice(1, 100, { cluster_ids: selectedClusters } as any);
    // facilities (populate on cluster change)
    if (Array.isArray((res as any).facilities)) {
      setFacilities((res as any).facilities.map((f: any) => ({
        id: Number(f.id), name: f.name, city: f.city || '',
      })));
    }
    // categories
    if (Array.isArray((res as any).categories)) {
      setCategories((res as any).categories.map((c: any) => ({
        id: Number(c.id), name: c.name,
      })));
    }
    // brands
    if (Array.isArray((res as any).brands)) {
      setBrands((res as any).brands.map((b: any) => ({
        id: Number(b.id), name: b.name,
      })));
    }
    // variants
    if (Array.isArray((res as any).variants)) {
      setVariants((res as any).variants.map((v: any) => mapVariant(v)));
    }
    // Hide facilities loader after data is set
    setLoadingStates(prev => ({ ...prev, facilities: false }));
  };

  // Fetch and populate when facilities change (do NOT touch facilities list)
  const fetchOnFacilitiesChange = async () => {
    if (!selectedClusters.length) return;
    const res = await (ApiService.getOverridePrice as any)(1, 100, buildDiscoveryPayload());
    // categories
    if (Array.isArray((res as any).categories)) {
      setCategories((res as any).categories.map((c: any) => ({
        id: Number(c.id), name: c.name,
      })));
    }
    // brands
    if (Array.isArray((res as any).brands)) {
      setBrands((res as any).brands.map((b: any) => ({
        id: Number(b.id), name: b.name,
      })));
    }
    // variants
    if (Array.isArray((res as any).variants)) {
      setVariants((res as any).variants.map((v: any) => mapVariant(v)));
    }
  };

  // Fetch and populate when categories or brands change (variants only)
  const fetchOnCategoriesBrandsChange = async () => {
    if (!selectedClusters.length) return;
    const res = await (ApiService.getOverridePrice as any)(1, 100, buildDiscoveryPayload());
    if (Array.isArray((res as any).variants)) {
      setVariants((res as any).variants.map((v: any) => mapVariant(v)));
    }
  };

  useEffect(() => {
    fetchOnClustersChange().catch(console.error);
  }, [selectedClusters]);

  // facilities selection affects categories, brands, variants
  useEffect(() => {
    if (!selectedClusters.length) return;
    fetchOnFacilitiesChange().catch(console.error);
  }, [selectedFacilities]);

  // categories/brands selection affects variants only
  useEffect(() => {
    if (!selectedClusters.length) return;
    fetchOnCategoriesBrandsChange().catch(console.error);
  }, [selectedCategories, selectedBrands]);

  const selectedVariantObjects = useMemo(
    () => variants.filter(v => selectedVariants.includes(v.id)),
    [variants, selectedVariants]
  );

  const selectedClusterNames = useMemo(
    () => clusters.filter(c => selectedClusters.includes(c.id)).map(c => c.name),
    [clusters, selectedClusters]
  );
  const selectedFacilityNames = useMemo(
    () => facilities.filter(f => selectedFacilities.includes(f.id)).map(f => f.name),
    [facilities, selectedFacilities]
  );
  const selectedCategoryNames = useMemo(
    () => categories.filter(c => selectedCategories.includes(c.id)).map(c => c.name),
    [categories, selectedCategories]
  );
  const selectedBrandNames = useMemo(
    () => brands.filter(b => selectedBrands.includes(b.id)).map(b => b.name),
    [brands, selectedBrands]
  );

  const handleUpdateSelected = async () => {
    if (marginPercentage <= 0) {
      toast({ title: 'Enter margin', description: 'Add a margin before updating.', variant: 'destructive' });
      return;
    }
    if (selectedVariantObjects.length === 0) {
      toast({ title: 'No variants', description: 'Select at least one variant.', variant: 'destructive' });
      return;
    }
    setIsUpdatingSelected(true);
    try {
      const payload: any = {
        cluster_ids: selectedClusters,
        margin: marginPercentage,
        variant_ids: selectedVariantObjects.map(v => v.id),
      };
      if (selectedFacilities.length) payload.facility_ids = selectedFacilities;
      if (selectedCategories.length) payload.category_ids = selectedCategories;
      if (selectedBrands.length) payload.brand_ids = selectedBrands;

      await ApiService.getOverridePrice(1, 100, payload);
      toast({ title: 'Prices Updated', description: `Updated ${selectedVariantObjects.length} variants by ${marginPercentage}%.` });
      setIsApplyDialogOpen(false);
      setMarginPercentage(0);
      setPricingUpdates([]);
    } finally {
      setIsUpdatingSelected(false);
    }
  };

  if (loading) {
        return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading data...</span>
          </div>
        );
      }

  if (error) {
      return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <X className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-500">{error}</p>
          </div>
        </div>
      );
    }

      return (
    <div className="space-y-6 p-[1.5rem] ">
      <PageHeader
        title="Pricing Matrix"
        description="Manage product pricing across clusters and facilities"
        // icon={DollarSign}
      />

      {/* Filter Section */}
      <Card>
        {/* <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Products
          </CardTitle>
        </CardHeader> */}
        <CardContent className="space-y-6 pt-4">
          {/* Filter Grid */}
          <div className=" w-[600px] flex flex-col gap-4 m-auto">
            {/* Clusters Dropdown - First */}
            <div className="space-y-2">
              <Label>Clusters {loadingStates.clusters && <Loader2 className="h-3 w-3 animate-spin inline ml-1" />}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-[50px]">
                    {getSelectedClustersDisplay()}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px]  p-0">
                  <div className="p-3 border-b">
            <Input
                      placeholder="Search clusters..."
                      value={clusterSearchTerm}
                      onChange={(e) => setClusterSearchTerm(e.target.value)}
                      className="h-8 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
            </div>
                  <ScrollArea className="h-[200px]">
                    <div className="p-2">
                      <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                        <Checkbox
                          id="select-all-clusters"
                          checked={selectedClusters.length === filteredClustersForSearch.length && filteredClustersForSearch.length > 0}
                          onCheckedChange={handleSelectAllClusters}
                          disabled={loadingStates.clusters}
                           className="mr-2 cursor-pointer"
                        />
                        <Label htmlFor="select-all-clusters" className="text-sm font-medium">
                          Select All 
                          {/* ({filteredClustersForSearch.length}) */}
                        </Label>
          </div>
                      {loadingStates.clusters ? (
                        <div className="flex items-center justify-center py-6 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
            </div>
          ) : (
            
                        filteredClustersForSearch
                          .map((cluster) => (
                          <div key={cluster.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                            <Checkbox
                              id={`cluster-${cluster.id}`}
                              checked={selectedClusters.includes(cluster.id)}
                              onCheckedChange={() => handleClusterToggle(cluster.id)}
                              disabled={loadingStates.clusters}
                              className="mr-2 cursor-pointer" 
                            />
                            <Label htmlFor={`cluster-${cluster.id}`} className="text-sm">
                              {cluster.name}
                            </Label>
            </div>
                        ))
                      )}
            </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
        </div>

            {/* Facilities Dropdown - Second */}
            <div className="space-y-2">
              <Label>Facilities {loadingStates.facilities && <Loader2 className="h-3 w-3 animate-spin inline ml-1" />}</Label>
              <Popover>
                <PopoverTrigger asChild>
            <Button
                    variant="outline" 
                    className="w-full justify-between  h-[50px]"
                    disabled={areOtherDropdownsDisabled || isAnyLoading}
                  >
                    {getSelectedFacilitiesDisplay()}
                    <ChevronDown className="h-4 w-4" />
            </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px] p-0">
                  <div className="p-3 border-b">
                    <Input
                      placeholder="Search facilities..."
                      value={facilitySearchTerm}
                      onChange={(e) => setFacilitySearchTerm(e.target.value)}
                      className="h-8 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      disabled={areOtherDropdownsDisabled}
                    />
          </div>
                  <ScrollArea className="h-[200px]">
                    <div className="p-2">
                      <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                        <Checkbox
                          id="select-all-facilities"
                          checked={selectedFacilities.length === filteredFacilitiesForSearch.length && filteredFacilitiesForSearch.length > 0}
                          onCheckedChange={handleSelectAllFacilities}
                          disabled={areOtherDropdownsDisabled || loadingStates.facilities}
                           className="mr-2 cursor-pointer"
                        />
                        <Label htmlFor="select-all-facilities" className="text-sm font-medium">
                          Select All 
                          {/* ({filteredFacilitiesForSearch.length}) */}
                        </Label>
                  </div>
                      {loadingStates.facilities ? (
                        <div className="flex items-center justify-center py-6 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                  </div>
                      ) : (
                        filteredFacilitiesForSearch.map((facility) => (
                          <div key={facility.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                            <Checkbox
                              id={`facility-${facility.id}`}
                              checked={selectedFacilities.includes(facility.id)}
                              onCheckedChange={() => handleFacilityToggle(facility.id)}
                              disabled={areOtherDropdownsDisabled || loadingStates.facilities}
                               className="mr-2 cursor-pointer"
                            />
                            <Label htmlFor={`facility-${facility.id}`} className="text-sm">
                              {facility.name}
                            </Label>
                          </div>
                        ))
            )}
          </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
        </div>

            {/* Categories Dropdown - Third */}
            <div className="space-y-2">
              <Label>Categories {loadingStates.categories && <Loader2 className="h-3 w-3 animate-spin inline ml-1" />}</Label>
              <Popover>
                <PopoverTrigger asChild>
              <Button
                    variant="outline" 
                    className="w-full justify-between  h-[50px]"
                    disabled={areOtherDropdownsDisabled || isAnyLoading}
                  >
                    {getSelectedCategoriesDisplay()}
                    <ChevronDown className="h-4 w-4" />
              </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px] p-0">
                  <div className="p-3 border-b">
                    <Input
                      placeholder="Search categories..."
                      value={categorySearchTerm}
                      onChange={(e) => setCategorySearchTerm(e.target.value)}
                      className="h-8 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      disabled={areOtherDropdownsDisabled}
                    />
          </div>
                  <ScrollArea className="h-[200px]">
                    <div className="p-2">
                      <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                        <Checkbox
                          id="select-all-categories"
                          checked={selectedCategories.length === filteredCategoriesForSearch.length && filteredCategoriesForSearch.length > 0}
                          onCheckedChange={handleSelectAllCategories}
                          disabled={areOtherDropdownsDisabled || loadingStates.categories}
                           className="mr-2 cursor-pointer"
                        />
                        <Label htmlFor="select-all-categories" className="text-sm font-medium">
                          Select All 
                          {/* ({filteredCategoriesForSearch.length}) */}
            </Label>
                      </div>
                                             {loadingStates.categories && (
                          <div className="flex items-center justify-center py-6 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                        </div>
                      )}
                      {!loadingStates.categories && filteredCategoriesForSearch.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={selectedCategories.includes(category.id)}
                            onCheckedChange={() => handleCategoryToggle(category.id)}
                            disabled={areOtherDropdownsDisabled || loadingStates.categories}
                             className="mr-2 cursor-pointer"
                          />
                          <Label htmlFor={`category-${category.id}`} className="text-sm">
                            {category.name}
                          </Label>
          </div>
                      ))}
        </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
      </div>

            {/* Brands Dropdown - Fourth */}
            <div className="space-y-2">
              <Label>Brands {loadingStates.brands && <Loader2 className="h-3 w-3 animate-spin inline ml-1" />}</Label>
              <Popover>
                <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                    className="w-full justify-between  h-[50px]"
                    disabled={areOtherDropdownsDisabled || isAnyLoading}
                    >
                    {getSelectedBrandsDisplay()}
                    <ChevronDown className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px] p-0">
                  <div className="p-3 border-b">
                    <Input
                      placeholder="Search brands..."
                      value={brandSearchTerm}
                      onChange={(e) => setBrandSearchTerm(e.target.value)}
                      className="h-8 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      disabled={areOtherDropdownsDisabled}
                    />
                </div>
                  <ScrollArea className="h-[200px]">
                    <div className="p-2">
                      <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                        <Checkbox
                          id="select-all-brands"
                          checked={selectedBrands.length === filteredBrandsForSearch.length && filteredBrandsForSearch.length > 0}
                          onCheckedChange={handleSelectAllBrands}
                          disabled={areOtherDropdownsDisabled || loadingStates.brands}
                           className="mr-2 cursor-pointer"
                        />
                        <Label htmlFor="select-all-brands" className="text-sm font-medium">
                          Select All 
                          {/* ({filteredBrandsForSearch.length}) */}
                        </Label>
              </div>
                                             {loadingStates.brands && (
                          <div className="flex items-center justify-center py-6 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
              </div>
                      )}
                      {!loadingStates.brands && filteredBrandsForSearch.map((brand) => (
                        <div key={brand.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                          <Checkbox
                            id={`brand-${brand.id}`}
                            checked={selectedBrands.includes(brand.id)}
                            onCheckedChange={() => handleBrandToggle(brand.id)}
                            disabled={areOtherDropdownsDisabled || loadingStates.brands}
                             className="mr-2 cursor-pointer"
                          />
                          <Label htmlFor={`brand-${brand.id}`} className="text-sm">
                            {brand.name}
                          </Label>
            </div>
                      ))}
              </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>


          {/* Variants Dropdown - Fifth */}
          <div className="space-y-2 ">
              <Label>Variants {loadingStates.variants && <Loader2 className="h-3 w-3 animate-spin inline ml-1" />}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between h-[50px] "
                    disabled={areOtherDropdownsDisabled || isAnyLoading}
                  >
                    {getSelectedVariantsDisplay()}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px] p-0">
                  <div className="p-3 border-b">
                    <Input
                      placeholder="Search variants..."
                      value={variantSearchTerm}
                      onChange={(e) => setVariantSearchTerm(e.target.value)}
                      className="h-8 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      disabled={areOtherDropdownsDisabled}
                    />
              </div>
                  <ScrollArea className="h-[200px]">
                    <div className="p-2">
                      <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                        <Checkbox
                          id="select-all-variants"
                          checked={selectedVariants.length === filteredVariantsForSearch.length && filteredVariantsForSearch.length > 0}
                          onCheckedChange={handleSelectAllVariants}
                          disabled={areOtherDropdownsDisabled || loadingStates.variants}
                           className="mr-2 cursor-pointer"
                        />
                        <Label htmlFor="select-all-variants" className="text-sm font-medium">
                          Select All 
                          {/* ({filteredVariantsForSearch.length}) */}
                        </Label>
                </div>
                                             {loadingStates.variants ? (
                          <div className="flex items-center justify-center py-6 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                  </div>
                      ) : (
                        filteredVariantsForSearch.map((variant) => (
                          <div key={variant.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                            <Checkbox
                              id={`variant-${variant.id}`}
                              checked={selectedVariants.includes(variant.id)}
                              onCheckedChange={() => handleVariantToggle(variant.id)}
                              disabled={areOtherDropdownsDisabled || loadingStates.variants}
                               className="mr-2 cursor-pointer"
                            />
                            <Label htmlFor={`variant-${variant.id}`} className="text-sm">
                              <div className="font-medium">{variant.product_name}</div>
                              <div className="text-xs text-muted-foreground">{variant.sku}</div>
                            </Label>
                  </div>
                        ))
                      )}
                  </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
                  </div>
           
              </div>


         

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-4 w-[600px] m-auto">
            <Button onClick={handleApplyFilters} className="flex items-center gap-2" disabled={isAnyLoading}>
              <Settings className="h-4 w-4" />
              Apply Filters
            </Button>
            <Button variant="outline" onClick={clearAllSelections}>
              Clear All
            </Button>
                </div>
        </CardContent>
      </Card>

      {/* Apply Filters Dialog */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen} >
        <DialogContent className="max-w-6xl max-h-[90vh] z-[9999] ">
          <DialogHeader>
            <DialogTitle>Apply Pricing Updates</DialogTitle>
            <DialogDescription>
              Set margin percentage to update prices for variants under your selected filters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 z-[9999] ">
            {/* Margin Input */}
              <div className="space-y-2">
              <Label htmlFor="margin">Margin Percentage</Label>
              <div className="flex items-center gap-2">
                  <Input
                  id="margin"
                    type="text"
                  value={marginPercentage}
                  onChange={(e) => handleMarginChange(Number(e.target.value))}
                  placeholder="Enter margin percentage"
                  min={0}
                  max={100}
                  className="w-[300px] focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                />
                <span className="text-sm text-muted-foreground">%</span>
                </div>
            </div>

            {/* Selection Summary + Select All action */}
                <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="block">Selected Variants ({selectedVariantObjects.length})</Label>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[500px] ">
                    You selected:
                    {` Clusters: ${selectedClusters.length}`}
                    {`, Facilities: ${selectedFacilities.length}`}
                    {`, Categories: ${selectedCategories.length}`}
                    {`, Brands: ${selectedBrands.length}`}.
                    Click “Select All” to apply {marginPercentage || 0}% to all variants under the selected filters.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => { setPendingAction('all'); setConfirmOpen(true); }}
                  disabled={marginPercentage === 0 || isUpdatingAll}
                  className="gap-2"
                >
                  {isUpdatingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Select All 
                </Button>
              </div>

              <ScrollArea className="h-[260px] border rounded-md">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-center border-b">
                      <th className="p-2 text-left">SKU</th>
                      <th className="p-2 text-left">Product</th>
                      <th className="p-2 text-center">MRP</th>
                      <th className="p-2 text-center">Base Price</th>
                      <th className="p-2 text-center">Margin</th>
                      <th className="p-2 text-center">Selling Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVariantObjects.length === 0 ? (
                      <tr>
                        <td className="p-3 text-muted-foreground" colSpan={5}  >No variants selected.</td>
                      </tr>
                    ) : selectedVariantObjects.map(v => {
                      const base = typeof v.base_price === 'number' ? v.base_price : (typeof v.selling_price === 'number' ? v.selling_price : 0);
                      const computed = base > 0 ? Math.round(base * (1 + (marginPercentage || 0) / 100)) : 0;
                        return (
                        <tr key={v.id} className="border-b">
                          <td className="p-2 align-top">
                            <div className="font-mono">{v.sku}</div>
                            {/* <div className="text-xs text-muted-foreground">ID: {v.id}</div> */}
                          </td>

                          <td className="p-2 align-top">{v.product_name}</td>
                          <td className="p-2 align-top text-center">{v.mrp ? `₹${v.mrp}` : '—'}</td>
                          <td className="p-2 align-top text-center">{base ? `₹${base}` : '—'}</td>
                          <td className="p-2 align-top text-center">{marginPercentage || 0}%</td>
                          <td className="p-2 align-top text-center">{computed ? `₹${computed}` : '—'}</td>
                        </tr>
                        );
                      })}
                  </tbody>
                </table>
              </ScrollArea>
                </div>
            </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => { setPendingAction('selected'); setConfirmOpen(true); }}
              disabled={marginPercentage === 0 || isUpdatingSelected || selectedVariantObjects.length === 0}
              className="gap-2"
            >
              {isUpdatingSelected ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="z-[9999] ">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === 'all'
                ? `Apply ${marginPercentage || 0}% margin to ALL variants under selected filters?`
                : `Apply ${marginPercentage || 0}% margin to ${selectedVariantObjects.length} selected variants?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeConfirmedUpdate}>
              {(isUpdatingAll && pendingAction === 'all') || (isUpdatingSelected && pendingAction === 'selected')
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : 'Yes, Update'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}