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
  Gift, 
  CreditCard, 
  Calendar, 
  Users,
  Download,
  Send,
  TrendingUp,
  Eye,
  Copy,
  RefreshCw,
  Ticket
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ProductWithVariants, ProductVariant, PromotionTarget } from '@/types/variant-types';

interface Voucher {
  id: string;
  code: string;
  name: string;
  type: 'gift' | 'promotional' | 'loyalty' | 'referral';
  value: number;
  currency: string;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  recipientEmail?: string;
  recipientName?: string;
  senderName?: string;
  message?: string;
  applicableVariants?: string[];
  variantTargets?: PromotionTarget[];
  createdAt: string;
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
}

const mockVouchers: Voucher[] = [
  {
    id: '1',
    code: 'GIFT-50-ABC123',
    name: 'Birthday Gift Voucher',
    type: 'gift',
    value: 50,
    currency: 'INR',
    isActive: true,
    validFrom: '2024-01-15',
    validUntil: '2024-12-31',
    usageLimit: 1,
    usedCount: 0,
    recipientEmail: 'john@example.com',
    recipientName: 'John Doe',
    senderName: 'Jane Smith',
    message: 'Happy Birthday! Enjoy your shopping!',
    applicableVariants: ['var-gift-item-1', 'var-gift-item-2'],
    variantTargets: [
      { type: 'variant', id: 'var-gift-item-1', name: 'Gift Item 1' },
      { type: 'variant', id: 'var-gift-item-2', name: 'Gift Item 2' }
    ],
    createdAt: '2024-01-15',
    status: 'active'
  },
  {
    id: '2',
    code: 'PROMO-100-DEF456',
    name: 'Customer Appreciation',
    type: 'promotional',
    value: 100,
    currency: 'INR',
    isActive: true,
    validFrom: '2024-03-01',
    validUntil: '2024-06-30',
    usageLimit: 1,
    usedCount: 1,
    recipientEmail: 'customer@example.com',
    applicableVariants: [],
    variantTargets: [],
    createdAt: '2024-03-01',
    status: 'redeemed'
  },
  {
    id: '3',
    code: 'LOYALTY-25-GHI789',
    name: 'Loyalty Reward',
    type: 'loyalty',
    value: 25,
    currency: 'INR',
    isActive: true,
    validFrom: '2024-02-01',
    validUntil: '2024-08-31',
    usageLimit: 1,
    usedCount: 0,
    recipientEmail: 'loyal@example.com',
    applicableVariants: [],
    variantTargets: [],
    createdAt: '2024-02-01',
    status: 'active'
  }
];

