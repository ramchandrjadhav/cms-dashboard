import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, Upload, Image as ImageIcon, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ApiService } from '@/services/api';

interface UploadedFile {
    name: string;
    file_path: string;
    url: string;
    file: File;
}

const ImageUpload: React.FC = () => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragOver, setIsDragOver] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files).filter(file =>
            file.type.startsWith('image/')
        );

        if (files.length > 0) {
            setSelectedFiles(prev => [...prev, ...files]);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []).filter(file =>
            file.type.startsWith('image/')
        );

        if (files.length > 0) {
            setSelectedFiles(prev => [...prev, ...files]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            toast({
                title: "No files selected",
                description: "Please select at least one image to upload.",
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        let progressInterval: NodeJS.Timeout | null = null;

        try {
            // Simulate progress
            progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        if (progressInterval) clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 200);

            const response = await ApiService.uploadImages(selectedFiles);

            if (progressInterval) clearInterval(progressInterval);
            setUploadProgress(100);

            // Transform the response to match our interface
            // The API service already returns res.data.files, so response is the files array
            const files = Array.isArray(response) ? response : (response?.files || []);

            const filesWithPaths = files.map((fileData: any, index: number) => ({
                name: fileData?.name?.replace(/\.[^/.]+$/, "") || `file_${index}`, // Remove extension
                file_path: fileData?.file_path || '',
                url: fileData?.url || '',
                file: selectedFiles[index]
            }));

            setUploadedFiles(prev => [...prev, ...filesWithPaths]);

            const uploadCount = selectedFiles.length;
            setSelectedFiles([]);

            toast({
                title: "Upload successful",
                description: `${uploadCount} image(s) uploaded successfully.`,
            });

        } catch (error) {
            console.error('Upload error:', error);
            if (progressInterval) clearInterval(progressInterval);
            setUploadProgress(0);
            toast({
                title: "Upload failed",
                description: "Failed to upload images. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const clearUploadedFiles = () => {
        setUploadedFiles([]);
    };


    const copyToClipboard = async (text: string, index: number) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
            toast({
                title: "Copied to clipboard",
                description: "URL copied successfully!",
            });
        } catch (err) {
            console.error('Failed to copy: ', err);
            toast({
                title: "Copy failed",
                description: "Failed to copy URL to clipboard.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Image Upload</h1>
                {uploadedFiles.length > 0 && (
                    <Button variant="outline" onClick={clearUploadedFiles}>
                        Clear All
                    </Button>
                )}
            </div>

            {/* Upload Area */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Upload Images
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Drag and Drop Area */}
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                            isDragOver
                                ? "border-primary bg-primary/5"
                                : "border-muted-foreground/25 hover:border-primary/50",
                            selectedFiles.length > 0 && "border-primary bg-primary/5"
                        )}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium mb-2">
                            Drop images here, or click to select images
                        </p>
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-4"
                        >
                            Select Images
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Selected Images</h3>
                            <div className="flex flex-wrap gap-4">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="relative group">
                                        <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-border">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={file.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                        <p className="text-xs text-center mt-1 truncate w-24">
                                            {file.name}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upload Progress */}
                    {isUploading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Uploading...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <Progress value={uploadProgress} className="h-2" />
                        </div>
                    )}

                    {/* Upload Button */}
                    {selectedFiles.length > 0 && !isUploading && (
                        <Button onClick={handleUpload} className="w-full">
                            Upload {selectedFiles.length} Image{selectedFiles.length > 1 ? 's' : ''}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Uploaded Files Table - Only show when files are uploaded */}
            {uploadedFiles.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Uploaded Files</span>
                            <span className="text-sm font-normal text-muted-foreground">
                                {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File Name</TableHead>
                                    <TableHead>URL</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {uploadedFiles.map((file, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{file.name}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground font-mono">
                                            <div className="flex items-start gap-2">
                                                <a
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 underline break-all flex-1"
                                                >
                                                    {file.url}
                                                </a>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(file.url, index)}
                                                    className="h-8 w-8 p-0 flex-shrink-0"
                                                >
                                                    {copiedIndex === index ? (
                                                        <Check className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ImageUpload;
