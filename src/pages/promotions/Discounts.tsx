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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Percent, 
  DollarSign, 
  Calendar, 
  Users,
  Tag,
  Settings,
  TrendingUp,
  Eye,
  Copy,
  MoreHorizontal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ProductWithVariants, ProductVariant, PromotionTarget } from '@/types/variant-types';

interface Discount {
  id: string;
  code: string;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y' | 'bulk';
  value: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  applicableProducts: string[];
  applicableCategories: string[];
  applicableVariants: string[];
  variantTargets: PromotionTarget[];
  description: string;
  createdAt: string;
}

const mockDiscounts: Discount[] = [
  {
    id: '1',
    code: 'SAVE20',
    name: '20% Off Summer Sale',
    type: 'percentage',
    value: 20,
    minOrderValue: 50,
    maxDiscountAmount: 100,
    usageLimit: 1000,
    usedCount: 234,
    isActive: true,
    validFrom: '2024-06-01',
    validUntil: '2024-08-31',
    applicableProducts: ['Product A', 'Product B'],
    applicableCategories: ['Electronics', 'Fashion'],
    applicableVariants: ['var-product-a-red', 'var-product-b-large'],
    variantTargets: [
      { type: 'variant', id: 'var-product-a-red', name: 'Product A - Red' },
      { type: 'variant', id: 'var-product-b-large', name: 'Product B - Large' }
    ],
    description: 'Summer sale discount for electronics and fashion',
    createdAt: '2024-05-15'
  },
  {
    id: '2',
    code: 'NEWUSER',
    name: 'New User Discount',
    type: 'fixed',
    value: 25,
    minOrderValue: 100,
    usageLimit: 500,
    usedCount: 89,
    isActive: true,
    validFrom: '2024-01-01',
    validUntil: '2024-12-31',
    applicableProducts: [],
    applicableCategories: [],
    applicableVariants: [],
    variantTargets: [],
    description: 'Welcome discount for new customers',
    createdAt: '2024-01-01'
  },
  {
    id: '3',
    code: 'BULK10',
    name: 'Bulk Purchase Discount',
    type: 'bulk',
    value: 10,
    minOrderValue: 200,
    usageLimit: 100,
    usedCount: 45,
    isActive: true,
    validFrom: '2024-03-01',
    validUntil: '2024-12-31',
    applicableProducts: [],
    applicableCategories: ['Wholesale'],
    applicableVariants: [],
    variantTargets: [],
    description: 'Discount for bulk purchases',
    createdAt: '2024-02-15'
  }
];

