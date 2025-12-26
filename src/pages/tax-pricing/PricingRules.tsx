import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Calculator,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  CalendarIcon,
  Globe,
  Settings,
  Target,
  Zap
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PricingRule {
  id: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed' | 'tiered' | 'dynamic';
  priority: number;
  isActive: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  schedule?: RuleSchedule;
  applicableProducts: string[];
  applicableFacilities: string[];
  applicableClusters: string[];
  createdAt: Date;
  updatedAt: Date;
  usage: {
    timesApplied: number;
    lastApplied?: Date;
    impactedProducts: number;
  };
}

interface RuleCondition {
  id: string;
  type: 'product_category' | 'facility_type' | 'cluster' | 'quantity' | 'date_range' | 'customer_segment';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between';
  value: string | number | string[];
  logicalOperator?: 'AND' | 'OR';
}

interface RuleAction {
  id: string;
  type: 'adjust_price' | 'set_price' | 'add_margin' | 'set_margin' | 'round_price';
  value: number | string;
  unit: 'percentage' | 'fixed' | 'currency';
  target: 'base_price' | 'final_price' | 'margin';
}

interface RuleSchedule {
  startDate: Date;
  endDate?: Date;
  recurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  timeZone: string;
}

const mockPricingRules: PricingRule[] = [
  {
    id: '1',
    name: 'Holiday Season Markup',
    description: 'Increase prices by 10% during holiday season',
    type: 'percentage',
    priority: 1,
    isActive: true,
    conditions: [
      {
        id: '1',
        type: 'date_range',
        operator: 'between',
        value: ['2024-11-01', '2024-12-31'],
      },
      {
        id: '2',
        type: 'product_category',
        operator: 'in',
        value: ['Electronics', 'Toys'],
        logicalOperator: 'AND',
      },
    ],
    actions: [
      {
        id: '1',
        type: 'adjust_price',
        value: 10,
        unit: 'percentage',
        target: 'base_price',
      },
    ],
    schedule: {
      startDate: new Date('2024-11-01'),
      endDate: new Date('2024-12-31'),
      recurring: true,
      recurringPattern: 'yearly',
      timeZone: 'America/New_York',
    },
    applicableProducts: ['1', '2', '3'],
    applicableFacilities: ['1', '2'],
    applicableClusters: ['urban'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    usage: {
      timesApplied: 1250,
      lastApplied: new Date('2024-01-20'),
      impactedProducts: 85,
    },
  },
  {
    id: '2',
    name: 'Bulk Quantity Discount',
    description: 'Tiered pricing based on quantity purchased',
    type: 'tiered',
    priority: 2,
    isActive: true,
    conditions: [
      {
        id: '3',
        type: 'quantity',
        operator: 'greater_than',
        value: 10,
      },
    ],
    actions: [
      {
        id: '2',
        type: 'adjust_price',
        value: -5,
        unit: 'percentage',
        target: 'final_price',
      },
    ],
    applicableProducts: ['1', '2', '3', '4'],
    applicableFacilities: ['2', '3'],
    applicableClusters: ['central'],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
    usage: {
      timesApplied: 890,
      lastApplied: new Date('2024-01-18'),
      impactedProducts: 45,
    },
  },
  {
    id: '3',
    name: 'Warehouse Pricing',
    description: 'Reduced prices for warehouse sales',
    type: 'fixed',
    priority: 3,
    isActive: false,
    conditions: [
      {
        id: '4',
        type: 'facility_type',
        operator: 'equals',
        value: 'warehouse',
      },
    ],
    actions: [
      {
        id: '3',
        type: 'adjust_price',
        value: -15,
        unit: 'percentage',
        target: 'base_price',
      },
    ],
    applicableProducts: [],
    applicableFacilities: ['2', '5'],
    applicableClusters: [],
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-12'),
    usage: {
      timesApplied: 340,
      lastApplied: new Date('2024-01-10'),
      impactedProducts: 23,
    },
  },
];

export default function PricingRules() {
  const { toast } = useToast();
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(mockPricingRules);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const filteredRules = pricingRules.filter(rule =>
    rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateRule = () => {
    const newRule: PricingRule = {
      id: Date.now().toString(),
      name: 'New Pricing Rule',
      description: '',
      type: 'percentage',
      priority: pricingRules.length + 1,
      isActive: true,
      conditions: [],
      actions: [],
      applicableProducts: [],
      applicableFacilities: [],
      applicableClusters: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      usage: {
        timesApplied: 0,
        impactedProducts: 0,
      },
    };
    setEditingRule(newRule);
    setShowCreateDialog(true);
  };

  const handleEditRule = (rule: PricingRule) => {
    setEditingRule({ ...rule });
    setShowCreateDialog(true);
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const isNew = !pricingRules.find(r => r.id === editingRule.id);
    
    if (isNew) {
      setPricingRules(prev => [...prev, { ...editingRule, updatedAt: new Date() }]);
      toast({
        title: "Pricing Rule Created",
        description: "Pricing rule has been created successfully.",
      });
    } else {
      setPricingRules(prev => prev.map(r => 
        r.id === editingRule.id 
          ? { ...editingRule, updatedAt: new Date() }
          : r
      ));
      toast({
        title: "Pricing Rule Updated",
        description: "Pricing rule has been updated successfully.",
      });
    }

    setIsLoading(false);
    setShowCreateDialog(false);
    setEditingRule(null);
  };

  const handleDeleteRule = async (ruleId: string) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    setPricingRules(prev => prev.filter(r => r.id !== ruleId));
    setIsLoading(false);
    
    toast({
      title: "Pricing Rule Deleted",
      description: "Pricing rule has been deleted successfully.",
    });
  };

  const handleToggleActive = async (ruleId: string) => {
    setPricingRules(prev => prev.map(r => 
      r.id === ruleId 
        ? { ...r, isActive: !r.isActive, updatedAt: new Date() }
        : r
    ));
    
    toast({
      title: "Status Updated",
      description: "Pricing rule status has been updated.",
    });
  };

  const addCondition = () => {
    if (!editingRule) return;
    
    const newCondition: RuleCondition = {
      id: Date.now().toString(),
      type: 'product_category',
      operator: 'equals',
      value: '',
    };
    
    setEditingRule(prev => ({
      ...prev!,
      conditions: [...prev!.conditions, newCondition],
    }));
  };

  const addAction = () => {
    if (!editingRule) return;
    
    const newAction: RuleAction = {
      id: Date.now().toString(),
      type: 'adjust_price',
      value: 0,
      unit: 'percentage',
      target: 'base_price',
    };
    
    setEditingRule(prev => ({
      ...prev!,
      actions: [...prev!.actions, newAction],
    }));
  };

  const updateCondition = (conditionId: string, updates: Partial<RuleCondition>) => {
    if (!editingRule) return;
    
    setEditingRule(prev => ({
      ...prev!,
      conditions: prev!.conditions.map(condition =>
        condition.id === conditionId ? { ...condition, ...updates } : condition
      ),
    }));
  };

  const updateAction = (actionId: string, updates: Partial<RuleAction>) => {
    if (!editingRule) return;
    
    setEditingRule(prev => ({
      ...prev!,
      actions: prev!.actions.map(action =>
        action.id === actionId ? { ...action, ...updates } : action
      ),
    }));
  };

  const deleteCondition = (conditionId: string) => {
    if (!editingRule) return;
    
    setEditingRule(prev => ({
      ...prev!,
      conditions: prev!.conditions.filter(condition => condition.id !== conditionId),
    }));
  };

  const deleteAction = (actionId: string) => {
    if (!editingRule) return;
    
    setEditingRule(prev => ({
      ...prev!,
      actions: prev!.actions.filter(action => action.id !== actionId),
    }));
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage': return Percent;
      case 'fixed': return DollarSign;
      case 'tiered': return TrendingUp;
      case 'dynamic': return Zap;
      default: return Calculator;
    }
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'percentage': return 'text-blue-600';
      case 'fixed': return 'text-green-600';
      case 'tiered': return 'text-purple-600';
      case 'dynamic': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Pricing Rules"
        description="Configure automated pricing rules and logic"
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={handleCreateRule}>
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
            </Button>
          </div>
        }
      />

      {/* Search and Stats */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pricing rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Total: {filteredRules.length}</span>
          <span>Active: {filteredRules.filter(r => r.isActive).length}</span>
          <span>Applications: {filteredRules.reduce((sum, r) => sum + r.usage.timesApplied, 0)}</span>
        </div>
      </div>

      {/* Rules Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Conditions</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRules.map((rule) => {
              const RuleIcon = getRuleTypeIcon(rule.type);
              return (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        {rule.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <RuleIcon className={cn("h-4 w-4", getRuleTypeColor(rule.type))} />
                      <Badge variant="outline" className="capitalize">
                        {rule.type}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{rule.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rule.conditions.slice(0, 2).map((condition, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {condition.type.replace('_', ' ')}
                        </Badge>
                      ))}
                      {rule.conditions.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{rule.conditions.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {rule.usage.timesApplied} times
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {rule.usage.impactedProducts} products
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(rule.id)}
                    >
                      <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRule(rule)}
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
                            <AlertDialogTitle>Delete Pricing Rule</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{rule.name}"? This action cannot be undone.
                              {rule.usage.timesApplied > 0 && (
                                <div className="mt-2 text-orange-600">
                                  Warning: This rule has been applied {rule.usage.timesApplied} times.
                                </div>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRule(rule.id)}
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
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule && pricingRules.find(r => r.id === editingRule.id) ? 'Edit' : 'Create'} Pricing Rule
            </DialogTitle>
            <DialogDescription>
              Configure automated pricing logic with conditions and actions
            </DialogDescription>
          </DialogHeader>
          
          {editingRule && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="conditions">Conditions</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Rule Name</Label>
                    <Input
                      id="name"
                      value={editingRule.name}
                      onChange={(e) => setEditingRule(prev => ({ ...prev!, name: e.target.value }))}
                      placeholder="e.g., Holiday Season Markup"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Rule Type</Label>
                    <Select 
                      value={editingRule.type} 
                      onValueChange={(value: 'percentage' | 'fixed' | 'tiered' | 'dynamic') => 
                        setEditingRule(prev => ({ ...prev!, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="tiered">Tiered</SelectItem>
                        <SelectItem value="dynamic">Dynamic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={editingRule.priority}
                      onChange={(e) => setEditingRule(prev => ({ ...prev!, priority: parseInt(e.target.value) }))}
                      min="1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="isActive">Status</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={editingRule.isActive}
                        onCheckedChange={(checked) => setEditingRule(prev => ({ ...prev!, isActive: checked }))}
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editingRule.description}
                      onChange={(e) => setEditingRule(prev => ({ ...prev!, description: e.target.value }))}
                      placeholder="Describe when and how this rule should be applied"
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="conditions" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Rule Conditions</h3>
                  <Button onClick={addCondition} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Condition
                  </Button>
                </div>
                
                {editingRule.conditions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No conditions configured. Add a condition to define when this rule applies.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editingRule.conditions.map((condition, index) => (
                      <Card key={condition.id} className="p-4">
                        <div className="grid gap-4 md:grid-cols-5">
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select 
                              value={condition.type} 
                              onValueChange={(value: any) => updateCondition(condition.id, { type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="product_category">Product Category</SelectItem>
                                <SelectItem value="facility_type">Facility Type</SelectItem>
                                <SelectItem value="cluster">Cluster</SelectItem>
                                <SelectItem value="quantity">Quantity</SelectItem>
                                <SelectItem value="date_range">Date Range</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Operator</Label>
                            <Select 
                              value={condition.operator} 
                              onValueChange={(value: any) => updateCondition(condition.id, { operator: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="not_equals">Not Equals</SelectItem>
                                <SelectItem value="greater_than">Greater Than</SelectItem>
                                <SelectItem value="less_than">Less Than</SelectItem>
                                <SelectItem value="in">In</SelectItem>
                                <SelectItem value="between">Between</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Value</Label>
                            <Input
                              value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}
                              onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                              placeholder="Enter value"
                            />
                          </div>
                          
                          {index > 0 && (
                            <div className="space-y-2">
                              <Label>Logic</Label>
                              <Select 
                                value={condition.logicalOperator || 'AND'} 
                                onValueChange={(value: 'AND' | 'OR') => updateCondition(condition.id, { logicalOperator: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AND">AND</SelectItem>
                                  <SelectItem value="OR">OR</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <Label>Actions</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCondition(condition.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Rule Actions</h3>
                  <Button onClick={addAction} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Action
                  </Button>
                </div>
                
                {editingRule.actions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No actions configured. Add an action to define what happens when conditions are met.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editingRule.actions.map((action) => (
                      <Card key={action.id} className="p-4">
                        <div className="grid gap-4 md:grid-cols-5">
                          <div className="space-y-2">
                            <Label>Action Type</Label>
                            <Select 
                              value={action.type} 
                              onValueChange={(value: any) => updateAction(action.id, { type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="adjust_price">Adjust Price</SelectItem>
                                <SelectItem value="set_price">Set Price</SelectItem>
                                <SelectItem value="add_margin">Add Margin</SelectItem>
                                <SelectItem value="set_margin">Set Margin</SelectItem>
                                <SelectItem value="round_price">Round Price</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Value</Label>
                            <Input
                              type="number"
                              value={action.value}
                              onChange={(e) => updateAction(action.id, { value: parseFloat(e.target.value) })}
                              placeholder="0"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Unit</Label>
                            <Select 
                              value={action.unit} 
                              onValueChange={(value: any) => updateAction(action.id, { unit: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="fixed">Fixed</SelectItem>
                                <SelectItem value="currency">Currency</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Target</Label>
                            <Select 
                              value={action.target} 
                              onValueChange={(value: any) => updateAction(action.id, { target: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="base_price">Base Price</SelectItem>
                                <SelectItem value="final_price">Final Price</SelectItem>
                                <SelectItem value="margin">Margin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Actions</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAction(action.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Recurring</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingRule.schedule?.recurring || false}
                        onCheckedChange={(checked) => setEditingRule(prev => ({
                          ...prev!,
                          schedule: { ...prev!.schedule, recurring: checked } as RuleSchedule
                        }))}
                      />
                      <Label>Enable recurring</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Recurrence Pattern</Label>
                    <Select 
                      value={editingRule.schedule?.recurringPattern || 'daily'}
                      onValueChange={(value: any) => setEditingRule(prev => ({
                        ...prev!,
                        schedule: { ...prev!.schedule, recurringPattern: value } as RuleSchedule
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Settings className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Rule
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}