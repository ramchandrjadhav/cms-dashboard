import { useState, useEffect, useMemo } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Eye,
  Settings,
  Database,
  ArrowRight
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ImportFile {
  id: string;
  name: string;
  type: 'csv' | 'excel' | 'json';
  size: number;
  uploadedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recordsTotal: number;
  recordsValid: number;
  recordsInvalid: number;
  errors: ImportError[];
}

interface ImportError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ImportPreview {
  headers: string[];
  rows: string[][];
  mapping: Record<string, string>;
  validationResults: ValidationResult[];
}

interface ValidationResult {
  row: number;
  isValid: boolean;
  errors: ImportError[];
  data: Record<string, any>;
}

interface ImportTemplate {
  id: string;
  name: string;
  description: string;
  fields: TemplateField[];
  sampleData: Record<string, any>[];
}

interface TemplateField {
  name: string;
  required: boolean;
  type: 'text' | 'number' | 'boolean' | 'date';
  description: string;
  example: string;
}

const importTemplates: ImportTemplate[] = [
  {
    id: 'assignment-basic',
    name: 'Product-Facility Assignment',
    description: 'Basic assignment import with product and facility mapping',
    fields: [
      { name: 'Product SKU', required: true, type: 'text', description: 'Unique product identifier', example: 'SP-001' },
      { name: 'Facility Code', required: true, type: 'text', description: 'Facility identifier', example: 'DS-01' },
      { name: 'Is Stocked', required: true, type: 'boolean', description: 'Whether product is stocked', example: 'true' },
      { name: 'Quantity', required: false, type: 'number', description: 'Stock quantity', example: '100' },
      { name: 'Min Stock', required: false, type: 'number', description: 'Minimum stock level', example: '10' },
      { name: 'Max Stock', required: false, type: 'number', description: 'Maximum stock level', example: '500' },
    ],
    sampleData: [
      { 'Product SKU': 'SP-001', 'Facility Code': 'DS-01', 'Is Stocked': 'true', 'Quantity': '100', 'Min Stock': '10', 'Max Stock': '500' },
      { 'Product SKU': 'LU-002', 'Facility Code': 'CW-02', 'Is Stocked': 'true', 'Quantity': '50', 'Min Stock': '5', 'Max Stock': '200' },
    ]
  },
  {
    id: 'assignment-advanced',
    name: 'Advanced Assignment Import',
    description: 'Comprehensive assignment import with pricing and metadata',
    fields: [
      { name: 'Product SKU', required: true, type: 'text', description: 'Unique product identifier', example: 'SP-001' },
      { name: 'Facility Code', required: true, type: 'text', description: 'Facility identifier', example: 'DS-01' },
      { name: 'Is Stocked', required: true, type: 'boolean', description: 'Whether product is stocked', example: 'true' },
      { name: 'Quantity', required: false, type: 'number', description: 'Current stock quantity', example: '100' },
      { name: 'Price Override', required: false, type: 'number', description: 'Facility-specific price', example: '299.99' },
      { name: 'Priority', required: false, type: 'number', description: 'Stocking priority (1-10)', example: '5' },
      { name: 'Effective Date', required: false, type: 'date', description: 'When assignment takes effect', example: '2024-01-15' },
      { name: 'Notes', required: false, type: 'text', description: 'Additional notes', example: 'Seasonal item' },
    ],
    sampleData: [
      { 'Product SKU': 'SP-001', 'Facility Code': 'DS-01', 'Is Stocked': 'true', 'Quantity': '100', 'Price Override': '299.99', 'Priority': '5', 'Effective Date': '2024-01-15', 'Notes': 'High demand item' },
    ]
  }
];

