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
  Shield, 
  Users, 
  Calendar, 
  DollarSign,
  Target,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Layers,
  Filter,
  Clock,
  Package,
  MapPin
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ProductWithVariants, ProductVariant, PromotionTarget } from '@/types/variant-types';

interface PromotionRule {
  id: string;
  name: string;
  description: string;
  type: 'eligibility' | 'usage' | 'stacking' | 'geographic' | 'product' | 'time';
  priority: number;
  isActive: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  createdAt: string;
  lastModified: string;
}

interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: string | number | string[];
  logicalOperator?: 'AND' | 'OR';
  variantId?: string;
}

interface RuleAction {
  type: 'allow' | 'deny' | 'modify' | 'limit' | 'redirect';
  value?: string | number;
  message?: string;
}

const mockRules: PromotionRule[] = [
  {
    id: '1',
    name: 'VIP Customer Only',
    description: 'Restrict certain promotions to VIP customers only',
    type: 'eligibility',
    priority: 1,
    isActive: true,
    conditions: [
      {
        field: 'customer_tier',
        operator: 'equals',
        value: 'VIP'
      }
    ],
    actions: [
      {
        type: 'allow',
        message: 'VIP promotion activated'
      }
    ],
    createdAt: '2024-01-15',
    lastModified: '2024-03-10'
  },
  {
    id: '2',
    name: 'One Per Customer',
    description: 'Limit discount usage to one per customer',
    type: 'usage',
    priority: 2,
    isActive: true,
    conditions: [
      {
        field: 'usage_count',
        operator: 'greater_than',
        value: 0
      }
    ],
    actions: [
      {
        type: 'deny',
        message: 'You have already used this discount'
      }
    ],
    createdAt: '2024-01-20',
    lastModified: '2024-02-28'
  },
  {
    id: '3',
    name: 'No Stacking with Sale Items',
    description: 'Prevent discount stacking with sale items',
    type: 'stacking',
    priority: 3,
    isActive: true,
    conditions: [
      {
        field: 'item_status',
        operator: 'equals',
        value: 'on_sale'
      }
    ],
    actions: [
      {
        type: 'deny',
        message: 'Cannot be combined with sale items'
      }
    ],
    createdAt: '2024-02-01',
    lastModified: '2024-02-01'
  },
  {
    id: '4',
    name: 'Geographic Restriction',
    description: 'Restrict certain promotions to specific regions',
    type: 'geographic',
    priority: 4,
    isActive: true,
    conditions: [
      {
        field: 'customer_country',
        operator: 'not_in',
        value: ['US', 'CA', 'UK']
      }
    ],
    actions: [
      {
        type: 'deny',
        message: 'This promotion is not available in your region'
      }
    ],
    createdAt: '2024-02-15',
    lastModified: '2024-03-05'
  }
];