const Vouchers: React.FC = () => {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>(mockVouchers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('single');
  const [newVoucher, setNewVoucher] = useState<Partial<Voucher>>({
    code: '',
    name: '',
    type: 'gift',
    value: 0,
    currency: 'INR',
    isActive: true,
    validFrom: '',
    validUntil: '',
    usageLimit: 1,
    recipientEmail: '',
      recipientName: '',
      senderName: '',
      message: '',
      applicableVariants: [],
      variantTargets: []
  });

  const [bulkGeneration, setBulkGeneration] = useState({
    count: 10,
    prefix: 'BULK',
    value: 10,
    type: 'promotional' as Voucher['type'],
    validFrom: '',
    validUntil: '',
    usageLimit: 1
  });

  const filteredVouchers = vouchers.filter(voucher => {
    const matchesSearch = voucher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         voucher.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         voucher.recipientEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || voucher.status === filterStatus;
    const matchesType = filterType === 'all' || voucher.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const generateVoucherCode = (type: string, value: number) => {
    const prefix = type.toUpperCase().slice(0, 4);
    const randomSuffix = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${prefix}-${value}-${randomSuffix}`;
  };

  const handleCreateVoucher = () => {
    if (!newVoucher.name || !newVoucher.validFrom || !newVoucher.validUntil) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const voucher: Voucher = {
      id: Date.now().toString(),
      code: newVoucher.code || generateVoucherCode(newVoucher.type!, newVoucher.value!),
      name: newVoucher.name!,
      type: newVoucher.type as Voucher['type'],
      value: newVoucher.value || 0,
      currency: newVoucher.currency || 'INR',
      isActive: newVoucher.isActive || true,
      validFrom: newVoucher.validFrom!,
      validUntil: newVoucher.validUntil!,
      usageLimit: newVoucher.usageLimit || 1,
      usedCount: 0,
      recipientEmail: newVoucher.recipientEmail,
      recipientName: newVoucher.recipientName,
      senderName: newVoucher.senderName,
      message: newVoucher.message,
      applicableVariants: newVoucher.applicableVariants || [],
      variantTargets: newVoucher.variantTargets || [],
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active'
    };

    setVouchers([...vouchers, voucher]);
    setShowCreateDialog(false);
    resetNewVoucher();

    toast({
      title: "Success",
      description: "Voucher created successfully"
    });
  };

  const handleBulkGeneration = () => {
    if (!bulkGeneration.validFrom || !bulkGeneration.validUntil) {
      toast({
        title: "Validation Error",
        description: "Please set valid dates",
        variant: "destructive"
      });
      return;
    }

    const newVouchers: Voucher[] = [];
    for (let i = 0; i < bulkGeneration.count; i++) {
      const voucher: Voucher = {
        id: `${Date.now()}-${i}`,
        code: generateVoucherCode(bulkGeneration.prefix, bulkGeneration.value),
        name: `${bulkGeneration.prefix} Voucher ${i + 1}`,
        type: bulkGeneration.type,
        value: bulkGeneration.value,
        currency: 'INR',
        isActive: true,
        validFrom: bulkGeneration.validFrom,
        validUntil: bulkGeneration.validUntil,
        usageLimit: bulkGeneration.usageLimit,
        usedCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'active'
      };
      newVouchers.push(voucher);
    }

    setVouchers([...vouchers, ...newVouchers]);
    setShowBulkDialog(false);

    toast({
      title: "Success",
      description: `${bulkGeneration.count} vouchers generated successfully`
    });
  };

  const resetNewVoucher = () => {
    setNewVoucher({
      code: '',
      name: '',
      type: 'gift',
      value: 0,
      currency: 'INR',
      isActive: true,
      validFrom: '',
      validUntil: '',
      usageLimit: 1,
      recipientEmail: '',
      recipientName: '',
      senderName: '',
      message: '',
      applicableVariants: [],
      variantTargets: []
    });
  };

  const handleToggleStatus = (id: string) => {
    setVouchers(vouchers.map(voucher => 
      voucher.id === id ? { ...voucher, isActive: !voucher.isActive } : voucher
    ));
    
    toast({
      title: "Status Updated",
      description: "Voucher status has been updated"
    });
  };

  const handleDeleteVoucher = (id: string) => {
    setVouchers(vouchers.filter(voucher => voucher.id !== id));
    toast({
      title: "Voucher Deleted",
      description: "Voucher has been removed"
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code Copied",
      description: `Voucher code "${code}" copied to clipboard`
    });
  };

  const handleSendVoucher = (voucher: Voucher) => {
    // In a real implementation, this would send an email
    toast({
      title: "Voucher Sent",
      description: `Voucher sent to ${voucher.recipientEmail}`
    });
  };

  const exportVouchers = () => {
    const csvContent = vouchers.map(v => 
      `${v.code},${v.name},${v.type},${v.value},${v.status},${v.validFrom},${v.validUntil}`
    ).join('\n');
    
    const blob = new Blob([`Code,Name,Type,Value,Status,Valid From,Valid Until\n${csvContent}`], 
      { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vouchers.csv';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Vouchers exported to CSV"
    });
  };

  const getVoucherTypeIcon = (type: string) => {
    switch (type) {
      case 'gift': return Gift;
      case 'promotional': return Ticket;
      case 'loyalty': return TrendingUp;
      case 'referral': return Users;
      default: return Gift;
    }
  };

  const getVoucherTypeColor = (type: string) => {
    switch (type) {
      case 'gift': return 'bg-pink-100 text-pink-800';
      case 'promotional': return 'bg-blue-100 text-blue-800';
      case 'loyalty': return 'bg-green-100 text-green-800';
      case 'referral': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'redeemed': return 'secondary';
      case 'expired': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voucher Management</h1>
          <p className="text-muted-foreground">
            Create and manage gift vouchers and promotional codes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportVouchers}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Bulk Generate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Generate Vouchers</DialogTitle>
                <DialogDescription>
                  Generate multiple vouchers at once
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="count">Number of Vouchers</Label>
                    <Input
                      id="count"
                      type="number"
                      value={bulkGeneration.count}
                      onChange={(e) => setBulkGeneration({...bulkGeneration, count: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prefix">Code Prefix</Label>
                    <Input
                      id="prefix"
                      value={bulkGeneration.prefix}
                      onChange={(e) => setBulkGeneration({...bulkGeneration, prefix: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulkValue">Value (₹)</Label>
                    <Input
                      id="bulkValue"
                      type="number"
                      value={bulkGeneration.value}
                      onChange={(e) => setBulkGeneration({...bulkGeneration, value: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulkType">Type</Label>
                    <Select 
                      value={bulkGeneration.type} 
                      onValueChange={(value: Voucher['type']) => setBulkGeneration({...bulkGeneration, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gift">Gift</SelectItem>
                        <SelectItem value="promotional">Promotional</SelectItem>
                        <SelectItem value="loyalty">Loyalty</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulkValidFrom">Valid From</Label>
                    <Input
                      id="bulkValidFrom"
                      type="date"
                      value={bulkGeneration.validFrom}
                      onChange={(e) => setBulkGeneration({...bulkGeneration, validFrom: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulkValidUntil">Valid Until</Label>
                    <Input
                      id="bulkValidUntil"
                      type="date"
                      value={bulkGeneration.validUntil}
                      onChange={(e) => setBulkGeneration({...bulkGeneration, validUntil: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkGeneration}>
                  Generate Vouchers
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Voucher
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Voucher</DialogTitle>
                <DialogDescription>
                  Create a new voucher for your customers
                </DialogDescription>
              </DialogHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="single">Single Voucher</TabsTrigger>
                  <TabsTrigger value="details">Details & Message</TabsTrigger>
                </TabsList>
                
                <TabsContent value="single" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="voucherName">Name *</Label>
                      <Input
                        id="voucherName"
                        placeholder="e.g., Birthday Gift"
                        value={newVoucher.name}
                        onChange={(e) => setNewVoucher({...newVoucher, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voucherCode">Code (Optional)</Label>
                      <Input
                        id="voucherCode"
                        placeholder="Auto-generated if empty"
                        value={newVoucher.code}
                        onChange={(e) => setNewVoucher({...newVoucher, code: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="voucherType">Type</Label>
                      <Select 
                        value={newVoucher.type} 
                        onValueChange={(value: Voucher['type']) => setNewVoucher({...newVoucher, type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gift">Gift Voucher</SelectItem>
                          <SelectItem value="promotional">Promotional</SelectItem>
                          <SelectItem value="loyalty">Loyalty Reward</SelectItem>
                          <SelectItem value="referral">Referral Bonus</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voucherValue">Value (₹)</Label>
                      <Input
                        id="voucherValue"
                        type="number"
                        placeholder="0"
                        value={newVoucher.value}
                        onChange={(e) => setNewVoucher({...newVoucher, value: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="voucherValidFrom">Valid From *</Label>
                      <Input
                        id="voucherValidFrom"
                        type="date"
                        value={newVoucher.validFrom}
                        onChange={(e) => setNewVoucher({...newVoucher, validFrom: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voucherValidUntil">Valid Until *</Label>
                      <Input
                        id="voucherValidUntil"
                        type="date"
                        value={newVoucher.validUntil}
                        onChange={(e) => setNewVoucher({...newVoucher, validUntil: e.target.value})}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipientName">Recipient Name</Label>
                      <Input
                        id="recipientName"
                        placeholder="John Doe"
                        value={newVoucher.recipientName}
                        onChange={(e) => setNewVoucher({...newVoucher, recipientName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipientEmail">Recipient Email</Label>
                      <Input
                        id="recipientEmail"
                        type="email"
                        placeholder="john@example.com"
                        value={newVoucher.recipientEmail}
                        onChange={(e) => setNewVoucher({...newVoucher, recipientEmail: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="senderName">Sender Name</Label>
                    <Input
                      id="senderName"
                      placeholder="Your Name"
                      value={newVoucher.senderName}
                      onChange={(e) => setNewVoucher({...newVoucher, senderName: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="voucherMessage">Personal Message</Label>
                    <Textarea
                      id="voucherMessage"
                      placeholder="Happy Birthday! Enjoy your shopping..."
                      value={newVoucher.message}
                      onChange={(e) => setNewVoucher({...newVoucher, message: e.target.value})}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="voucherActive"
                      checked={newVoucher.isActive}
                      onCheckedChange={(checked) => setNewVoucher({...newVoucher, isActive: checked})}
                    />
                    <Label htmlFor="voucherActive">Active immediately</Label>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateVoucher}>
                  Create Voucher
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search vouchers..."
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
                <SelectItem value="redeemed">Redeemed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="gift">Gift</SelectItem>
                <SelectItem value="promotional">Promotional</SelectItem>
                <SelectItem value="loyalty">Loyalty</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vouchers List */}
      <div className="space-y-4">
        {filteredVouchers.map((voucher) => {
          const TypeIcon = getVoucherTypeIcon(voucher.type);
          
          return (
            <Card key={voucher.id} className={cn(
              "transition-all duration-200 hover:shadow-md",
              !voucher.isActive && "opacity-60"
            )}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      getVoucherTypeColor(voucher.type)
                    )}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{voucher.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          {voucher.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(voucher.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(voucher.status)}>
                      {voucher.status}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {voucher.recipientEmail && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendVoucher(voucher)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(voucher.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVoucher(voucher.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Value:</span>
                    <div className="font-medium">₹{voucher.value} {voucher.currency}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Usage:</span>
                    <div className="font-medium">
                      {voucher.usedCount} / {voucher.usageLimit}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valid:</span>
                    <div className="font-medium">
                      {voucher.validFrom} to {voucher.validUntil}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Recipient:</span>
                    <div className="font-medium">
                      {voucher.recipientName || voucher.recipientEmail || 'Not specified'}
                    </div>
                  </div>
                </div>

                {voucher.message && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm italic">"{voucher.message}"</p>
                    {voucher.senderName && (
                      <p className="text-xs text-muted-foreground mt-1">
                        - {voucher.senderName}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredVouchers.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Gift className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No vouchers found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first voucher to get started
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Voucher
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Vouchers;