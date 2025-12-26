import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  BarChart, 
  Calendar, 
  Users,
  Target,
  Settings,
  TrendingUp,
  Eye,
  Copy,
  RefreshCw,
  Megaphone,
  Clock,
  DollarSign,
  Percent
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ProductWithVariants, ProductVariant, PromotionTarget } from '@/types/variant-types';
import { apiClient } from '@/lib/api-client';

interface Campaign {
  id: string;
  name: string;
  description: string;
  type: 'seasonal' | 'flash' | 'loyalty' | 'new_customer' | 'clearance';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  targetAudience: string;
  discountType: 'percentage' | 'fixed' | 'bogo' | 'free_shipping';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  usageLimit: number;
  usedCount: number;
  revenue: number;
  conversionRate: number;
  clickCount: number;
  createdAt: string;
  channels: string[];
  products: string[];
  categories: string[];
  variants: string[];
  variantTargets: PromotionTarget[];
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Summer Sale 2024',
    description: 'Annual summer sale with up to 50% off on summer collections',
    type: 'seasonal',
    status: 'active',
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    budget: 50000,
    spent: 23500,
    targetAudience: 'All customers',
    discountType: 'percentage',
    discountValue: 25,
    minOrderValue: 75,
    maxDiscountAmount: 200,
    usageLimit: 10000,
    usedCount: 3456,
    revenue: 156000,
    conversionRate: 12.5,
    clickCount: 25600,
    createdAt: '2024-05-15',
    channels: ['Email', 'Social Media', 'Website Banner'],
    products: ['Summer Dress', 'Sandals', 'Sunglasses'],
    categories: ['Fashion', 'Accessories'],
    variants: ['var-summer-dress-red', 'var-sandals-size-8'],
    variantTargets: [
      { type: 'variant', id: 'var-summer-dress-red', name: 'Summer Dress - Red' },
      { type: 'variant', id: 'var-sandals-size-8', name: 'Sandals - Size 8' }
    ]
  },
  {
    id: '2',
    name: 'Flash Friday Deal',
    description: '24-hour flash sale every Friday',
    type: 'flash',
    status: 'active',
    startDate: '2024-04-05',
    endDate: '2024-12-31',
    budget: 20000,
    spent: 8900,
    targetAudience: 'VIP customers',
    discountType: 'fixed',
    discountValue: 50,
    minOrderValue: 200,
    usageLimit: 500,
    usedCount: 234,
    revenue: 45000,
    conversionRate: 18.2,
    clickCount: 12800,
    createdAt: '2024-04-01',
    channels: ['Email', 'Push Notification'],
    products: ['Electronics', 'Gadgets'],
    categories: ['Technology'],
    variants: ['var-smartphone-pro-128gb'],
    variantTargets: [
      { type: 'variant', id: 'var-smartphone-pro-128gb', name: 'Smartphone Pro - 128GB' }
    ]
  },
  {
    id: '3',
    name: 'New Customer Welcome',
    description: 'Welcome discount for first-time customers',
    type: 'new_customer',
    status: 'active',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    budget: 30000,
    spent: 15600,
    targetAudience: 'New customers',
    discountType: 'percentage',
    discountValue: 15,
    minOrderValue: 50,
    usageLimit: 2000,
    usedCount: 1234,
    revenue: 67000,
    conversionRate: 22.1,
    clickCount: 18900,
    createdAt: '2024-01-01',
    channels: ['Email', 'Website Popup'],
    products: [],
    categories: [],
    variants: [],
    variantTargets: []
  }
];

