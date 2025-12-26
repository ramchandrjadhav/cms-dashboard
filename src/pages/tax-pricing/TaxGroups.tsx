import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Info,
  Settings,
  Percent,
  Globe
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TaxRate {
  id: string;
  country: string;
  state?: string;
  rate: number;
  taxName: string;
  taxCode: string;
  isDefault: boolean;
}

interface TaxGroup {
  id: string;
  name: string;
  description: string;
  code: string;
  isActive: boolean;
  rates: TaxRate[];
  productsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const mockTaxGroups: TaxGroup[] = [
  {
    id: '1',
    name: 'Standard Tax',
    description: 'Standard tax rate for most products',
    code: 'STD',
    isActive: true,
    rates: [
      { id: '1', country: 'US', rate: 8.25, taxName: 'Sales Tax', taxCode: 'US-STD', isDefault: true },
      { id: '2', country: 'CA', state: 'ON', rate: 13, taxName: 'HST', taxCode: 'CA-HST', isDefault: false },
      { id: '3', country: 'UK', rate: 20, taxName: 'VAT', taxCode: 'UK-VAT', isDefault: false },
    ],
    productsCount: 245,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    name: 'Reduced Tax',
    description: 'Reduced tax rate for essential items',
    code: 'RED',
    isActive: true,
    rates: [
      { id: '4', country: 'US', rate: 0, taxName: 'Tax Exempt', taxCode: 'US-EXEMPT', isDefault: true },
      { id: '5', country: 'UK', rate: 5, taxName: 'Reduced VAT', taxCode: 'UK-RED-VAT', isDefault: false },
    ],
    productsCount: 89,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: '3',
    name: 'Zero Tax',
    description: 'Zero tax rate for exempt products',
    code: 'ZERO',
    isActive: true,
    rates: [
      { id: '6', country: 'US', rate: 0, taxName: 'Zero Rate', taxCode: 'US-ZERO', isDefault: true },
      { id: '7', country: 'UK', rate: 0, taxName: 'Zero VAT', taxCode: 'UK-ZERO', isDefault: false },
    ],
    productsCount: 23,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-12'),
  },
];

export default function TaxGroups() {
  const { toast } = useToast();
  const [taxGroups, setTaxGroups] = useState<TaxGroup[]>(mockTaxGroups);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGroup, setEditingGroup] = useState<TaxGroup | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const filteredGroups = taxGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateGroup = () => {
    const newGroup: TaxGroup = {
      id: Date.now().toString(),
      name: 'New Tax Group',
      description: '',
      code: 'NEW',
      isActive: true,
      rates: [],
      productsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEditingGroup(newGroup);
    setShowCreateDialog(true);
  };

  const handleEditGroup = (group: TaxGroup) => {
    setEditingGroup({ ...group });
    setShowCreateDialog(true);
  };

  const handleSaveGroup = async () => {
    if (!editingGroup) return;

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const isNew = !taxGroups.find(g => g.id === editingGroup.id);
    
    if (isNew) {
      setTaxGroups(prev => [...prev, { ...editingGroup, updatedAt: new Date() }]);
      toast({
        title: "Tax Group Created",
        description: "Tax group has been created successfully.",
      });
    } else {
      setTaxGroups(prev => prev.map(g => 
        g.id === editingGroup.id 
          ? { ...editingGroup, updatedAt: new Date() }
          : g
      ));
      toast({
        title: "Tax Group Updated",
        description: "Tax group has been updated successfully.",
      });
    }

    setIsLoading(false);
    setShowCreateDialog(false);
    setEditingGroup(null);
  };

  const handleDeleteGroup = async (groupId: string) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    setTaxGroups(prev => prev.filter(g => g.id !== groupId));
    setIsLoading(false);
    
    toast({
      title: "Tax Group Deleted",
      description: "Tax group has been deleted successfully.",
    });
  };

  const handleToggleActive = async (groupId: string) => {
    setTaxGroups(prev => prev.map(g => 
      g.id === groupId 
        ? { ...g, isActive: !g.isActive, updatedAt: new Date() }
        : g
    ));
    
    toast({
      title: "Status Updated",
      description: "Tax group status has been updated.",
    });
  };

  const addRate = () => {
    if (!editingGroup) return;
    
    const newRate: TaxRate = {
      id: Date.now().toString(),
      country: '',
      state: '',
      rate: 0,
      taxName: '',
      taxCode: '',
      isDefault: false,
    };
    
    setEditingGroup(prev => ({
      ...prev!,
      rates: [...prev!.rates, newRate],
    }));
  };

  const updateRate = (rateId: string, updates: Partial<TaxRate>) => {
    if (!editingGroup) return;
    
    setEditingGroup(prev => ({
      ...prev!,
      rates: prev!.rates.map(rate =>
        rate.id === rateId ? { ...rate, ...updates } : rate
      ),
    }));
  };

  const deleteRate = (rateId: string) => {
    if (!editingGroup) return;
    
    setEditingGroup(prev => ({
      ...prev!,
      rates: prev!.rates.filter(rate => rate.id !== rateId),
    }));
  };