const mockImportHistory: ImportFile[] = [
  {
    id: '1',
    name: 'Q1_assignment_update.csv',
    type: 'csv',
    size: 124800,
    uploadedAt: new Date('2024-01-15T10:30:00'),
    status: 'completed',
    recordsTotal: 1250,
    recordsValid: 1200,
    recordsInvalid: 50,
    errors: [
      { row: 45, field: 'Product SKU', message: 'Product not found', severity: 'error' },
      { row: 78, field: 'Facility Code', message: 'Facility inactive', severity: 'warning' },
    ]
  },
  {
    id: '2',
    name: 'facility_assignments.xlsx',
    type: 'excel',
    size: 89600,
    uploadedAt: new Date('2024-01-10T14:15:00'),
    status: 'completed',
    recordsTotal: 800,
    recordsValid: 800,
    recordsInvalid: 0,
    errors: []
  },
  {
    id: '3',
    name: 'bulk_update_failed.csv',
    type: 'csv',
    size: 56700,
    uploadedAt: new Date('2024-01-08T16:45:00'),
    status: 'failed',
    recordsTotal: 500,
    recordsValid: 0,
    recordsInvalid: 500,
    errors: [
      { row: 1, field: 'Product SKU', message: 'Invalid header format', severity: 'error' },
    ]
  }
];

