import { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Globe, 
  Building, 
  Users, 
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  Trash2,
  Edit
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface GlobalOverride {
  id: string;
  name: string;
  description: string;
  type: 'pricing' | 'tax' | 'shipping' | 'inventory' | 'operational';
  scope: 'global' | 'regional' | 'cluster' | 'facility';
  priority: number;
  isActive: boolean;
  conditions: OverrideCondition[];
  values: OverrideValue[];
  appliesTo: {
    clusters: string[];
    facilities: string[];
    productCategories: string[];
    userGroups: string[];
  };
  schedule?: {
    startDate: Date;
    endDate?: Date;
    timezone: string;
  };
  createdAt: Date;
  updatedAt: Date;
  usage: {
    timesApplied: number;
    lastApplied?: Date;
    impactedEntities: number;
  };
}

interface OverrideCondition {
  id: string;
  type: 'cluster_region' | 'facility_type' | 'product_category' | 'user_segment' | 'time_period' | 'stock_level';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'between';
  value: string | number | string[];
  logicalOperator?: 'AND' | 'OR';
}

interface OverrideValue {
  id: string;
  property: string;
  value: string | number | boolean;
  unit?: 'percentage' | 'fixed' | 'currency' | 'hours' | 'days';
  operation: 'set' | 'add' | 'subtract' | 'multiply' | 'divide';
}

interface ClusterSetting {
  id: string;
  clusterId: string;
  clusterName: string;
  overrides: {
    pricing: {
      enabled: boolean;
      baseMarkup: number;
      dynamicPricing: boolean;
      priceRounding: 'none' | 'up' | 'down' | 'nearest';
    };
    inventory: {
      enabled: boolean;
      autoReorder: boolean;
      stockThreshold: number;
      maxStock: number;
      crossDocking: boolean;
    };
    operations: {
      enabled: boolean;
      operatingHours: {
        start: string;
        end: string;
        timezone: string;
      };
      priorityShipping: boolean;
      sameDay: boolean;
    };
    tax: {
      enabled: boolean;
      exemptions: string[];
      specialRates: Array<{
        category: string;
        rate: number;
      }>;
    };
  };
  inheritFromParent: boolean;
  lastUpdated: Date;
}

const mockGlobalOverrides: GlobalOverride[] = [
  {
    id: '1',
    name: 'Holiday Season Global Pricing',
    description: 'Apply holiday pricing across all clusters',
    type: 'pricing',
    scope: 'global',
    priority: 1,
    isActive: true,
    conditions: [
      {
        id: '1',
        type: 'time_period',
        operator: 'between',
        value: ['2024-11-15', '2024-12-31'],
      },
    ],
    values: [
      {
        id: '1',
        property: 'basePrice',
        value: 15,
        unit: 'percentage',
        operation: 'add',
      },
    ],
    appliesTo: {
      clusters: ['urban', 'central', 'east', 'west'],
      facilities: [],
      productCategories: ['Electronics', 'Toys'],
      userGroups: ['retail'],
    },
    schedule: {
      startDate: new Date('2024-11-15'),
      endDate: new Date('2024-12-31'),
      timezone: 'America/New_York',
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    usage: {
      timesApplied: 2450,
      lastApplied: new Date('2024-01-20'),
      impactedEntities: 156,
    },
  },
  {
    id: '2',
    name: 'Regional Tax Compliance',
    description: 'Override tax settings for EU compliance',
    type: 'tax',
    scope: 'regional',
    priority: 2,
    isActive: true,
    conditions: [
      {
        id: '2',
        type: 'cluster_region',
        operator: 'in',
        value: ['europe', 'uk'],
      },
    ],
    values: [
      {
        id: '2',
        property: 'vatRate',
        value: 20,
        unit: 'percentage',
        operation: 'set',
      },
    ],
    appliesTo: {
      clusters: ['europe', 'uk'],
      facilities: [],
      productCategories: [],
      userGroups: [],
    },
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
    usage: {
      timesApplied: 1200,
      lastApplied: new Date('2024-01-18'),
      impactedEntities: 45,
    },
  },
];

const mockClusterSettings: ClusterSetting[] = [
  {
    id: '1',
    clusterId: 'urban',
    clusterName: 'Urban Cluster',
    overrides: {
      pricing: {
        enabled: true,
        baseMarkup: 12,
        dynamicPricing: true,
        priceRounding: 'nearest',
      },
      inventory: {
        enabled: true,
        autoReorder: true,
        stockThreshold: 15,
        maxStock: 1000,
        crossDocking: false,
      },
      operations: {
        enabled: true,
        operatingHours: {
          start: '07:00',
          end: '22:00',
          timezone: 'America/New_York',
        },
        priorityShipping: true,
        sameDay: true,
      },
      tax: {
        enabled: true,
        exemptions: ['medical', 'food'],
        specialRates: [
          { category: 'luxury', rate: 25 },
          { category: 'essential', rate: 5 },
        ],
      },
    },
    inheritFromParent: false,
    lastUpdated: new Date('2024-01-20'),
  },
  {
    id: '2',
    clusterId: 'central',
    clusterName: 'Central Cluster',
    overrides: {
      pricing: {
        enabled: false,
        baseMarkup: 8,
        dynamicPricing: false,
        priceRounding: 'none',
      },
      inventory: {
        enabled: true,
        autoReorder: true,
        stockThreshold: 25,
        maxStock: 5000,
        crossDocking: true,
      },
      operations: {
        enabled: true,
        operatingHours: {
          start: '06:00',
          end: '18:00',
          timezone: 'America/New_York',
        },
        priorityShipping: false,
        sameDay: false,
      },
      tax: {
        enabled: false,
        exemptions: [],
        specialRates: [],
      },
    },
    inheritFromParent: true,
    lastUpdated: new Date('2024-01-15'),
  },
];

export default function ClusterOverride() {
  const { toast } = useToast();
  const [globalOverrides, setGlobalOverrides] = useState<GlobalOverride[]>(mockGlobalOverrides);
  const [clusterSettings, setClusterSettings] = useState<ClusterSetting[]>(mockClusterSettings);
  const [editingOverride, setEditingOverride] = useState<GlobalOverride | null>(null);
  const [editingCluster, setEditingCluster] = useState<ClusterSetting | null>(null);
  const [showGlobalDialog, setShowGlobalDialog] = useState(false);
  const [showClusterDialog, setShowClusterDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('global');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateGlobalOverride = () => {
    const newOverride: GlobalOverride = {
      id: Date.now().toString(),
      name: 'New Global Override',
      description: '',
      type: 'pricing',
      scope: 'global',
      priority: globalOverrides.length + 1,
      isActive: true,
      conditions: [],
      values: [],
      appliesTo: {
        clusters: [],
        facilities: [],
        productCategories: [],
        userGroups: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      usage: {
        timesApplied: 0,
        impactedEntities: 0,
      },
    };
    setEditingOverride(newOverride);
    setShowGlobalDialog(true);
  };

  const handleEditGlobalOverride = (override: GlobalOverride) => {
    setEditingOverride({ ...override });
    setShowGlobalDialog(true);
  };

  const handleEditClusterSettings = (settings: ClusterSetting) => {
    setEditingCluster({ ...settings });
    setShowClusterDialog(true);
  };

  const handleSaveGlobalOverride = async () => {
    if (!editingOverride) return;

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const isNew = !globalOverrides.find(o => o.id === editingOverride.id);
    
    if (isNew) {
      setGlobalOverrides(prev => [...prev, { ...editingOverride, updatedAt: new Date() }]);
      toast({
        title: "Global Override Created",
        description: "Global override has been created successfully.",
      });
    } else {
      setGlobalOverrides(prev => prev.map(o => 
        o.id === editingOverride.id 
          ? { ...editingOverride, updatedAt: new Date() }
          : o
      ));
      toast({
        title: "Global Override Updated",
        description: "Global override has been updated successfully.",
      });
    }

    setIsLoading(false);
    setShowGlobalDialog(false);
    setEditingOverride(null);
  };

  const handleSaveClusterSettings = async () => {
    if (!editingCluster) return;

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    setClusterSettings(prev => prev.map(s => 
      s.id === editingCluster.id 
        ? { ...editingCluster, lastUpdated: new Date() }
        : s
    ));

    setIsLoading(false);
    setShowClusterDialog(false);
    setEditingCluster(null);
    
    toast({
      title: "Cluster Settings Updated",
      description: "Cluster override settings have been updated successfully.",
    });
  };

  const handleDeleteGlobalOverride = async (overrideId: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    setGlobalOverrides(prev => prev.filter(o => o.id !== overrideId));
    setIsLoading(false);
    
    toast({
      title: "Global Override Deleted",
      description: "Global override has been deleted successfully.",
    });
  };

  const handleToggleOverride = async (overrideId: string) => {
    setGlobalOverrides(prev => prev.map(o => 
      o.id === overrideId 
        ? { ...o, isActive: !o.isActive, updatedAt: new Date() }
        : o
    ));
    
    toast({
      title: "Override Status Updated",
      description: "Override status has been updated.",
    });
  };

  const getOverrideTypeIcon = (type: string) => {
    switch (type) {
      case 'pricing': return DollarSign;
      case 'tax': return Percent;
      case 'shipping': return TrendingUp;
      case 'inventory': return ShoppingCart;
      case 'operational': return Settings;
      default: return Settings;
    }
  };

  const getOverrideTypeColor = (type: string) => {
    switch (type) {
      case 'pricing': return 'text-green-600';
      case 'tax': return 'text-blue-600';
      case 'shipping': return 'text-purple-600';
      case 'inventory': return 'text-orange-600';
      case 'operational': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'global': return Globe;
      case 'regional': return Users;
      case 'cluster': return Users;
      case 'facility': return Building;
      default: return Settings;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Cluster Overrides"
        description="Manage global overrides and cluster-specific settings"
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={handleCreateGlobalOverride}>
              <Plus className="mr-2 h-4 w-4" />
              Create Global Override
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="global">Global Overrides</TabsTrigger>
          <TabsTrigger value="clusters">Cluster Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Global Overrides
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalOverrides.map((override) => {
                    const TypeIcon = getOverrideTypeIcon(override.type);
                    const ScopeIcon = getScopeIcon(override.scope);
                    return (
                      <TableRow key={override.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{override.name}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {override.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TypeIcon className={cn("h-4 w-4", getOverrideTypeColor(override.type))} />
                            <Badge variant="outline" className="capitalize">
                              {override.type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ScopeIcon className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="secondary" className="capitalize">
                              {override.scope}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{override.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {override.usage.timesApplied} times
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {override.usage.impactedEntities} entities
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleOverride(override.id)}
                          >
                            <Badge variant={override.isActive ? 'default' : 'secondary'}>
                              {override.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditGlobalOverride(override)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Global Override</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{override.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteGlobalOverride(override.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clusters" className="space-y-6">
          <div className="grid gap-6">
            {clusterSettings.map((cluster) => (
              <Card key={cluster.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {cluster.clusterName}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {cluster.inheritFromParent && (
                        <Badge variant="outline">Inherited</Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClusterSettings(cluster)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Pricing</span>
                        <Badge variant={cluster.overrides.pricing.enabled ? 'default' : 'secondary'}>
                          {cluster.overrides.pricing.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      {cluster.overrides.pricing.enabled && (
                        <div className="text-sm text-muted-foreground">
                          Base markup: {cluster.overrides.pricing.baseMarkup}%
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">Inventory</span>
                        <Badge variant={cluster.overrides.inventory.enabled ? 'default' : 'secondary'}>
                          {cluster.overrides.inventory.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      {cluster.overrides.inventory.enabled && (
                        <div className="text-sm text-muted-foreground">
                          Threshold: {cluster.overrides.inventory.stockThreshold}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">Operations</span>
                        <Badge variant={cluster.overrides.operations.enabled ? 'default' : 'secondary'}>
                          {cluster.overrides.operations.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      {cluster.overrides.operations.enabled && (
                        <div className="text-sm text-muted-foreground">
                          Hours: {cluster.overrides.operations.operatingHours.start} - {cluster.overrides.operations.operatingHours.end}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Tax</span>
                        <Badge variant={cluster.overrides.tax.enabled ? 'default' : 'secondary'}>
                          {cluster.overrides.tax.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      {cluster.overrides.tax.enabled && (
                        <div className="text-sm text-muted-foreground">
                          Exemptions: {cluster.overrides.tax.exemptions.length}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Global Override Dialog */}
      <Dialog open={showGlobalDialog} onOpenChange={setShowGlobalDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingOverride && globalOverrides.find(o => o.id === editingOverride.id) ? 'Edit' : 'Create'} Global Override
            </DialogTitle>
            <DialogDescription>
              Configure global override settings and conditions
            </DialogDescription>
          </DialogHeader>
          
          {editingOverride && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Override Name</Label>
                  <Input
                    id="name"
                    value={editingOverride.name}
                    onChange={(e) => setEditingOverride(prev => ({ ...prev!, name: e.target.value }))}
                    placeholder="e.g., Holiday Season Global Pricing"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select 
                    value={editingOverride.type} 
                    onValueChange={(value: any) => setEditingOverride(prev => ({ ...prev!, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pricing">Pricing</SelectItem>
                      <SelectItem value="tax">Tax</SelectItem>
                      <SelectItem value="shipping">Shipping</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="scope">Scope</Label>
                  <Select 
                    value={editingOverride.scope} 
                    onValueChange={(value: any) => setEditingOverride(prev => ({ ...prev!, scope: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                      <SelectItem value="cluster">Cluster</SelectItem>
                      <SelectItem value="facility">Facility</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={editingOverride.priority}
                    onChange={(e) => setEditingOverride(prev => ({ ...prev!, priority: parseInt(e.target.value) }))}
                    min="1"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editingOverride.description}
                    onChange={(e) => setEditingOverride(prev => ({ ...prev!, description: e.target.value }))}
                    placeholder="Describe the purpose and effect of this override"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGlobalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveGlobalOverride} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Override
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cluster Settings Dialog */}
      <Dialog open={showClusterDialog} onOpenChange={setShowClusterDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Configure Cluster Settings</DialogTitle>
            <DialogDescription>
              Manage cluster-specific overrides and configurations
            </DialogDescription>
          </DialogHeader>
          
          {editingCluster && (
            <Tabs defaultValue="pricing" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="operations">Operations</TabsTrigger>
                <TabsTrigger value="tax">Tax</TabsTrigger>
              </TabsList>
              
              <TabsContent value="pricing" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingCluster.overrides.pricing.enabled}
                    onCheckedChange={(checked) => setEditingCluster(prev => ({
                      ...prev!,
                      overrides: {
                        ...prev!.overrides,
                        pricing: { ...prev!.overrides.pricing, enabled: checked }
                      }
                    }))}
                  />
                  <Label>Enable Pricing Overrides</Label>
                </div>
                
                {editingCluster.overrides.pricing.enabled && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Base Markup (%)</Label>
                      <Input
                        type="number"
                        value={editingCluster.overrides.pricing.baseMarkup}
                        onChange={(e) => setEditingCluster(prev => ({
                          ...prev!,
                          overrides: {
                            ...prev!.overrides,
                            pricing: { ...prev!.overrides.pricing, baseMarkup: parseFloat(e.target.value) }
                          }
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Price Rounding</Label>
                      <Select
                        value={editingCluster.overrides.pricing.priceRounding}
                        onValueChange={(value: any) => setEditingCluster(prev => ({
                          ...prev!,
                          overrides: {
                            ...prev!.overrides,
                            pricing: { ...prev!.overrides.pricing, priceRounding: value }
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="up">Round Up</SelectItem>
                          <SelectItem value="down">Round Down</SelectItem>
                          <SelectItem value="nearest">Nearest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingCluster.overrides.pricing.dynamicPricing}
                        onCheckedChange={(checked) => setEditingCluster(prev => ({
                          ...prev!,
                          overrides: {
                            ...prev!.overrides,
                            pricing: { ...prev!.overrides.pricing, dynamicPricing: checked }
                          }
                        }))}
                      />
                      <Label>Dynamic Pricing</Label>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="inventory" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingCluster.overrides.inventory.enabled}
                    onCheckedChange={(checked) => setEditingCluster(prev => ({
                      ...prev!,
                      overrides: {
                        ...prev!.overrides,
                        inventory: { ...prev!.overrides.inventory, enabled: checked }
                      }
                    }))}
                  />
                  <Label>Enable Inventory Overrides</Label>
                </div>
                
                {editingCluster.overrides.inventory.enabled && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Stock Threshold</Label>
                      <Input
                        type="number"
                        value={editingCluster.overrides.inventory.stockThreshold}
                        onChange={(e) => setEditingCluster(prev => ({
                          ...prev!,
                          overrides: {
                            ...prev!.overrides,
                            inventory: { ...prev!.overrides.inventory, stockThreshold: parseInt(e.target.value) }
                          }
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Max Stock</Label>
                      <Input
                        type="number"
                        value={editingCluster.overrides.inventory.maxStock}
                        onChange={(e) => setEditingCluster(prev => ({
                          ...prev!,
                          overrides: {
                            ...prev!.overrides,
                            inventory: { ...prev!.overrides.inventory, maxStock: parseInt(e.target.value) }
                          }
                        }))}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingCluster.overrides.inventory.autoReorder}
                        onCheckedChange={(checked) => setEditingCluster(prev => ({
                          ...prev!,
                          overrides: {
                            ...prev!.overrides,
                            inventory: { ...prev!.overrides.inventory, autoReorder: checked }
                          }
                        }))}
                      />
                      <Label>Auto Reorder</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingCluster.overrides.inventory.crossDocking}
                        onCheckedChange={(checked) => setEditingCluster(prev => ({
                          ...prev!,
                          overrides: {
                            ...prev!.overrides,
                            inventory: { ...prev!.overrides.inventory, crossDocking: checked }
                          }
                        }))}
                      />
                      <Label>Cross Docking</Label>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="operations" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingCluster.overrides.operations.enabled}
                    onCheckedChange={(checked) => setEditingCluster(prev => ({
                      ...prev!,
                      overrides: {
                        ...prev!.overrides,
                        operations: { ...prev!.overrides.operations, enabled: checked }
                      }
                    }))}
                  />
                  <Label>Enable Operations Overrides</Label>
                </div>
                
                {editingCluster.overrides.operations.enabled && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Operating Hours - Start</Label>
                      <Input
                        type="time"
                        value={editingCluster.overrides.operations.operatingHours.start}
                        onChange={(e) => setEditingCluster(prev => ({
                          ...prev!,
                          overrides: {
                            ...prev!.overrides,
                            operations: {
                              ...prev!.overrides.operations,
                              operatingHours: { ...prev!.overrides.operations.operatingHours, start: e.target.value }
                            }
                          }
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Operating Hours - End</Label>
                      <Input
                        type="time"
                        value={editingCluster.overrides.operations.operatingHours.end}
                        onChange={(e) => setEditingCluster(prev => ({
                          ...prev!,
                          overrides: {
                            ...prev!.overrides,
                            operations: {
                              ...prev!.overrides.operations,
                              operatingHours: { ...prev!.overrides.operations.operatingHours, end: e.target.value }
                            }
                          }
                        }))}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingCluster.overrides.operations.priorityShipping}
                        onCheckedChange={(checked) => setEditingCluster(prev => ({
                          ...prev!,
                          overrides: {
                            ...prev!.overrides,
                            operations: { ...prev!.overrides.operations, priorityShipping: checked }
                          }
                        }))}
                      />
                      <Label>Priority Shipping</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingCluster.overrides.operations.sameDay}
                        onCheckedChange={(checked) => setEditingCluster(prev => ({
                          ...prev!,
                          overrides: {
                            ...prev!.overrides,
                            operations: { ...prev!.overrides.operations, sameDay: checked }
                          }
                        }))}
                      />
                      <Label>Same Day Delivery</Label>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="tax" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingCluster.overrides.tax.enabled}
                    onCheckedChange={(checked) => setEditingCluster(prev => ({
                      ...prev!,
                      overrides: {
                        ...prev!.overrides,
                        tax: { ...prev!.overrides.tax, enabled: checked }
                      }
                    }))}
                  />
                  <Label>Enable Tax Overrides</Label>
                </div>
                
                {editingCluster.overrides.tax.enabled && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tax Exemptions</Label>
                      <div className="flex flex-wrap gap-2">
                        {editingCluster.overrides.tax.exemptions.map((exemption, index) => (
                          <Badge key={index} variant="secondary">
                            {exemption}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-2 h-auto p-0"
                              onClick={() => setEditingCluster(prev => ({
                                ...prev!,
                                overrides: {
                                  ...prev!.overrides,
                                  tax: {
                                    ...prev!.overrides.tax,
                                    exemptions: prev!.overrides.tax.exemptions.filter((_, i) => i !== index)
                                  }
                                }
                              }))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Special Rates</Label>
                      <div className="space-y-2">
                        {editingCluster.overrides.tax.specialRates.map((rate, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={rate.category}
                              onChange={(e) => {
                                const newRates = [...editingCluster.overrides.tax.specialRates];
                                newRates[index] = { ...rate, category: e.target.value };
                                setEditingCluster(prev => ({
                                  ...prev!,
                                  overrides: {
                                    ...prev!.overrides,
                                    tax: { ...prev!.overrides.tax, specialRates: newRates }
                                  }
                                }));
                              }}
                              placeholder="Category"
                            />
                            <Input
                              type="number"
                              value={rate.rate}
                              onChange={(e) => {
                                const newRates = [...editingCluster.overrides.tax.specialRates];
                                newRates[index] = { ...rate, rate: parseFloat(e.target.value) };
                                setEditingCluster(prev => ({
                                  ...prev!,
                                  overrides: {
                                    ...prev!.overrides,
                                    tax: { ...prev!.overrides.tax, specialRates: newRates }
                                  }
                                }));
                              }}
                              placeholder="Rate %"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCluster(prev => ({
                                ...prev!,
                                overrides: {
                                  ...prev!.overrides,
                                  tax: {
                                    ...prev!.overrides.tax,
                                    specialRates: prev!.overrides.tax.specialRates.filter((_, i) => i !== index)
                                  }
                                }
                              }))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClusterDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveClusterSettings} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}