const Rules: React.FC = () => {
  const { toast } = useToast();
  const [rules, setRules] = useState<PromotionRule[]>(mockRules);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<PromotionRule | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [newRule, setNewRule] = useState<Partial<PromotionRule>>({
    name: '',
    description: '',
    type: 'eligibility',
    priority: 1,
    isActive: true,
    conditions: [],
    actions: []
  });

  const [currentCondition, setCurrentCondition] = useState<RuleCondition>({
    field: '',
    operator: 'equals',
    value: ''
  });

  const [currentAction, setCurrentAction] = useState<RuleAction>({
    type: 'allow',
    value: '',
    message: ''
  });

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || rule.type === filterType;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && rule.isActive) ||
                         (filterStatus === 'inactive' && !rule.isActive);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreateRule = () => {
    if (!newRule.name || !newRule.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const rule: PromotionRule = {
      id: Date.now().toString(),
      name: newRule.name!,
      description: newRule.description!,
      type: newRule.type as PromotionRule['type'],
      priority: newRule.priority || 1,
      isActive: newRule.isActive || true,
      conditions: newRule.conditions || [],
      actions: newRule.actions || [],
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0]
    };

    setRules([...rules, rule]);
    setShowCreateDialog(false);
    resetNewRule();

    toast({
      title: "Success",
      description: "Rule created successfully"
    });
  };

  const resetNewRule = () => {
    setNewRule({
      name: '',
      description: '',
      type: 'eligibility',
      priority: 1,
      isActive: true,
      conditions: [],
      actions: []
    });
    setCurrentCondition({
      field: '',
      operator: 'equals',
      value: ''
    });
    setCurrentAction({
      type: 'allow',
      value: '',
      message: ''
    });
  };

  const handleAddCondition = () => {
    if (!currentCondition.field || !currentCondition.value) {
      toast({
        title: "Validation Error",
        description: "Please complete the condition",
        variant: "destructive"
      });
      return;
    }

    const updatedConditions = [...(newRule.conditions || []), currentCondition];
    setNewRule({...newRule, conditions: updatedConditions});
    setCurrentCondition({
      field: '',
      operator: 'equals',
      value: ''
    });
  };

  const handleAddAction = () => {
    if (!currentAction.type) {
      toast({
        title: "Validation Error",
        description: "Please select an action type",
        variant: "destructive"
      });
      return;
    }

    const updatedActions = [...(newRule.actions || []), currentAction];
    setNewRule({...newRule, actions: updatedActions});
    setCurrentAction({
      type: 'allow',
      value: '',
      message: ''
    });
  };

  const handleRemoveCondition = (index: number) => {
    const updatedConditions = newRule.conditions?.filter((_, i) => i !== index) || [];
    setNewRule({...newRule, conditions: updatedConditions});
  };

  const handleRemoveAction = (index: number) => {
    const updatedActions = newRule.actions?.filter((_, i) => i !== index) || [];
    setNewRule({...newRule, actions: updatedActions});
  };

  const handleToggleStatus = (id: string) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, isActive: !rule.isActive, lastModified: new Date().toISOString().split('T')[0] } : rule
    ));
    
    toast({
      title: "Status Updated",
      description: "Rule status has been updated"
    });
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
    toast({
      title: "Rule Deleted",
      description: "Rule has been removed"
    });
  };

  const handleEditRule = (rule: PromotionRule) => {
    setEditingRule(rule);
    setNewRule(rule);
    setShowCreateDialog(true);
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'eligibility': return Users;
      case 'usage': return Shield;
      case 'stacking': return Layers;
      case 'geographic': return MapPin;
      case 'product': return Package;
      case 'time': return Clock;
      default: return Settings;
    }
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'eligibility': return 'bg-blue-100 text-blue-800';
      case 'usage': return 'bg-green-100 text-green-800';
      case 'stacking': return 'bg-purple-100 text-purple-800';
      case 'geographic': return 'bg-orange-100 text-orange-800';
      case 'product': return 'bg-pink-100 text-pink-800';
      case 'time': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionTypeIcon = (type: string) => {
    switch (type) {
      case 'allow': return CheckCircle;
      case 'deny': return XCircle;
      case 'modify': return Edit;
      case 'limit': return Shield;
      case 'redirect': return Target;
      default: return Settings;
    }
  };

  const getActionTypeColor = (type: string) => {
    switch (type) {
      case 'allow': return 'text-green-600';
      case 'deny': return 'text-red-600';
      case 'modify': return 'text-blue-600';
      case 'limit': return 'text-orange-600';
      case 'redirect': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const formatConditionValue = (condition: RuleCondition) => {
    if (Array.isArray(condition.value)) {
      return condition.value.join(', ');
    }
    return condition.value.toString();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotion Rules</h1>
          <p className="text-muted-foreground">
            Define rules and conditions for promotional offers
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Rule' : 'Create New Rule'}
              </DialogTitle>
              <DialogDescription>
                Define conditions and actions for promotion rules
              </DialogDescription>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="conditions">Conditions</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ruleName">Rule Name *</Label>
                    <Input
                      id="ruleName"
                      placeholder="e.g., VIP Customer Only"
                      value={newRule.name}
                      onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ruleType">Rule Type</Label>
                    <Select 
                      value={newRule.type} 
                      onValueChange={(value: PromotionRule['type']) => setNewRule({...newRule, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eligibility">Eligibility</SelectItem>
                        <SelectItem value="usage">Usage Limit</SelectItem>
                        <SelectItem value="stacking">Stacking Rules</SelectItem>
                        <SelectItem value="geographic">Geographic</SelectItem>
                        <SelectItem value="product">Product-based</SelectItem>
                        <SelectItem value="time">Time-based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ruleDescription">Description *</Label>
                  <Textarea
                    id="ruleDescription"
                    placeholder="Describe what this rule does..."
                    value={newRule.description}
                    onChange={(e) => setNewRule({...newRule, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rulePriority">Priority</Label>
                    <Input
                      id="rulePriority"
                      type="number"
                      min="1"
                      max="100"
                      value={newRule.priority}
                      onChange={(e) => setNewRule({...newRule, priority: Number(e.target.value)})}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower numbers = higher priority
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 mt-6">
                    <Switch
                      id="ruleActive"
                      checked={newRule.isActive}
                      onCheckedChange={(checked) => setNewRule({...newRule, isActive: checked})}
                    />
                    <Label htmlFor="ruleActive">Active</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="conditions" className="space-y-4">
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Add Condition</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="conditionField">Field</Label>
                        <Select 
                          value={currentCondition.field} 
                          onValueChange={(value) => setCurrentCondition({...currentCondition, field: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer_tier">Customer Tier</SelectItem>
                            <SelectItem value="order_total">Order Total</SelectItem>
                            <SelectItem value="usage_count">Usage Count</SelectItem>
                            <SelectItem value="customer_country">Customer Country</SelectItem>
                            <SelectItem value="product_category">Product Category</SelectItem>
                            <SelectItem value="product_variant">Product Variant</SelectItem>
                            <SelectItem value="variant_availability">Variant Availability</SelectItem>
                            <SelectItem value="item_status">Item Status</SelectItem>
                            <SelectItem value="customer_age">Customer Age</SelectItem>
                            <SelectItem value="order_date">Order Date</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="conditionOperator">Operator</Label>
                        <Select 
                          value={currentCondition.operator} 
                          onValueChange={(value: RuleCondition['operator']) => setCurrentCondition({...currentCondition, operator: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select operator" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="not_equals">Not Equals</SelectItem>
                            <SelectItem value="greater_than">Greater Than</SelectItem>
                            <SelectItem value="less_than">Less Than</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="in">In</SelectItem>
                            <SelectItem value="not_in">Not In</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="conditionValue">Value</Label>
                        <Input
                          id="conditionValue"
                          placeholder="Enter value"
                          value={currentCondition.value}
                          onChange={(e) => setCurrentCondition({...currentCondition, value: e.target.value})}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleAddCondition}
                      className="mt-3"
                      size="sm"
                    >
                      Add Condition
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Current Conditions</h4>
                    {newRule.conditions && newRule.conditions.length > 0 ? (
                      <div className="space-y-2">
                        {newRule.conditions.map((condition, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="text-sm">
                              <span className="font-medium">{condition.field}</span>
                              <span className="mx-2 text-muted-foreground">{condition.operator}</span>
                              <span className="font-medium">{formatConditionValue(condition)}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCondition(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No conditions added yet</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Add Action</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="actionType">Action Type</Label>
                        <Select 
                          value={currentAction.type} 
                          onValueChange={(value: RuleAction['type']) => setCurrentAction({...currentAction, type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="allow">Allow</SelectItem>
                            <SelectItem value="deny">Deny</SelectItem>
                            <SelectItem value="modify">Modify</SelectItem>
                            <SelectItem value="limit">Limit</SelectItem>
                            <SelectItem value="redirect">Redirect</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="actionValue">Value (Optional)</Label>
                        <Input
                          id="actionValue"
                          placeholder="Enter value if needed"
                          value={currentAction.value}
                          onChange={(e) => setCurrentAction({...currentAction, value: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="actionMessage">Message (Optional)</Label>
                      <Input
                        id="actionMessage"
                        placeholder="Message to display to user"
                        value={currentAction.message}
                        onChange={(e) => setCurrentAction({...currentAction, message: e.target.value})}
                      />
                    </div>
                    <Button 
                      onClick={handleAddAction}
                      className="mt-3"
                      size="sm"
                    >
                      Add Action
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Current Actions</h4>
                    {newRule.actions && newRule.actions.length > 0 ? (
                      <div className="space-y-2">
                        {newRule.actions.map((action, index) => {
                          const ActionIcon = getActionTypeIcon(action.type);
                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-2">
                                <ActionIcon className={cn("h-4 w-4", getActionTypeColor(action.type))} />
                                <div className="text-sm">
                                  <span className="font-medium capitalize">{action.type}</span>
                                  {action.value && (
                                    <span className="mx-2 text-muted-foreground">Value: {action.value}</span>
                                  )}
                                  {action.message && (
                                    <div className="text-xs text-muted-foreground">"{action.message}"</div>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveAction(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No actions added yet</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowCreateDialog(false);
                setEditingRule(null);
                resetNewRule();
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateRule}>
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rule Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
            <p className="text-xs text-muted-foreground">
              {rules.filter(r => r.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligibility Rules</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rules.filter(r => r.type === 'eligibility').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Customer restrictions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage Rules</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rules.filter(r => r.type === 'usage').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Usage limitations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stacking Rules</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rules.filter(r => r.type === 'stacking').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Combination rules
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
                placeholder="Search rules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="eligibility">Eligibility</SelectItem>
                <SelectItem value="usage">Usage</SelectItem>
                <SelectItem value="stacking">Stacking</SelectItem>
                <SelectItem value="geographic">Geographic</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="time">Time</SelectItem>
              </SelectContent>
            </Select>
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
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <div className="space-y-4">
        {filteredRules.sort((a, b) => a.priority - b.priority).map((rule) => {
          const TypeIcon = getRuleTypeIcon(rule.type);
          
          return (
            <Card key={rule.id} className={cn(
              "transition-all duration-200 hover:shadow-md",
              !rule.isActive && "opacity-60"
            )}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      getRuleTypeColor(rule.type)
                    )}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{rule.name}</h3>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Priority {rule.priority}
                    </Badge>
                    <Badge variant={rule.isActive ? "default" : "secondary"}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRule(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(rule.id)}
                      >
                        {rule.isActive ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Conditions</h4>
                    {rule.conditions.length > 0 ? (
                      <div className="space-y-1">
                        {rule.conditions.map((condition, index) => (
                          <div key={index} className="text-sm p-2 bg-muted rounded">
                            <span className="font-medium">{condition.field}</span>
                            <span className="mx-2 text-muted-foreground">{condition.operator}</span>
                            <span>{formatConditionValue(condition)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No conditions</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Actions</h4>
                    {rule.actions.length > 0 ? (
                      <div className="space-y-1">
                        {rule.actions.map((action, index) => {
                          const ActionIcon = getActionTypeIcon(action.type);
                          return (
                            <div key={index} className="text-sm p-2 bg-muted rounded flex items-center gap-2">
                              <ActionIcon className={cn("h-4 w-4", getActionTypeColor(action.type))} />
                              <span className="font-medium capitalize">{action.type}</span>
                              {action.message && (
                                <span className="text-muted-foreground">- {action.message}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No actions</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 text-xs text-muted-foreground">
                  Created: {rule.createdAt} | Last modified: {rule.lastModified}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredRules.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No rules found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first promotion rule to get started
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Rules;