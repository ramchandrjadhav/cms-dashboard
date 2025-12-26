import { useEffect, useMemo, useState } from 'react';
import { Loader2, ChevronDown, Filter, Search, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { ApiService } from '@/services/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';

interface Cluster { id: number; name: string }
interface Facility { id: number; name: string; city?: string }
interface Category { id: number; name: string }
interface Brand { id: number; name: string }
interface VariantRow {
  id: number;
  sku: string;
  product_name: string;
  mrp?: number;
  base_price?: number;
  selling_price?: number;
  selling_prices?: Array<{ facility_id: number; facility_name: string; selling_price: number }>;
  last_update?: { margin?: number; user?: { id?: number; name?: string; email?: string }; timestamp?: string };
}

interface UpdateResponse {
  success: boolean;
  updated_variants?: number[];
  rejected_variants?: number[];
  message?: string;
  error?: string;
}

const mapVariant = (v: any): VariantRow => ({
  id: Number(v.id),
  sku: v.sku ?? '',
  product_name: v.product_name ?? v.product?.name ?? '',
  mrp: typeof v.mrp === 'number' ? v.mrp : (typeof v.product?.mrp === 'number' ? v.product.mrp : undefined),
  base_price: typeof v.base_price === 'number' ? v.base_price : (typeof v.selling_price === 'number' ? v.selling_price : undefined),
  selling_price: typeof v.selling_price === 'number' ? v.selling_price : undefined,
  selling_prices: Array.isArray(v.selling_prices) ? v.selling_prices.map((sp: any) => ({
    facility_id: Number(sp.facility_id),
    facility_name: String(sp.facility_name ?? ''),
    selling_price: Number(sp.selling_price),
  })) : undefined,
  last_update: v.last_update ? {
    margin: typeof v.last_update.margin === 'number' ? v.last_update.margin : undefined,
    user: v.last_update.user ? {
      id: typeof v.last_update.user.id === 'number' ? v.last_update.user.id : undefined,
      name: v.last_update.user.name ?? undefined,
      email: v.last_update.user.email ?? undefined,
    } : undefined,
    timestamp: v.last_update.timestamp ?? undefined,
  } : undefined,
});

export default function UpdatedPricesVariants() {
  const [clusters, setClusters] = useState<Cluster[]> ([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);

  const [selectedClusters, setSelectedClusters] = useState<number[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<number[]>([]);

  const [clusterSearch, setClusterSearch] = useState('');
  const [facilitySearch, setFacilitySearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');

  const [loadingStates, setLoadingStates] = useState({
    clusters: false,
    facilities: false,
    categories: false,
    brands: false,
    variants: false,
  });

  const [facilitiesCountByCluster, setFacilitiesCountByCluster] = useState<Record<number, number>>({});

  const areOtherDropdownsDisabled = selectedClusters.length === 0;

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [lastFetchedSearchTerm, setLastFetchedSearchTerm] = useState<string>('');

  // Search state (like ProductList)
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { toast } = useToast();

  useEffect(() => {
    const loadInitial = async () => {
      setLoadingStates(prev => ({ ...prev, clusters: true }));
      const cs = await ApiService.getClusters();
      setClusters(cs.map((c: any) => ({ id: Number(c.id), name: String(c.name) })));
      try {
        const counts: Record<number, number> = {};
        cs.forEach((c: any) => {
          const fidCount = Array.isArray(c.facilities) ? c.facilities.length : 0;
          counts[Number(c.id)] = fidCount;
        });
        setFacilitiesCountByCluster(counts);
        // Default select first cluster that has facilities, otherwise first cluster
        const firstWithFacilities = cs.find((c: any) => Array.isArray(c.facilities) && c.facilities.length > 0);
        const fallbackFirst = cs[0];
        if (firstWithFacilities || fallbackFirst) {
          setSelectedClusters(prev => prev.length ? prev : [Number((firstWithFacilities ?? fallbackFirst).id)]);
        }
      } catch {}
      setLoadingStates(prev => ({ ...prev, clusters: false }));
    };
    loadInitial().catch(console.error);
  }, []);

  const buildPayload = () => {
    const body: any = { cluster_ids: selectedClusters };
    if (selectedFacilities.length) body.facility_ids = selectedFacilities;
    if (selectedCategories.length) body.category_ids = selectedCategories;
    if (selectedBrands.length) body.brand_ids = selectedBrands;
    if (debouncedSearchTerm) body.product_name = debouncedSearchTerm; // search by product name only
    return body;
  };

  // Reset to first page when filters or search change
  useEffect(() => {
    setPage(1);
  }, [selectedClusters, selectedFacilities, selectedCategories, selectedBrands, debouncedSearchTerm]);

  // On clusters selection change -> fetch updated data for facilities/categories/brands/variants
  useEffect(() => {
    const run = async () => {
      if (!selectedClusters.length) {
        setFacilities([]); setCategories([]); setBrands([]); setVariants([]);
        setTotalCount(0);
        return;
      }
      setLoadingStates(prev => ({ ...prev, facilities: true, categories: true, brands: true, variants: true }));
      setFacilities([]); setCategories([]); setBrands([]); setVariants([]);

      const payload = buildPayload();

      try {
        const res = await (ApiService.getOverridePrice as any)(page, pageSize, payload);
        if (Array.isArray(res?.facilities)) setFacilities(res.facilities.map((f: any) => ({ id: Number(f.id), name: f.name, city: f.city || '' })));
        if (Array.isArray(res?.categories)) setCategories(res.categories.map((c: any) => ({ id: Number(c.id), name: c.name })));
        if (Array.isArray(res?.brands)) setBrands(res.brands.map((b: any) => ({ id: Number(b.id), name: b.name })));
        if (Array.isArray(res?.variants)) setVariants(res.variants.map((v: any) => mapVariant(v)));
        const total = (res?.pagination?.total_variants) ?? res?.total_variants ?? res?.total_variants_count ?? res?.variants_count ?? res?.count ?? 0;
        setTotalCount(Number(total) || 0);
        setLastFetchedSearchTerm(debouncedSearchTerm || '');
        
        // Check if search was performed but no results found
        if (debouncedSearchTerm && (Number(total) || 0) === 0) {
          toast({
            variant: 'destructive',
            title: 'Product not found',
            description: `No products found for "${debouncedSearchTerm}"`,
          });
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        
        // Check if it's a search-related error
        if (debouncedSearchTerm) {
          toast({
            variant: 'destructive',
            title: '',
            description: `No Products found for "${debouncedSearchTerm}"`,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load data. Please try again.',
          });
        }
      } finally {
        setLoadingStates(prev => ({ ...prev, facilities: false, categories: false, brands: false, variants: false }));
      }
    };
    run().catch(console.error);
  }, [selectedClusters, page, pageSize, debouncedSearchTerm]);

  // On facilities/categories/brands selection change -> refresh variants only
  useEffect(() => {
    const run = async () => {
      if (!selectedClusters.length) return;
      setLoadingStates(prev => ({ ...prev, variants: true }));
      setVariants([]);

      const payload = buildPayload();

      try {
        const res = await (ApiService.getOverridePrice as any)(page, pageSize, payload);
        if (Array.isArray(res?.variants)) setVariants(res.variants.map((v: any) => mapVariant(v)));
        const total = (res?.pagination?.total_variants) ?? res?.total_variants ?? res?.total_variants_count ?? res?.variants_count ?? res?.count ?? 0;
        setTotalCount(Number(total) || 0);
        setLastFetchedSearchTerm(debouncedSearchTerm || '');
        
        // Check if search was performed but no results found
        if (debouncedSearchTerm && (Number(total) || 0) === 0) {
          toast({
            variant: 'destructive',
            title: 'Product not found',
            description: `No products found for "${debouncedSearchTerm}"`,
          });
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        
        // Check if it's a search-related error
        if (debouncedSearchTerm) {
          toast({
            variant: 'destructive',
            title: '',
            description: `No Products found for "${debouncedSearchTerm}"`,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load data. Please try again.',
          });
        }
      } finally {
        setLoadingStates(prev => ({ ...prev, variants: false }));
      }
    };
    run().catch(console.error);
  }, [selectedFacilities, selectedCategories, selectedBrands, page, pageSize, debouncedSearchTerm]);

  // Compute display list: only variants that have updated selling price entries (and match selected facilities if any)
  const displayVariants = useMemo(() => {
    const source = variants
      .map(v => {
        let chosen: number | undefined = undefined;
        let hasSelectedFacilityMatch = false;
        if (Array.isArray(v.selling_prices) && v.selling_prices.length > 0) {
          if (selectedFacilities.length) {
            const match = v.selling_prices.find(sp => selectedFacilities.includes(sp.facility_id));
            if (match) {
              chosen = match.selling_price;
              hasSelectedFacilityMatch = true;
            }
          }
          if (chosen === undefined) {
            chosen = v.selling_prices[0]?.selling_price;
          }
        } else if (typeof v.selling_price === 'number') {
          chosen = v.selling_price;
        }
        return { ...v, _displaySellingPrice: chosen, _hasSelectedFacilityMatch: hasSelectedFacilityMatch } as VariantRow & { _displaySellingPrice?: number; _hasSelectedFacilityMatch?: boolean };
      })
      .filter(v => v._displaySellingPrice !== undefined && (
        selectedFacilities.length === 0 ? true : v._hasSelectedFacilityMatch === true
      ));

    // When searching, rely on server-side filtering and pagination
    const term = debouncedSearchTerm.trim();
    if (term) return source;

    // Client-side search fallback: product name only
    const fallbackTerm = debouncedSearchTerm.trim().toLowerCase();
    if (!fallbackTerm) return source;
    const filtered = source.filter(v =>
      (v.product_name ?? '').toLowerCase().includes(fallbackTerm)
    );
    return filtered;
  }, [variants, selectedFacilities, debouncedSearchTerm]);

  const paginatedVariants = displayVariants;

  const filteredClusters = useMemo(
    () => clusters
      .filter(c => (facilitiesCountByCluster[c.id] ?? 0) > 0)
      .filter(c => (c.name ?? '').toLowerCase().includes(clusterSearch.toLowerCase())),
    [clusters, clusterSearch, facilitiesCountByCluster]
  );
  const filteredFacilities = useMemo(
    () => facilities.filter(f => (f.name ?? '').toLowerCase().includes(facilitySearch.toLowerCase())),
    [facilities, facilitySearch]
  );
  const filteredCategories = useMemo(
    () => categories.filter(c => (c.name ?? '').toLowerCase().includes(categorySearch.toLowerCase())),
    [categories, categorySearch]
  );
  const filteredBrands = useMemo(
    () => brands.filter(b => (b.name ?? '').toLowerCase().includes(brandSearch.toLowerCase())),
    [brands, brandSearch]
  );

  const toggle = (arr: number[], id: number, setArr: (v: number[]) => void) => {
    setArr(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  };

  return (
    <div className="space-y-6 p-[1.5rem]">
      <PageHeader title="Updated Variants" description="View variants with updated selling prices" />



      <Card>
        {/* <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader> */}
        <CardContent className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Clusters {loadingStates.clusters && <Loader2 className="h-3 w-3 animate-spin inline ml-1" />}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedClusters.length ? `${selectedClusters.length} selected` : 'Select Clusters'}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <div className="p-3 border-b">
                    <Input
                      placeholder="Search clusters..."
                      value={clusterSearch}
                      onChange={(e) => setClusterSearch(e.target.value)}
                      className="h-8 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="p-2">
                      {loadingStates.clusters ? (
                        <div className="flex items-center justify-center py-6 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                        </div>
                      ) : (
                        filteredClusters.map(c => (
                          <div key={c.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                            <Checkbox id={`c-${c.id}`} checked={selectedClusters.includes(c.id)} onCheckedChange={() => toggle(selectedClusters, c.id, setSelectedClusters)} />
                            <Label htmlFor={`c-${c.id}`} className="text-sm">{c.name}</Label>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Facilities {loadingStates.facilities && <Loader2 className="h-3 w-3 animate-spin inline ml-1" />}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" disabled={areOtherDropdownsDisabled}>
                    {selectedFacilities.length ? `${selectedFacilities.length} selected` : 'Select Facilities'}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <div className="p-3 border-b">
                    <Input
                      placeholder="Search facilities..."
                      value={facilitySearch}
                      onChange={(e) => setFacilitySearch(e.target.value)}
                      className="h-8 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      disabled={areOtherDropdownsDisabled}
                    />
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="p-2">
                      {loadingStates.facilities ? (
                        <div className="flex items-center justify-center py-6 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                        </div>
                      ) : (
                        filteredFacilities.map(f => (
                          <div key={f.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                            <Checkbox id={`f-${f.id}`} checked={selectedFacilities.includes(f.id)} onCheckedChange={() => toggle(selectedFacilities, f.id, setSelectedFacilities)} />
                            <Label htmlFor={`f-${f.id}`} className="text-sm">{f.name}</Label>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Categories {loadingStates.categories && <Loader2 className="h-3 w-3 animate-spin inline ml-1" />}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" disabled={areOtherDropdownsDisabled}>
                    {selectedCategories.length ? `${selectedCategories.length} selected` : 'Select Categories'}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <div className="p-3 border-b">
                    <Input
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="h-8 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      disabled={areOtherDropdownsDisabled}
                    />
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="p-2">
                      {loadingStates.categories ? (
                        <div className="flex items-center justify-center py-6 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                        </div>
                      ) : (
                        filteredCategories.map(c => (
                          <div key={c.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                            <Checkbox id={`cat-${c.id}`} checked={selectedCategories.includes(c.id)} onCheckedChange={() => toggle(selectedCategories, c.id, setSelectedCategories)} />
                            <Label htmlFor={`cat-${c.id}`} className="text-sm">{c.name}</Label>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Brands {loadingStates.brands && <Loader2 className="h-3 w-3 animate-spin inline ml-1" />}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" disabled={areOtherDropdownsDisabled}>
                    {selectedBrands.length ? `${selectedBrands.length} selected` : 'Select Brands'}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <div className="p-3 border-b">
                    <Input
                      placeholder="Search brands..."
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      className="h-8 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      disabled={areOtherDropdownsDisabled}
                    />
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="p-2">
                      {loadingStates.brands ? (
                        <div className="flex items-center justify-center py-6 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                        </div>
                      ) : (
                        filteredBrands.map(b => (
                          <div key={b.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                            <Checkbox id={`b-${b.id}`} checked={selectedBrands.includes(b.id)} onCheckedChange={() => toggle(selectedBrands, b.id, setSelectedBrands)} />
                            <Label htmlFor={`b-${b.id}`} className="text-sm">{b.name}</Label>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Updated Variants</CardTitle>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search variants or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setDebouncedSearchTerm(searchTerm);
                    setPage(1);
                  }
                }}
              />
              {searchTerm ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => { setSearchTerm(''); setDebouncedSearchTerm(''); setPage(1); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => { setDebouncedSearchTerm(searchTerm); setPage(1); }}
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] border rounded-md">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className='whitespace-nowrap' >SKU</TableHead>
                    <TableHead className='whitespace-nowrap' >Product Name</TableHead>
                    <TableHead className='whitespace-nowrap' >MRP</TableHead>
                    <TableHead className='whitespace-nowrap' >Base Price</TableHead>
                    <TableHead className='whitespace-nowrap' >Selling Price</TableHead>
                    <TableHead className='whitespace-nowrap' >Last Margin</TableHead>
                    <TableHead className='whitespace-nowrap' >Updated By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingStates.variants ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-gray-200 rounded animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : paginatedVariants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4" />
                          <span>No updated variants found.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedVariants.map(v => (
                      <TableRow key={v.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-mono text-sm">{v.sku}</TableCell>
                        <TableCell className="text-sm">{v.product_name}</TableCell>
                        <TableCell className="text-sm">{typeof v.mrp === 'number' ? `₹${v.mrp.toFixed(2)}` : '—'}</TableCell>
                        <TableCell className="text-sm">{typeof v.base_price === 'number' ? `₹${v.base_price.toFixed(2)}` : '—'}</TableCell>
                        <TableCell className="text-sm">{typeof (v as any)._displaySellingPrice === 'number' ? `₹${(v as any)._displaySellingPrice.toFixed(2)}` : '—'}</TableCell>
                        <TableCell className="text-sm">{typeof v.last_update?.margin === 'number' ? `${v.last_update.margin}%` : '—'}</TableCell>
                        <TableCell className="text-sm">{v.last_update?.user?.name ? `${v.last_update.user.name}${v.last_update.user.email ? ` (${v.last_update.user.email})` : ''}` : '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
          <Pagination className="mt-4">
            <PaginationContent>
              {
                <>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage(page - 1);
                      }}
                      aria-disabled={page === 1}
                      className={page === 1 ? 'cursor-not-allowed opacity-50' : ''}
                    />
                  </PaginationItem>
                  {(() => {
                    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
                    const maxVisiblePages = 7;
                    const halfVisible = Math.floor(maxVisiblePages / 2);
                    let startPage = Math.max(1, page - halfVisible);
                    let endPage = Math.min(totalPages, page + halfVisible);
                    if (endPage - startPage + 1 < maxVisiblePages) {
                      if (startPage === 1) {
                        endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      } else {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }
                    }
                    const items: JSX.Element[] = [];
                    if (startPage > 1) {
                      items.push(
                        <PaginationItem key={1}>
                          <PaginationLink href="#" isActive={page === 1} onClick={(e) => { e.preventDefault(); setPage(1); }}>1</PaginationLink>
                        </PaginationItem>
                      );
                      if (startPage > 2) {
                        items.push(
                          <PaginationItem key="ellipsis-start">
                            <span className="px-3 py-2 text-sm text-gray-500">...</span>
                          </PaginationItem>
                        );
                      }
                    }
                    for (let i = startPage; i <= endPage; i++) {
                      if (i === 1 && startPage > 1) continue;
                      items.push(
                        <PaginationItem key={i}>
                          <PaginationLink href="#" isActive={page === i} onClick={(e) => { e.preventDefault(); setPage(i); }}>{i}</PaginationLink>
                        </PaginationItem>
                      );
                    }
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        items.push(
                          <PaginationItem key="ellipsis-end">
                            <span className="px-3 py-2 text-sm text-gray-500">...</span>
                          </PaginationItem>
                        );
                      }
                      items.push(
                        <PaginationItem key={totalPages}>
                          <PaginationLink href="#" isActive={page === totalPages} onClick={(e) => { e.preventDefault(); setPage(totalPages); }}>{totalPages}</PaginationLink>
                        </PaginationItem>
                      );
                    }
                    return items;
                  })()}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
                        if (page < totalPages) setPage(page + 1);
                      }}
                      aria-disabled={page >= Math.ceil(Math.max(1, Math.ceil(totalCount / pageSize)))}
                      className={page >= Math.ceil(Math.max(1, Math.ceil(totalCount / pageSize))) ? 'cursor-not-allowed opacity-50' : ''}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <select
                      className="ml-4 border rounded px-2 py-1 text-sm dark:bg-[#111827]"
                      value={pageSize}
                      onChange={(e) => {
                        const newSize = Number(e.target.value);
                        setPageSize(newSize);
                        setPage(1);
                      }}
                    >
                      {[10, 20, 50, 100].map((size) => (
                        <option key={size} value={size} className="dark:bg-[#111827]" >{size}</option>
                      ))}
                    </select>
                  </PaginationItem>
                </>
              }
            </PaginationContent>
          </Pagination>
        </CardContent>
      </Card>
    </div>
  );
}