const Campaigns: React.FC = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
    name: '',
    description: '',
    type: 'seasonal',
    status: 'draft',
    startDate: '',
    endDate: '',
    budget: 0,
    targetAudience: '',
    discountType: 'percentage',
    discountValue: 0,
    minOrderValue: 0,
    maxDiscountAmount: 0,
      usageLimit: 1000,
      channels: [],
      products: [],
      categories: [],
      variants: [],
      variantTargets: []
  });

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus;
    const matchesType = filterType === 'all' || campaign.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreateCampaign = () => {
    if (!newCampaign.name || !newCampaign.startDate || !newCampaign.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const campaign: Campaign = {
      id: Date.now().toString(),
      name: newCampaign.name!,
      description: newCampaign.description || '',
      type: newCampaign.type as Campaign['type'],
      status: newCampaign.status as Campaign['status'],
      startDate: newCampaign.startDate!,
      endDate: newCampaign.endDate!,
      budget: newCampaign.budget || 0,
      spent: 0,
      targetAudience: newCampaign.targetAudience || '',
      discountType: newCampaign.discountType as Campaign['discountType'],
      discountValue: newCampaign.discountValue || 0,
      minOrderValue: newCampaign.minOrderValue || 0,
      maxDiscountAmount: newCampaign.maxDiscountAmount,
      usageLimit: newCampaign.usageLimit || 1000,
      usedCount: 0,
      revenue: 0,
      conversionRate: 0,
      clickCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      channels: newCampaign.channels || [],
      products: newCampaign.products || [],
      categories: newCampaign.categories || [],
      variants: newCampaign.variants || [],
      variantTargets: newCampaign.variantTargets || []
    };

    setCampaigns([...campaigns, campaign]);
    setShowCreateDialog(false);
    resetNewCampaign();

    toast({
      title: "Success",
      description: "Campaign created successfully"
    });
  };

  const resetNewCampaign = () => {
    setNewCampaign({
      name: '',
      description: '',
      type: 'seasonal',
      status: 'draft',
      startDate: '',
      endDate: '',
      budget: 0,
      targetAudience: '',
      discountType: 'percentage',
      discountValue: 0,
      minOrderValue: 0,
      maxDiscountAmount: 0,
      usageLimit: 1000,
      channels: [],
      products: [],
      categories: [],
      variants: [],
      variantTargets: []
    });
  };

  const handleToggleStatus = (id: string) => {
    setCampaigns(campaigns.map(campaign => {
      if (campaign.id === id) {
        const newStatus = campaign.status === 'active' ? 'paused' : 'active';
        return { ...campaign, status: newStatus };
      }
      return campaign;
    }));
    
    toast({
      title: "Status Updated",
      description: "Campaign status has been updated"
    });
  };

  const handleDeleteCampaign = (id: string) => {
    setCampaigns(campaigns.filter(campaign => campaign.id !== id));
    toast({
      title: "Campaign Deleted",
      description: "Campaign has been removed"
    });
  };

  const handleViewAnalytics = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowAnalyticsDialog(true);
  };

  const calculateBudgetUsage = (spent: number, budget: number) => {
    return budget > 0 ? (spent / budget) * 100 : 0;
  };

  const calculateUsageRate = (used: number, limit: number) => {
    return limit > 0 ? (used / limit) * 100 : 0;
  };

  const calculateROI = (revenue: number, spent: number) => {
    return spent > 0 ? ((revenue - spent) / spent) * 100 : 0;
  };

  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case 'seasonal': return Calendar;
      case 'flash': return RefreshCw;
      case 'loyalty': return TrendingUp;
      case 'new_customer': return Users;
      case 'clearance': return Target;
      default: return Megaphone;
    }
  };

  const getCampaignTypeColor = (type: string) => {
    switch (type) {
      case 'seasonal': return 'bg-blue-100 text-blue-800';
      case 'flash': return 'bg-red-100 text-red-800';
      case 'loyalty': return 'bg-green-100 text-green-800';
      case 'new_customer': return 'bg-purple-100 text-purple-800';
      case 'clearance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      case 'draft': return 'secondary';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Management</h1>
          <p className="text-muted-foreground">
            Create and manage promotional campaigns
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Set up a new promotional campaign
              </DialogDescription>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="discount">Discount Setup</TabsTrigger>
                <TabsTrigger value="targeting">Targeting</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaignName">Campaign Name *</Label>
                    <Input
                      id="campaignName"
                      placeholder="e.g., Summer Sale 2024"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campaignType">Campaign Type</Label>
                    <Select 
                      value={newCampaign.type} 
                      onValueChange={(value: Campaign['type']) => setNewCampaign({...newCampaign, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
                        <SelectItem value="flash">Flash Sale</SelectItem>
                        <SelectItem value="loyalty">Loyalty Program</SelectItem>
                        <SelectItem value="new_customer">New Customer</SelectItem>
                        <SelectItem value="clearance">Clearance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaignDescription">Description</Label>
                  <Textarea
                    id="campaignDescription"
                    placeholder="Describe your campaign..."
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaignStartDate">Start Date *</Label>
                    <Input
                      id="campaignStartDate"
                      type="date"
                      value={newCampaign.startDate}
                      onChange={(e) => setNewCampaign({...newCampaign, startDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campaignEndDate">End Date *</Label>
                    <Input
                      id="campaignEndDate"
                      type="date"
                      value={newCampaign.endDate}
                      onChange={(e) => setNewCampaign({...newCampaign, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaignBudget">Budget (₹)</Label>
                  <Input
                    id="campaignBudget"
                    type="number"
                    placeholder="0"
                    value={newCampaign.budget}
                    onChange={(e) => setNewCampaign({...newCampaign, budget: Number(e.target.value)})}
                  />
                </div>
              </TabsContent>

              <TabsContent value="discount" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discountType">Discount Type</Label>
                    <Select 
                      value={newCampaign.discountType} 
                      onValueChange={(value: Campaign['discountType']) => setNewCampaign({...newCampaign, discountType: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="bogo">Buy One Get One</SelectItem>
                        <SelectItem value="free_shipping">Free Shipping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountValue">
                      {newCampaign.discountType === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}
                    </Label>
                    <Input
                      id="discountValue"
                      type="number"
                      placeholder="0"
                      value={newCampaign.discountValue}
                      onChange={(e) => setNewCampaign({...newCampaign, discountValue: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minOrderValue">Minimum Order Value (₹)</Label>
                    <Input
                      id="minOrderValue"
                      type="number"
                      placeholder="0"
                      value={newCampaign.minOrderValue}
                      onChange={(e) => setNewCampaign({...newCampaign, minOrderValue: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxDiscountAmount">Max Discount Amount (₹)</Label>
                    <Input
                      id="maxDiscountAmount"
                      type="number"
                      placeholder="Optional"
                      value={newCampaign.maxDiscountAmount || ''}
                      onChange={(e) => setNewCampaign({...newCampaign, maxDiscountAmount: Number(e.target.value) || undefined})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usageLimit">Usage Limit</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    placeholder="1000"
                    value={newCampaign.usageLimit}
                    onChange={(e) => setNewCampaign({...newCampaign, usageLimit: Number(e.target.value)})}
                  />
                </div>
              </TabsContent>

              <TabsContent value="targeting" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Select 
                    value={newCampaign.targetAudience} 
                    onValueChange={(value) => setNewCampaign({...newCampaign, targetAudience: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="new">New Customers</SelectItem>
                      <SelectItem value="vip">VIP Customers</SelectItem>
                      <SelectItem value="inactive">Inactive Customers</SelectItem>
                      <SelectItem value="high_value">High Value Customers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Marketing Channels</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Email', 'SMS', 'Social Media', 'Website Banner', 'Push Notification', 'Print'].map((channel) => (
                      <div key={channel} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={channel}
                          checked={newCampaign.channels?.includes(channel)}
                          onChange={(e) => {
                            const channels = newCampaign.channels || [];
                            if (e.target.checked) {
                              setNewCampaign({...newCampaign, channels: [...channels, channel]});
                            } else {
                              setNewCampaign({...newCampaign, channels: channels.filter(c => c !== channel)});
                            }
                          }}
                        />
                        <Label htmlFor={channel} className="text-sm">{channel}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign}>
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter(c => c.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {campaigns.filter(c => c.status === 'paused').length} paused
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(campaigns.reduce((sum, c) => sum + c.revenue, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              From all campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Conversion</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(campaigns.reduce((sum, c) => sum + c.conversionRate, 0) / campaigns.length).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(campaigns.reduce((sum, c) => sum + c.spent, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Of {formatCurrency(campaigns.reduce((sum, c) => sum + c.budget, 0))} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
                <SelectItem value="flash">Flash Sale</SelectItem>
                <SelectItem value="loyalty">Loyalty</SelectItem>
                <SelectItem value="new_customer">New Customer</SelectItem>
                <SelectItem value="clearance">Clearance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      <div className="space-y-4">
        {filteredCampaigns.map((campaign) => {
          const TypeIcon = getCampaignTypeIcon(campaign.type);
          const budgetUsage = calculateBudgetUsage(campaign.spent, campaign.budget);
          const usageRate = calculateUsageRate(campaign.usedCount, campaign.usageLimit);
          const roi = calculateROI(campaign.revenue, campaign.spent);
          
          return (
            <Card key={campaign.id} className="transition-all duration-200 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      getCampaignTypeColor(campaign.type)
                    )}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{campaign.name}</h3>
                      <p className="text-sm text-muted-foreground">{campaign.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewAnalytics(campaign)}
                      >
                        <BarChart className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(campaign.id)}
                      >
                        {campaign.status === 'active' ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCampaign(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Budget Usage:</span>
                    <div className="font-medium">{formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}</div>
                    <Progress value={budgetUsage} className="mt-1" />
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Usage Rate:</span>
                    <div className="font-medium">{campaign.usedCount} / {campaign.usageLimit}</div>
                    <Progress value={usageRate} className="mt-1" />
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Revenue:</span>
                    <div className="font-medium">{formatCurrency(campaign.revenue)}</div>
                    <div className="text-xs text-green-600">ROI: {roi.toFixed(1)}%</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Conversion:</span>
                    <div className="font-medium">{campaign.conversionRate}%</div>
                    <div className="text-xs text-muted-foreground">{campaign.clickCount} clicks</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{campaign.startDate} - {campaign.endDate}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{campaign.targetAudience}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {campaign.channels.map((channel) => (
                      <Badge key={channel} variant="outline" className="text-xs">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analytics Dialog */}
      <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Campaign Analytics</DialogTitle>
            <DialogDescription>
              {selectedCampaign?.name} performance metrics
            </DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedCampaign.revenue)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Conversion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedCampaign.conversionRate}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">ROI</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {calculateROI(selectedCampaign.revenue, selectedCampaign.spent).toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Budget Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Spent:</span>
                        <span className="font-medium">{formatCurrency(selectedCampaign.spent)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Budget:</span>
                        <span className="font-medium">{formatCurrency(selectedCampaign.budget)}</span>
                      </div>
                      <Progress value={calculateBudgetUsage(selectedCampaign.spent, selectedCampaign.budget)} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Usage Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Used:</span>
                        <span className="font-medium">{selectedCampaign.usedCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Limit:</span>
                        <span className="font-medium">{selectedCampaign.usageLimit}</span>
                      </div>
                      <Progress value={calculateUsageRate(selectedCampaign.usedCount, selectedCampaign.usageLimit)} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {filteredCampaigns.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Megaphone className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first campaign to get started
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Campaigns;