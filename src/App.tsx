import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { GlobalSearchProvider } from "@/components/GlobalSearchProvider";
import Dashboard from "@/pages/Dashboard";
import ProductList from "@/pages/products/ProductList";
import ProductsRejected from "@/pages/products/ProductsRejected";
import CategoryTree from "@/pages/categories/CategoryTree";
import CategoryDropdownDemo from "@/pages/categories/CategoryDropdownDemo";
import CollectionList from "@/pages/collections/CollectionList";
import FacilityList from "@/pages/facilities/FacilityList";
import NotImplemented from "@/pages/NotImplemented";
import NotFound from "./pages/NotFound";
import Login from "@/pages/auth/Login";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import { initMockApi } from "@/lib/mock-api";
import { AuthProvider } from "@/context/AuthContext";
import UserList from "@/pages/UserList";
import BrandList from "@/pages/BrandList";
import ProductVariant from "@/pages/products/ProductVariant";
import ConfigurationDashboard from "@/pages/configuration/ConfigurationDashboard";
import AttributesList from "@/pages/configuration/AttributesList";
import CategoryAttributes from "@/pages/configuration/CategoryAttributes";
import CreateEditAttribute from "@/pages/configuration/CreateEditAttribute";
import SizeChartList from "@/pages/configuration/SizeChartList";
import CreateSizeChart from "@/pages/configuration/CreateSizeChart";
import EditSizeChart from "@/pages/configuration/EditSizeChart";
import TabsList from "@/pages/configuration/TabsList";
import CreateEditTab from "@/pages/configuration/CreateEditTab";
import SectionsList from "@/pages/configuration/SectionsList";
import CreateEditSection from "@/pages/configuration/CreateEditSection";
import ShelfLifeConfiguration from "@/pages/configuration/ShelfLifeConfiguration";
import EditProductUpdated from "./pages/products/EditProductUpdated";
import EditProductVariant from "./pages/products/EditProductVariant";
import ProductDetails from "./pages/products/ProductDetails";
import UpdatedPricesVariants from "./pages/tax-pricing/UpdatePricesVariants";
import Combos from "@/pages/combosandpacks/Combos";
import CreateCombo from "@/pages/combosandpacks/CreateCombo";
import ComboDetail from "@/pages/combosandpacks/ComboDetail";
import Packs from "./pages/combosandpacks/Packs";