export default function AssignmentImport() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<ImportTemplate | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importHistory] = useState<ImportFile[]>(mockImportHistory);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      processFilePreview(file);
    }
  };

  const processFilePreview = (file: File) => {
    // Simulate file processing
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1, 11).map(line => line.split(',').map(cell => cell.trim()));
      
      // Create initial mapping
      const mapping: Record<string, string> = {};
      if (selectedTemplate) {
        selectedTemplate.fields.forEach(field => {
          const matchingHeader = headers.find(h => 
            h.toLowerCase().includes(field.name.toLowerCase()) ||
            field.name.toLowerCase().includes(h.toLowerCase())
          );
          if (matchingHeader) {
            mapping[field.name] = matchingHeader;
          }
        });
      }
      
      setImportPreview({
        headers,
        rows,
        mapping,
        validationResults: []
      });
      setShowPreviewDialog(true);
    };
    reader.readAsText(file);
  };

  const validateImport = () => {
    if (!importPreview || !selectedTemplate) return;
    
    const validationResults: ValidationResult[] = [];
    
    importPreview.rows.forEach((row, index) => {
      const errors: ImportError[] = [];
      const data: Record<string, any> = {};
      
      selectedTemplate.fields.forEach(field => {
        const headerIndex = importPreview.headers.indexOf(importPreview.mapping[field.name]);
        const value = headerIndex >= 0 ? row[headerIndex] : '';
        
        data[field.name] = value;
        
        if (field.required && !value) {
          errors.push({
            row: index + 2,
            field: field.name,
            message: `${field.name} is required`,
            severity: 'error'
          });
        }
        
        if (value && field.type === 'number' && isNaN(Number(value))) {
          errors.push({
            row: index + 2,
            field: field.name,
            message: `${field.name} must be a number`,
            severity: 'error'
          });
        }
        
        if (value && field.type === 'boolean' && !['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase())) {
          errors.push({
            row: index + 2,
            field: field.name,
            message: `${field.name} must be true/false`,
            severity: 'error'
          });
        }
      });
      
      validationResults.push({
        row: index + 2,
        isValid: errors.length === 0,
        errors,
        data
      });
    });
    
    setImportPreview(prev => prev ? { ...prev, validationResults } : null);
  };

  const executeImport = async () => {
    if (!importPreview || !selectedTemplate) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    
    // Simulate import process
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setProcessingProgress((i / steps) * 100);
    }
    
    setIsProcessing(false);
    setShowPreviewDialog(false);
    
    toast({
      title: "Import Completed",
      description: `Successfully imported ${importPreview.rows.length} records`,
    });
    
    // Reset form
    setUploadedFile(null);
    setImportPreview(null);
  };

  const downloadTemplate = (template: ImportTemplate) => {
    const headers = template.fields.map(f => f.name);
    const sampleRows = template.sampleData.map(row => 
      headers.map(header => row[header] || '')
    );
    
    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_').toLowerCase()}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'processing': return RefreshCw;
      case 'failed': return XCircle;
      default: return AlertTriangle;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Assignment Import"
        description="Import product-facility assignments in bulk from CSV or Excel files"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload & Import</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Select Import Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {importTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selectedTemplate?.id === template.id && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Fields:</span>
                          <Badge variant="outline">{template.fields.length}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Required:</span>
                          <Badge variant="outline">{template.fields.filter(f => f.required).length}</Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadTemplate(template);
                          }}
                          className="w-full"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Select File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={!selectedTemplate}
                  />
                  {!selectedTemplate && (
                    <p className="text-sm text-muted-foreground">
                      Please select a template first
                    </p>
                  )}
                </div>

                {uploadedFile && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <div className="font-medium">{uploadedFile.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatFileSize(uploadedFile.size)}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => setShowPreviewDialog(true)}
                          disabled={!importPreview}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Preview & Import
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Processing Status */}
          {isProcessing && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="font-medium">Processing Import...</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(processingProgress)}%
                    </span>
                  </div>
                  <Progress value={processingProgress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Available Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {importTemplates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => downloadTemplate(template)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Fields</h4>
                          <div className="grid gap-2 md:grid-cols-2">
                            {template.fields.map((field) => (
                              <div key={field.name} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                <Badge variant={field.required ? 'default' : 'secondary'}>
                                  {field.required ? 'Required' : 'Optional'}
                                </Badge>
                                <span className="font-medium">{field.name}</span>
                                <span className="text-sm text-muted-foreground">({field.type})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Sample Data</h4>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {template.fields.map((field) => (
                                    <TableHead key={field.name}>{field.name}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {template.sampleData.map((row, index) => (
                                  <TableRow key={index}>
                                    {template.fields.map((field) => (
                                      <TableCell key={field.name}>
                                        {row[field.name] || '-'}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importHistory.map((file) => {
                    const StatusIcon = getStatusIcon(file.status);
                    return (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">{file.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{file.type.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>{formatFileSize(file.size)}</TableCell>
                        <TableCell>{file.uploadedAt.toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon className={cn("h-4 w-4", getStatusColor(file.status))} />
                            <span className="capitalize">{file.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-green-600">{file.recordsValid}</span> valid,{' '}
                              <span className="text-red-600">{file.recordsInvalid}</span> invalid
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Total: {file.recordsTotal}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review your data and field mappings before importing
            </DialogDescription>
          </DialogHeader>
          
          {importPreview && selectedTemplate && (
            <div className="space-y-4">
              {/* Field Mapping */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Field Mapping</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedTemplate.fields.map((field) => (
                      <div key={field.name} className="flex items-center gap-2">
                        <Label className="w-1/3">{field.name}</Label>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Select
                          value={importPreview.mapping[field.name] || ''}
                          onValueChange={(value) => {
                            setImportPreview(prev => prev ? {
                              ...prev,
                              mapping: { ...prev.mapping, [field.name]: value }
                            } : null);
                          }}
                        >
                          <SelectTrigger className="w-2/3">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {importPreview.headers.map((header) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Data Preview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Data Preview</CardTitle>
                    <Button onClick={validateImport} variant="outline">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Validate Data
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          {selectedTemplate.fields.map((field) => (
                            <TableHead key={field.name}>{field.name}</TableHead>
                          ))}
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.rows.slice(0, 10).map((row, index) => {
                          const validation = importPreview.validationResults.find(v => v.row === index + 2);
                          return (
                            <TableRow key={index}>
                              <TableCell>{index + 2}</TableCell>
                              {selectedTemplate.fields.map((field) => {
                                const headerIndex = importPreview.headers.indexOf(importPreview.mapping[field.name]);
                                const value = headerIndex >= 0 ? row[headerIndex] : '';
                                return (
                                  <TableCell key={field.name}>
                                    {value || '-'}
                                  </TableCell>
                                );
                              })}
                              <TableCell>
                                {validation ? (
                                  <Badge variant={validation.isValid ? 'default' : 'destructive'}>
                                    {validation.isValid ? 'Valid' : 'Invalid'}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Pending</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={executeImport}
              disabled={isProcessing || !importPreview || importPreview.validationResults.some(v => !v.isValid)}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Execute Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}