  const getTaxSummary = (group: TaxGroup) => {
    if (group.rates.length === 0) return 'No rates configured';
    
    const defaultRate = group.rates.find(r => r.isDefault);
    const otherRates = group.rates.filter(r => !r.isDefault);
    
    let summary = defaultRate ? `${defaultRate.rate}% (${defaultRate.country})` : `${group.rates[0].rate}% (${group.rates[0].country})`;
    
    if (otherRates.length > 0) {
      summary += ` +${otherRates.length} more`;
    }
    
    return summary;
  };

  return (
    <div>
      <div className="space-y-6 p-6">
        <PageHeader
          title="Tax Groups"
          description="Manage tax categories and their associated rates"
          actions={
            <div className="flex items-center gap-2">
              <Button onClick={handleCreateGroup}>
                <Plus className="mr-2 h-4 w-4" />
                Create Tax Group
              </Button>
            </div>
          }
        />

        {/* Search and Stats */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tax groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Total: {filteredGroups.length}</span>
            <span>Active: {filteredGroups.filter(g => g.isActive).length}</span>
            <span>Products: {filteredGroups.reduce((sum, g) => sum + g.productsCount, 0)}</span>
          </div>
        </div>

        {/* Tax Groups Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Tax Rates</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{group.name}</div>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <div className="font-medium">{group.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {getTaxSummary(group)}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{group.code}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate">{group.description}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {group.rates.slice(0, 3).map((rate) => (
                        <Badge key={rate.id} variant="secondary" className="text-xs">
                          {rate.country}: {rate.rate}%
                        </Badge>
                      ))}
                      {group.rates.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{group.rates.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{group.productsCount}</span>
                      <span className="text-muted-foreground">products</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(group.id)}
                    >
                      <Badge variant={group.isActive ? 'default' : 'secondary'}>
                        {group.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditGroup(group)}
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
                            <AlertDialogTitle>Delete Tax Group</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{group.name}"? This action cannot be undone.
                              {group.productsCount > 0 && (
                                <div className="mt-2 text-red-600">
                                  Warning: This tax group is used by {group.productsCount} products.
                                </div>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteGroup(group.id)}
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
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {editingGroup && taxGroups.find(g => g.id === editingGroup.id) ? 'Edit' : 'Create'} Tax Group
              </DialogTitle>
              <DialogDescription>
                Configure tax group details and regional tax rates
              </DialogDescription>
            </DialogHeader>
            
            {editingGroup && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Group Name</Label>
                    <Input
                      id="name"
                      value={editingGroup.name}
                      onChange={(e) => setEditingGroup(prev => ({ ...prev!, name: e.target.value }))}
                      placeholder="e.g., Standard Tax"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="code">Group Code</Label>
                    <Input
                      id="code"
                      value={editingGroup.code}
                      onChange={(e) => setEditingGroup(prev => ({ ...prev!, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g., STD"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editingGroup.description}
                      onChange={(e) => setEditingGroup(prev => ({ ...prev!, description: e.target.value }))}
                      placeholder="Describe when this tax group should be used"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Tax Rates */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Tax Rates</h3>
                    <Button onClick={addRate} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Rate
                    </Button>
                  </div>
                  
                  {editingGroup.rates.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No tax rates configured. Add a rate to get started.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editingGroup.rates.map((rate) => (
                        <Card key={rate.id} className="p-4">
                          <div className="grid gap-4 md:grid-cols-6">
                            <div className="space-y-2">
                              <Label htmlFor={`country-${rate.id}`}>Country</Label>
                              <Input
                                id={`country-${rate.id}`}
                                value={rate.country}
                                onChange={(e) => updateRate(rate.id, { country: e.target.value })}
                                placeholder="US"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`state-${rate.id}`}>State/Province</Label>
                              <Input
                                id={`state-${rate.id}`}
                                value={rate.state || ''}
                                onChange={(e) => updateRate(rate.id, { state: e.target.value })}
                                placeholder="Optional"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`rate-${rate.id}`}>Rate (%)</Label>
                              <Input
                                id={`rate-${rate.id}`}
                                type="number"
                                value={rate.rate}
                                onChange={(e) => updateRate(rate.id, { rate: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                max="100"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`taxName-${rate.id}`}>Tax Name</Label>
                              <Input
                                id={`taxName-${rate.id}`}
                                value={rate.taxName}
                                onChange={(e) => updateRate(rate.id, { taxName: e.target.value })}
                                placeholder="Sales Tax"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`taxCode-${rate.id}`}>Tax Code</Label>
                              <Input
                                id={`taxCode-${rate.id}`}
                                value={rate.taxCode}
                                onChange={(e) => updateRate(rate.id, { taxCode: e.target.value })}
                                placeholder="US-STD"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Actions</Label>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateRate(rate.id, { isDefault: !rate.isDefault })}
                                  className={rate.isDefault ? 'text-primary' : ''}
                                >
                                  {rate.isDefault ? 'Default' : 'Set Default'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteRate(rate.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveGroup} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Settings className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Tax Group
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}