// Lazy load product components to avoid circular dependencies
const CreateEditProduct = lazy(
  () => import("@/pages/products/CreateEditProduct")
);
const EditProduct = lazy(() => import("@/pages/products/EditProduct"));
const ProductDetail = lazy(() => import("@/pages/products/ProductDetail"));
const CreateEditCollection = lazy(
  () => import("@/pages/collections/CreateEditCollection")
);
const CollectionDetail = lazy(
  () => import("@/pages/collections/CollectionDetail")
);
const FacilityDetail = lazy(() => import("@/pages/facilities/FacilityDetail"));
const FacilityMap = lazy(() => import("@/pages/facilities/FacilityMap"));
const CreateFacility = lazy(() => import("@/pages/facilities/CreateFacility"));
const ClusterList = lazy(() => import("@/pages/clusters/ClusterList"));
const ClusterDetail = lazy(() => import("@/pages/clusters/ClusterDetail"));
const AssignmentMatrix = lazy(
  () => import("@/pages/assignments/AssignmentMatrix")
);
const AssignmentImport = lazy(
  () => import("@/pages/assignments/AssignmentImport")
);
const TaxGroups = lazy(() => import("@/pages/tax-pricing/TaxGroups"));
const PricingMatrix = lazy(() => import("@/pages/tax-pricing/PricingMatrix"));
const PricingRules = lazy(() => import("@/pages/tax-pricing/PricingRules"));
const ClusterOverride = lazy(() => import("@/pages/clusters/ClusterOverride"));
const Coverage = lazy(() => import("@/pages/intelligence/Coverage"));
const Simulator = lazy(() => import("@/pages/intelligence/Simulator"));
const Discounts = lazy(() => import("@/pages/promotions/Discounts"));
const Vouchers = lazy(() => import("@/pages/promotions/Vouchers"));
const Campaigns = lazy(() => import("@/pages/promotions/Campaigns"));
const Rules = lazy(() => import("@/pages/promotions/Rules"));
const PolygonKmlEditor = lazy(() => import("@/components/PolygonKmlEditor"));
const ImageUpload = lazy(() => import("@/pages/upload/ImageUpload"));

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize Mock Service Worker for development
    initMockApi();
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <GlobalSearchProvider>
              <Routes>
                {/* Auth routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />

                  {/* Product routes */}
                  <Route path="products">
                    <Route path="list" element={<ProductList />} />
                    <Route path="rejected" element={<ProductsRejected />} />
                    <Route
                      path="create"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <CreateEditProduct />
                        </Suspense>
                      }
                    />
                    <Route
                      path="variant"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <ProductVariant />
                        </Suspense>
                      }
                    />
                    {/* <Route
                    path=":id"
                    element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <ProductDetail />
                      </Suspense>
                    }
                  /> */}
                    <Route
                      path=":id/edit"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <EditProductUpdated />
                        </Suspense>
                      }
                    />
                    <Route
                      path=":id/variants/edit"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <EditProductVariant />
                        </Suspense>
                      }
                    />
                    <Route
                      path=":id"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <ProductDetails />
                        </Suspense>
                      }
                    />
                    {/* <Route
                    path=":id/edit"
                    element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <EditProduct />
                      </Suspense>
                    }
                  /> */}
                    <Route path="archived" element={<NotImplemented />} />
                  </Route>

                  {/* Category routes */}
                  <Route path="categories">
                    <Route path="tree" element={<CategoryTree />} />
                    <Route
                      path="dropdown-demo"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <CategoryDropdownDemo />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* Collection routes */}
                  <Route path="collections">
                    <Route path="list" element={<CollectionList />} />
                    {/* <Route path="combos" element={<Combos />} />
                    <Route path="combos/create" element={<CreateCombo />} />
                    <Route path="combos/:id" element={<ComboDetail />} /> */}
                    <Route
                      path="create"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <CreateEditCollection />
                        </Suspense>
                      }
                    />
                    <Route
                      path=":id"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <CollectionDetail />
                        </Suspense>
                      }
                    />
                    <Route
                      path=":id/edit"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <CreateEditCollection />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* Combos and Packs routes */}
                  <Route path="combosandpacks">
                    <Route path="packs" element={<Packs />} />
                    <Route path="combos" element={<Combos />} />
                    <Route path="combos/create" element={<CreateCombo />} />
                    <Route path="combos/:id" element={<ComboDetail />} />
                  </Route>



                  {/* Facility routes */}
                  <Route path="facilities">
                    <Route path="list" element={<FacilityList />} />
                    <Route
                      path=":id"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <FacilityDetail />
                        </Suspense>
                      }
                    />
                    <Route
                      path="map"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <FacilityMap />
                        </Suspense>
                      }
                    />
                    <Route
                      path="new"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <CreateFacility />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* Cluster routes */}
                  <Route path="clusters">
                    <Route
                      path="list"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <ClusterList />
                        </Suspense>
                      }
                    />
                    <Route
                      path=":id"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <ClusterDetail />
                        </Suspense>
                      }
                    />
                    <Route
                      path="override"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <ClusterOverride />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* Assignment routes */}
                  <Route path="assignments">
                    <Route
                      path="matrix"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <AssignmentMatrix />
                        </Suspense>
                      }
                    />
                    <Route
                      path="import"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <AssignmentImport />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* Tax & Pricing routes */}
                  <Route path="tax-pricing">
                    <Route
                      path="groups"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <TaxGroups />
                        </Suspense>
                      }
                    />
                    <Route
                      path="rules"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <PricingRules />
                        </Suspense>
                      }
                    />
                    <Route
                      path="override"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <PricingMatrix />
                        </Suspense>
                      }
                    />
                    <Route
                      path="updated-prices-variants"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <UpdatedPricesVariants />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* Intelligence routes */}
                  <Route path="intelligence">
                    <Route
                      path="coverage"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <Coverage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="simulator"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <Simulator />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* Polygon KML Editor route */}
                  <Route
                    path="polygon-editor"
                    element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <PolygonKmlEditor />
                      </Suspense>
                    }
                  />

                  {/* Upload route */}
                  <Route
                    path="upload"
                    element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <ImageUpload />
                      </Suspense>
                    }
                  />

                  {/* Promotions routes */}
                  <Route path="promotions">
                    <Route
                      path="discounts"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <Discounts />
                        </Suspense>
                      }
                    />
                    <Route
                      path="vouchers"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <Vouchers />
                        </Suspense>
                      }
                    />
                    <Route
                      path="campaigns"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <Campaigns />
                        </Suspense>
                      }
                    />
                    <Route
                      path="rules"
                      element={
                        <Suspense fallback={<div>Loading...</div>}>
                          <Rules />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* Profile & Settings */}
                  <Route path="profile" element={<Profile />} />
                  <Route path="settings" element={<Settings />} />

                  {/* User routes */}
                  <Route path="users">
                    <Route path="list" element={<UserList />} />
                  </Route>

                  {/* Brand routes */}
                  <Route path="brands">
                    <Route path="list" element={<BrandList />} />
                  </Route>

                  {/* Configuration routes */}
                  <Route path="configuration">
                    <Route index element={<ConfigurationDashboard />} />
                    <Route path="attributes" element={<AttributesList />} />
                    <Route
                      path="attributes/create"
                      element={<CreateEditAttribute />}
                    />
                    <Route
                      path="attributes/:id/edit"
                      element={<CreateEditAttribute />}
                    />
                    <Route
                      path="category-attributes"
                      element={<CategoryAttributes />}
                    />
                    <Route path="size-charts" element={<SizeChartList />} />
                    <Route
                      path="size-charts/create"
                      element={<CreateSizeChart />}
                    />
                    <Route
                      path="size-charts/:id/edit"
                      element={<EditSizeChart />}
                    />
                    <Route path="tabs" element={<TabsList />} />
                    <Route path="tabs/create" element={<CreateEditTab />} />
                    <Route path="tabs/:id/edit" element={<CreateEditTab />} />
                    <Route path="sections" element={<SectionsList />} />
                    <Route
                      path="sections/create"
                      element={<CreateEditSection />}
                    />
                    <Route
                      path="sections/:id/edit"
                      element={<CreateEditSection />}
                    />
                    <Route
                      path="shelf-life"
                      element={<ShelfLifeConfiguration />}
                    />
                  </Route>
                </Route>

                {/* Catch-all route for 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </GlobalSearchProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default App;