const Discounts: React.FC = () => {
  const { toast } = useToast();
  const [discounts, setDiscounts] = useState<Discount[]>(mockDiscounts);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [newDiscount, setNewDiscount] = useState<Partial<Discount>>({
    code: '',
    name: '',
    type: 'percentage',
    value: 0,
    minOrderValue: 0,
    maxDiscountAmount: 0,
    usageLimit: 100,
    isActive: true,
    validFrom: '',
      validUntil: '',
      applicableProducts: [],
      applicableCategories: [],
      applicableVariants: [],
      variantTargets: [],
      description: ''
  });

  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch = discount.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         discount.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && discount.isActive) ||
                         (filterStatus === 'inactive' && !discount.isActive);
    const matchesType = filterType === 'all' || discount.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreateDiscount = () => {
    if (!newDiscount.code || !newDiscount.name || !newDiscount.validFrom || !newDiscount.validUntil) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const discount: Discount = {
      id: Date.now().toString(),
      code: newDiscount.code!,
      name: newDiscount.name!,
      type: newDiscount.type as Discount['type'],
      value: newDiscount.value || 0,
      minOrderValue: newDiscount.minOrderValue || 0,
      maxDiscountAmount: newDiscount.maxDiscountAmount,
      usageLimit: newDiscount.usageLimit || 100,
      usedCount: 0,
      isActive: newDiscount.isActive || true,
      validFrom: newDiscount.validFrom!,
      validUntil: newDiscount.validUntil!,
      applicableProducts: newDiscount.applicableProducts || [],
      applicableCategories: newDiscount.applicableCategories || [],
      applicableVariants: newDiscount.applicableVariants || [],
      variantTargets: newDiscount.variantTargets || [],
      description: newDiscount.description || '',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setDiscounts([...discounts, discount]);
    setShowCreateDialog(false);
    setNewDiscount({
      code: '',
      name: '',
      type: 'percentage',
      value: 0,
      minOrderValue: 0,
      maxDiscountAmount: 0,
      usageLimit: 100,
      isActive: true,
      validFrom: '',
      validUntil: '',
      applicableProducts: [],
      applicableCategories: [],
      applicableVariants: [],
      variantTargets: [],
      description: ''
    });

    toast({
      title: "Success",
      description: "Discount created successfully"
    });
  };

  const handleToggleStatus = (id: string) => {
    setDiscounts(discounts.map(discount => 
      discount.id === id ? { ...discount, isActive: !discount.isActive } : discount
    ));
    
    toast({
      title: "Status Updated",
      description: "Discount status has been updated"
    });
  };

  const handleDeleteDiscount = (id: string) => {
    setDiscounts(discounts.filter(discount => discount.id !== id));
    toast({
      title: "Discount Deleted",
      description: "Discount has been removed"
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code Copied",
      description: `Discount code "${code}" copied to clipboard`
    });
  };

  const getDiscountTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage': return Percent;
      case 'fixed': return DollarSign;
      case 'buy_x_get_y': return Tag;
      case 'bulk': return Users;
      default: return Tag;
    }
  };

  const getDiscountTypeColor = (type: string) => {
    switch (type) {
      case 'percentage': return 'bg-blue-100 text-blue-800';
      case 'fixed': return 'bg-green-100 text-green-800';
      case 'buy_x_get_y': return 'bg-purple-100 text-purple-800';
      case 'bulk': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDiscountValue = (discount: Discount) => {
    switch (discount.type) {
      case 'percentage':
        return `${discount.value}%`;
      case 'fixed':
        return `₹${discount.value}`;
      case 'bulk':
        return `${discount.value}% (bulk)`;
      default:
        return `${discount.value}`;
    }
  };

  const calculateUsagePercentage = (used: number, limit: number) => {
    return Math.round((used / limit) * 100);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discount Management</h1>
          <p className="text-muted-foreground">
            Create and manage discount codes for your store
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Discount
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Discount</DialogTitle>
              <DialogDescription>
                Set up a new discount code for your customers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Discount Code *</Label>
                  <Input
                    id="code"
                    placeholder="e.g., SAVE20"
                    value={newDiscount.code}
                    onChange={(e) => setNewDiscount({...newDiscount, code: e.target.value.toUpperCase()})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Summer Sale 20% Off"
                    value={newDiscount.name}
                    onChange={(e) => setNewDiscount({...newDiscount, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Discount Type</Label>
                  <Select 
                    value={newDiscount.type} 
                    onValueChange={(value: Discount['type']) => setNewDiscount({...newDiscount, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                      <SelectItem value="bulk">Bulk Discount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">
                    {newDiscount.type === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    placeholder="0"
                    value={newDiscount.value}
                    onChange={(e) => setNewDiscount({...newDiscount, value: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minOrder">Minimum Order Value (₹)</Label>
                  <Input
                    id="minOrder"
                    type="number"
                    placeholder="0"
                    value={newDiscount.minOrderValue}
                    onChange={(e) => setNewDiscount({...newDiscount, minOrderValue: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDiscount">Max Discount Amount (₹)</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    placeholder="Optional"
                    value={newDiscount.maxDiscountAmount || ''}
                    onChange={(e) => setNewDiscount({...newDiscount, maxDiscountAmount: Number(e.target.value) || undefined})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validFrom">Valid From *</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    value={newDiscount.validFrom}
                    onChange={(e) => setNewDiscount({...newDiscount, validFrom: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Valid Until *</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={newDiscount.validUntil}
                    onChange={(e) => setNewDiscount({...newDiscount, validUntil: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="usageLimit">Usage Limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  placeholder="100"
                  value={newDiscount.usageLimit}
                  onChange={(e) => setNewDiscount({...newDiscount, usageLimit: Number(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe this discount..."
                  value={newDiscount.description}
                  onChange={(e) => setNewDiscount({...newDiscount, description: e.target.value})}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={newDiscount.isActive}
                  onCheckedChange={(checked) => setNewDiscount({...newDiscount, isActive: checked})}
                />
                <Label htmlFor="active">Active immediately</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDiscount}>
                Create Discount
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search discounts..."
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
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
                <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                <SelectItem value="bulk">Bulk Discount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Discounts List */}
      <div className="space-y-4">
        {filteredDiscounts.map((discount) => {
          const TypeIcon = getDiscountTypeIcon(discount.type);
          const usagePercentage = calculateUsagePercentage(discount.usedCount, discount.usageLimit);
          
          return (
            <Card key={discount.id} className={cn(
              "transition-all duration-200",
              !discount.isActive && "opacity-60"
            )}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      getDiscountTypeColor(discount.type)
                    )}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{discount.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          {discount.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(discount.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={discount.isActive ? "default" : "secondary"}>
                      {discount.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(discount.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingDiscount(discount)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDiscount(discount.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Value:</span>
                    <div className="font-medium">{formatDiscountValue(discount)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Min Order:</span>
                    <div className="font-medium">₹{discount.minOrderValue}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Usage:</span>
                    <div className="font-medium">
                      {discount.usedCount} / {discount.usageLimit} ({usagePercentage}%)
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${usagePercentage}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valid:</span>
                    <div className="font-medium">
                      {discount.validFrom} to {discount.validUntil}
                    </div>
                  </div>
                </div>

                {discount.description && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{discount.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDiscounts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Percent className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No discounts found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first discount to get started
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Discount
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Discounts;