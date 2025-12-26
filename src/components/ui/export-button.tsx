import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonProps {
  onExport: () => Promise<Blob>;
  filename: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export function ExportButton({
  onExport,
  filename,
  variant = "outline",
  size = "default",
  className,
  children,
  disabled = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (isExporting || disabled) return;

    setIsExporting(true);
    try {
      const blob = await onExport();
      
      // Detect file extension from blob type
      let fileExtension = '';
      if (blob.type) {
        if (blob.type.includes('csv') || blob.type === 'text/csv') {
          fileExtension = '.csv';
        } else if (blob.type.includes('excel') || blob.type.includes('spreadsheet') || 
                   blob.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          fileExtension = '.xlsx';
        } else if (blob.type.includes('json') || blob.type === 'application/json') {
          fileExtension = '.json';
        } else if (blob.type.includes('pdf') || blob.type === 'application/pdf') {
          fileExtension = '.pdf';
        } else if (blob.type.includes('text') || blob.type === 'text/plain') {
          fileExtension = '.txt';
        }
      }
      
      // Remove any existing extension from filename and add the detected one
      const baseFilename = filename.replace(/\.[^/.]+$/, '');
      const finalFilename = baseFilename + fileExtension;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Data exported as ${finalFilename} successfully.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || isExporting}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Upload className="h-4 w-4" />
      )}
      {children && <span className="ml-2">{children}</span>}
    </Button>
  );
}
