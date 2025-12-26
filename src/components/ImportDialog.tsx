import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImportConflict, ImportResult } from '@/lib/csv-utils';
import { AlertTriangle, Check, X, FileText } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  result: ImportResult | null;
  onProceed: (conflicts: ImportConflict[]) => void;
  onCancel: () => void;
}

export function ImportDialog({ open, onClose, result, onProceed, onCancel }: ImportDialogProps) {
  const [selectedConflicts, setSelectedConflicts] = useState<ImportConflict[]>([]);

  if (!result) return null;

  const handleConflictToggle = (conflict: ImportConflict) => {
    setSelectedConflicts(prev => 
      prev.includes(conflict)
        ? prev.filter(c => c !== conflict)
        : [...prev, conflict]
    );
  };

  const hasConflicts = result.conflicts.length > 0;
  const hasErrors = result.errors.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Results
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{result.processedRows}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Skipped</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{result.skippedRows}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Errors */}
          {hasErrors && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {result.errors.length} errors found. Please fix these issues before proceeding.
              </AlertDescription>
            </Alert>
          )}

          {result.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-red-600">Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell>{error.field}</TableCell>
                          <TableCell>{error.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-orange-600">Warnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.warnings.map((warning, index) => (
                        <TableRow key={index}>
                          <TableCell>{warning.row}</TableCell>
                          <TableCell>{warning.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conflicts */}
          {hasConflicts && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {result.conflicts.length} conflicts detected. Select which conflicts to resolve:
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Option Conflicts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.conflicts.map((conflict, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{conflict.type}</Badge>
                            <span className="font-medium">Product: {conflict.productId}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {conflict.affectedRows.length} rows affected
                            </span>
                            <Button
                              variant={selectedConflicts.includes(conflict) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleConflictToggle(conflict)}
                            >
                              {selectedConflicts.includes(conflict) ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium mb-1">Existing Options:</div>
                            <div className="space-y-1">
                              {conflict.existingOptions.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <Badge variant="secondary">{option.name}</Badge>
                                  <span className="text-muted-foreground">
                                    {option.values.join(', ')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium mb-1">New Options:</div>
                            <div className="space-y-1">
                              {conflict.newOptions.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <Badge variant="default">{option.name}</Badge>
                                  <span className="text-muted-foreground">
                                    {option.values.join(', ')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {!hasErrors && (
            <Button 
              onClick={() => onProceed(selectedConflicts)}
              disabled={hasConflicts && selectedConflicts.length === 0}
            >
              {hasConflicts ? 'Proceed with Selected' : 'Import'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}