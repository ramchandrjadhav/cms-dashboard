import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/ui/page-header';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiService } from '@/services/api';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Tag,
    CheckCircle,
    XCircle,
    Check,
    ChevronsUpDown,
    GripVerticalIcon
} from 'lucide-react';
import { Attribute, AttributeValue, AttributeRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';

const CreateEditAttribute = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);
    const { toast } = useToast();

    const [attribute, setAttribute] = useState({
        name: '',
        description: '',
        is_required: false,
        is_active: true,
        attribute_type: 'text' as Attribute['attribute_type'],
        rank: 0,
    });

    const [values, setValues] = useState<{ value: string, rank: number, is_active: boolean }[]>([]);
    const [newValue, setNewValue] = useState({ value: '' });
    const [open, setOpen] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const attributeTypeOptions = [
        { value: 'text', label: 'Text' },
        { value: 'textarea', label: 'Textarea' },
        { value: 'number', label: 'Number' },
        { value: 'boolean', label: 'Boolean' },
        { value: 'select', label: 'Select' },
        { value: 'multiselect', label: 'Multi-select' },
        { value: 'date', label: 'Date' },
        { value: 'datetime', label: 'Date & Time' },
        { value: 'url', label: 'URL' },
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone' },
        { value: 'file', label: 'File' },
        { value: 'reference', label: 'Reference' },
    ];

    // Fetch attribute data for editing
    const { data: attributeData, isLoading: isLoadingAttribute } = useQuery({
        queryKey: ['attribute', id],
        queryFn: () => ApiService.getAttribute(Number(id!)),
        enabled: isEdit && Boolean(id),
    });

    // Update form when attribute data is loaded
    useEffect(() => {
        if (attributeData) {
            setAttribute({
                name: attributeData.name,
                description: attributeData.description,
                is_required: attributeData.is_required,
                is_active: attributeData.is_active,
                attribute_type: attributeData.attribute_type,
                rank: attributeData.rank,
            });
            // Convert API values to form format
            const formValues = attributeData.values?.map((val, index) => ({
                value: val.value,
                rank: val.rank || index + 1,
                is_active: val.is_active
            })) || [];
            setValues(formValues);
        }
    }, [attributeData]);

    // Create/Update mutations
    const createMutation = useMutation({
        mutationFn: (data: AttributeRequest) => ApiService.createAttribute(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attributes'] });
            toast({
                title: "Success",
                description: "Attribute created successfully",
            });
            navigate('/configuration/attributes');
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to create attribute",
                variant: "destructive",
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: AttributeRequest }) =>
            ApiService.updateAttribute(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attributes'] });
            queryClient.invalidateQueries({ queryKey: ['attribute', id] });
            toast({
                title: "Success",
                description: "Attribute updated successfully",
            });
            navigate('/configuration/attributes');
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to update attribute",
                variant: "destructive",
            });
        },
    });

    const handleSave = async () => {
        if (!attribute.name) {
            toast({
                title: "Error",
                description: "Name is required",
                variant: "destructive",
            });
            return;
        }

        // Prepare values in the correct API format
        const apiValues = values.map((val, index) => ({
            value: val.value,
            rank: val.rank || index + 1,
            is_active: val.is_active
        }));

        const attributeData: AttributeRequest = {
            name: attribute.name,
            description: attribute.description,
            attribute_type: attribute.attribute_type,
            is_required: attribute.is_required,
            is_active: attribute.is_active,
            rank: attribute.rank,
            values: apiValues,
        };

        if (isEdit && id) {
            updateMutation.mutate({ id: Number(id), data: attributeData });
        } else {
            createMutation.mutate(attributeData);
        }
    };

    const handleAddValue = () => {
        if (!newValue.value) {
            toast({
                title: "Error",
                description: "Value is required",
                variant: "destructive",
            });
            return;
        }

        const value = {
            value: newValue.value,
            rank: values.length + 1,
            is_active: true,
        };

        setValues([...values, value]);
        setNewValue({ value: '' });
    };

    const handleRemoveValue = (index: number) => {
        setValues(values.filter((_, i) => i !== index));
    };

    const handleToggleValueStatus = (index: number) => {
        setValues(values.map((v, i) =>
            i === index ? { ...v, is_active: !v.is_active } : v
        ));
    };

    const getTypeColor = (type: Attribute['attribute_type']) => {
        const colors = {
            select: 'bg-blue-100 text-blue-800',
            multiselect: 'bg-purple-100 text-purple-800',
            boolean: 'bg-green-100 text-green-800',
            date: 'bg-orange-100 text-orange-800',
            datetime: 'bg-orange-100 text-orange-800',
            number: 'bg-red-100 text-red-800',
            text: 'bg-gray-100 text-gray-800',
            textarea: 'bg-gray-100 text-gray-800',
            url: 'bg-cyan-100 text-cyan-800',
            email: 'bg-cyan-100 text-cyan-800',
            phone: 'bg-cyan-100 text-cyan-800',
            file: 'bg-yellow-100 text-yellow-800',
            reference: 'bg-indigo-100 text-indigo-800',
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    const requiresValues = ['select', 'multiselect'].includes(attribute.attribute_type);
    const isNumericType = ['number'].includes(attribute.attribute_type);
    const isDateType = ['date', 'datetime'].includes(attribute.attribute_type);
    const isBooleanType = ['boolean'].includes(attribute.attribute_type);

    if (isEdit && isLoadingAttribute) {
        return (
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <PageHeader
                title={isEdit ? 'Edit Attribute' : 'Create Attribute'}
                description={isEdit ? 'Update attribute details and values' : 'Create a new attribute for your products'}
                actions={
                    <Button variant="outline" onClick={() => navigate('/configuration/attributes')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Attributes
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                            <CardDescription>
                                Define the basic properties of your attribute
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={attribute.name}
                                    onChange={(e) => setAttribute({ ...attribute, name: e.target.value })}
                                    placeholder="e.g., Color, Size, Material"
                                />
                            </div>

                            <div>
                                <Label htmlFor="type">Attribute Type *</Label>
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={open}
                                            className="w-full justify-between"
                                        >
                                            {attributeTypeOptions.find((option) => option.value === attribute.attribute_type)?.label || "Select attribute type..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search attribute type..." />
                                            <CommandList>
                                                <CommandEmpty>No attribute type found.</CommandEmpty>
                                                <CommandGroup>
                                                    {attributeTypeOptions.map((option) => (
                                                        <CommandItem
                                                            key={option.value}
                                                            value={option.value}
                                                            onSelect={(currentValue) => {
                                                                setAttribute({ ...attribute, attribute_type: currentValue as Attribute['attribute_type'] });
                                                                setOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={`mr-2 h-4 w-4 ${
                                                                    attribute.attribute_type === option.value ? "opacity-100" : "opacity-0"
                                                                }`}
                                                            />
                                                            {option.label}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <div className="mt-2">
                                    <Badge className={getTypeColor(attribute.attribute_type)}>
                                        {attributeTypeOptions.find((option) => option.value === attribute.attribute_type)?.label || attribute.attribute_type}
                                    </Badge>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={attribute.description}
                                    onChange={(e) => setAttribute({ ...attribute, description: e.target.value })}
                                    placeholder="Optional description for this attribute"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="required"
                                    checked={attribute.is_required}
                                    onCheckedChange={(checked) => setAttribute({ ...attribute, is_required: checked })}
                                />
                                <Label htmlFor="required">Required</Label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Dynamic UI based on attribute type */}
                    {requiresValues && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Attribute Values</CardTitle>
                                <CardDescription>
                                    Define the available options for this {attribute.attribute_type.toLowerCase()} attribute
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex space-x-2">
                                    <Input
                                        placeholder="Value (e.g., Red, Blue, Green)"
                                        value={newValue.value}
                                        onChange={(e) => setNewValue({ ...newValue, value: e.target.value })}
                                        className="flex-1"
                                    />
                                    <Button onClick={handleAddValue}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {values.map((value, index) => (
                                        <div
                                            key={index}
                                            className={`flex items-center justify-between p-3 border cursor-move rounded-lg ${dragIndex === index ? 'opacity-60' : ''}`}
                                            draggable
                                            onDragStart={() => setDragIndex(index)}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                if (dragIndex === null || dragIndex === index) return;
                                                const updated = [...values];
                                                const [moved] = updated.splice(dragIndex, 1);
                                                updated.splice(index, 0, moved);
                                                // Re-rank sequentially after provisional move
                                                const reRanked = updated.map((v, i) => ({ ...v, rank: i + 1 }));
                                                setValues(reRanked);
                                                setDragIndex(index);
                                            }}
                                            onDrop={() => setDragIndex(null)}
                                            onDragEnd={() => setDragIndex(null)}
                                        >
                                            <div className="flex items-center space-x-3">
                                            <div>
                                                    <GripVerticalIcon className="h-6 w-6 text-muted-foreground" />
                                                </div>
                                                <div>
                                               
                                                    <div className="font-medium">{value.value}</div>
                                                    <div className="text-sm text-muted-foreground">Rank: {value.rank}</div>
                                                </div>
                                                <Badge variant={value.is_active ? "default" : "secondary"}>
                                                    {value.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleValueStatus(index)}
                                                >
                                                    {value.is_active ? (
                                                        <XCircle className="h-4 w-4" />
                                                    ) : (
                                                        <CheckCircle className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveValue(index)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {values.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No values added yet. Add some values to get started.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Additional configuration based on type */}
                    {isNumericType && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Number Configuration</CardTitle>
                                <CardDescription>
                                    Configure number-specific settings
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="min_value">Minimum Value</Label>
                                        <Input
                                            id="min_value"
                                            type="number"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="max_value">Maximum Value</Label>
                                        <Input
                                            id="max_value"
                                            type="number"
                                            placeholder="1000"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="unit">Unit</Label>
                                    <Input
                                        id="unit"
                                        placeholder="e.g., grams, kg, cm"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {isDateType && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Date Configuration</CardTitle>
                                <CardDescription>
                                    Configure date-specific settings
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="min_date">Minimum Date</Label>
                                        <Input
                                            id="min_date"
                                            type="date"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="max_date">Maximum Date</Label>
                                        <Input
                                            id="max_date"
                                            type="date"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="is_active"
                                    checked={attribute.is_active}
                                    onCheckedChange={(checked) => setAttribute({ ...attribute, is_active: checked })}
                                />
                                <Label htmlFor="is_active">
                                    {attribute.is_active ? 'Active' : 'Inactive'}
                                </Label>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                            <CardDescription>
                                How this attribute will appear
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Tag className="h-4 w-4" />
                                    <span className="font-medium">{attribute.name || 'Attribute Name'}</span>
                                    <Badge className={getTypeColor(attribute.attribute_type)}>
                                        {attribute.attribute_type}
                                    </Badge>
                                </div>
                                {attribute.description && (
                                    <p className="text-sm text-muted-foreground">
                                        {attribute.description}
                                    </p>
                                )}
                                {attribute.is_required && (
                                    <Badge variant="secondary" className="text-xs">Required</Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/configuration/attributes')}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={createMutation.isPending || updateMutation.isPending || isLoadingAttribute}
                            className="flex-1"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateEditAttribute;
