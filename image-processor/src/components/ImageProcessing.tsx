// app/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import axios from 'axios';
import { toast } from "sonner";
import { 
  Upload, 
  AlertCircle,
  Loader2,
  Download,
  Settings,
  Image as ImageIcon,
  Trash2,
  Copy,
  CheckCircle2,
  SplitSquareVertical,
  
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {config} from '../lib/config'
import uploadManager from "@/lib/uploadManager";

// Types and interfaces
interface ImageMetadata {
  format: string;
  width: number;
  height: number;
  size: number;
  colorSpace: string;
  quality?: number;
  channels?: string[];
  hasAlpha?: boolean;
  uploadManager?: string[]
}

interface UploadableFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'waiting' | 'uploading' | 'success' | 'error' | 'processing';
  error?: string;
  metadata?: ImageMetadata;
  processedUrl?: string;
  processedMetadata?: ImageMetadata;
}

interface ProcessingOptions {
  format: 'jpg' | 'png' | 'webp';
  quality: number;
  resize: {
    enabled: boolean;
    width: number;
    height: number;
    maintainAspectRatio: boolean;
  };
  compression: {
    enabled: boolean;
    level: number;
  };
}

// Process Dialog Component
function ProcessingDialog({ open, progress }: { open: boolean; progress: number }) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Processing Images</AlertDialogTitle>
          <AlertDialogDescription>
            Please wait while your images are being processed...
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col items-center py-6 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-500">
            Progress: {Math.round(progress)}%
          </p>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Default options
const defaultProcessingOptions: ProcessingOptions = {
  format: 'png',
  quality: 90,
  resize: {
    enabled: false,
    width: 1920,
    height: 1080,
    maintainAspectRatio: true
  },
  compression: {
    enabled: true,
    level: 70
  }
};

// Utility functions
const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Main ImageProcessor Component
function ImageProcessor() {
  // State management
  const [files, setFiles] = useState<UploadableFile[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>(defaultProcessingOptions);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // File upload handler
  const handleFileUpload = async (fileItem: UploadableFile) => {
    const formData = new FormData();
    formData.append("file", fileItem.file);

    try {
      setFiles(current =>
        current.map(f =>
          f.id === fileItem.id
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        )
      );

      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setFiles(current =>
              current.map(f =>
                f.id === fileItem.id && f.status === 'uploading'
                  ? { ...f, progress }
                  : f
              )
            );
          }
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Upload failed');
      }

      setFiles(current =>
        current.map(f =>
          f.id === fileItem.id
            ? {
                ...f,
                status: 'success',
                progress: 100,
                metadata: response.data.metadata,
                processedUrl: response.data.url
              }
            : f
        )
      );

      toast.success('File uploaded successfully');

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });

      setFiles(current =>
        current.map(f =>
          f.id === fileItem.id
            ? {
                ...f,
                status: 'error',
                progress: 0,
                error: error instanceof Error ? error.message : 'Upload failed'
              }
            : f
        )
      );
    }
  };

  // Process images handler
  const processImages = async () => {
    setProcessing(true);
    setProcessingProgress(0);

    try {
      const successfulFiles = files.filter(f => f.status === 'success');
      
      for (let i = 0; i < successfulFiles.length; i++) {
        const file = successfulFiles[i];
        
        setFiles(current =>
          current.map(f =>
            f.id === file.id
              ? { ...f, status: 'processing', progress: 0 }
              : f
          )
        );

        const response = await axios.post('/api/process', {
          fileUrl: file.processedUrl,
          options: processingOptions
        });

        if (!response.data.success) {
          throw new Error(response.data.error || 'Processing failed');
        }

        setFiles(current =>
          current.map(f =>
            f.id === file.id
              ? {
                  ...f,
                  status: 'success',
                  progress: 100,
                  processedUrl: response.data.url,
                  processedMetadata: response.data.metadata
                }
              : f
          )
        );

        setProcessingProgress(((i + 1) / successfulFiles.length) * 100);
        toast.success(`Processed ${file.file.name}`);
      }

      setActiveTab('results');
    } catch (error) {
      toast.error('Processing failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setProcessing(false);
      setProcessingProgress(0);
      setShowProcessDialog(false);
    }
  };

  // Dropzone configuration
 const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop: async (acceptedFiles) => {
    // Allow only one file at a time
    if (files.length > 0) {
      toast.error('Please process or remove existing file first');
      return;
    }

    if (acceptedFiles.length > 1) {
      toast.error('Please upload only one file at a time');
      return;
    }

    const newFiles = acceptedFiles.map(file => ({
      id: generateUniqueId(),
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'waiting' as const
    }));

    try {
      await uploadManager.upload(async () => {
        setFiles(newFiles);
        await handleFileUpload(newFiles[0]);
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'An upload is already in progress') {
        toast.error('Please wait for the current upload to complete');
      } else {
        toast.error('Upload failed');
        console.error('Upload error:', error);
      }
      
      // Cleanup on error
      newFiles.forEach(file => URL.revokeObjectURL(file.preview));
    }
  },
  accept: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp']
  },
  maxSize: config.upload.maxFileSize,
  multiple: false, // Disable multiple file selection
  maxFiles: 1,
});


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      files.forEach(file => {
        URL.revokeObjectURL(file.preview);
      });
    };
  }, [files]);

  // File Preview Component
  const FilePreview = ({ file }: { file: UploadableFile }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="border rounded-lg p-4"
    >
      <div className="flex items-center space-x-4">
        <div className="relative h-16 w-16">
          <Image
            src={file.preview}
            alt={file.file.name}
            fill
            className="object-cover rounded"
          />
        </div>
        <div className="flex-1">
          <p className="font-medium truncate">{file.file.name}</p>
          <p className="text-sm text-gray-500">
            {formatFileSize(file.file.size)}
          </p>
          
          {file.status === 'uploading' && (
            <div className="mt-2">
              <Progress value={file.progress} className="h-1" />
              <p className="text-xs text-gray-500 mt-1">
                Uploading... {file.progress}%
              </p>
            </div>
          )}

          {file.status === 'success' && (
            <p className="text-sm text-green-500 mt-2 flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Upload complete
            </p>
          )}

          {file.status === 'error' && (
            <p className="text-sm text-red-500 mt-2 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {file.error}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFiles(current => 
              current.filter(f => f.id !== file.id)
            );
            URL.revokeObjectURL(file.preview);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );

  // Image Preview Component for Results
  const ImagePreview = ({ file }: { file: UploadableFile }) => (
    <div className="relative aspect-video">
      {showComparison && file.processedUrl ? (
        <div className="relative w-full h-full flex">
          <div className="w-1/2 relative border-r border-white/20">
            <Image
              src={file.preview}
              alt="Original"
              fill
              className="object-cover"
            />
            <div className="absolute bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
              Original
            </div>
          </div>
          <div className="w-1/2 relative">
            <Image
              src={file.processedUrl}
              alt="Processed"
              fill
              className="object-cover"
            />
            <div className="absolute bottom-2 right-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
              Processed
            </div>
          </div>
        </div>
      ) : (
        <Image
          src={file.processedUrl || file.preview}
          alt={file.file.name}
          fill
          className="object-cover rounded-lg"
        />
      )}
    </div>
  );

// Main render
return (
  <div className="container mx-auto p-4 max-w-4xl">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ImageIcon className="h-6 w-6" />
            <span>Image Processor</span>
          </div>
          {processing && (
            <div className="flex items-center text-sm text-blue-600">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing... {Math.round(processingProgress)}%
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger 
              value="process" 
              disabled={!files.some(f => f.status === 'success')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Process
            </TabsTrigger>
            <TabsTrigger 
              value="results" 
              disabled={!files.some(f => f.processedUrl)}
            >
              <Download className="h-4 w-4 mr-2" />
              Results
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <div
              {...getRootProps()}
              className={`
                relative border-2 border-dashed rounded-lg p-12
                transition-all duration-200 ease-in-out
                ${isDragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className={`
                    absolute -inset-1 rounded-full blur-sm transition-all duration-200
                    ${isDragActive ? 'bg-blue-100 opacity-100' : 'opacity-0'}
                  `} />
                  <div className={`
                    relative rounded-full p-4 transition-all duration-200
                    ${isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}
                  `}>
                    <Upload className="h-8 w-8" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className={`text-lg transition-colors duration-200 ${
                    isDragActive ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {isDragActive ? 'Drop the files here' : 'Drag & drop files here'}
                  </p>
                  <p className="text-sm text-gray-500">
                    or <button type="button" className="text-blue-500 hover:text-blue-600">browse</button>
                  </p>
                  <p className="text-xs text-gray-400">
                    Supports: JPG, PNG, WebP up to 10MB
                  </p>
                </div>
              </div>
            </div>

            {/* File List */}
            <div className="mt-6 space-y-4">
              <AnimatePresence>
                {files.map((file) => (
                  <FilePreview key={file.id} file={file} />
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* Process Tab */}
          <TabsContent value="process" className="space-y-6">
            {/* Format Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Output Format</Label>
                <Select
                  value={processingOptions.format}
                  onValueChange={(value: 'jpg' | 'png' | 'webp') => 
                    setProcessingOptions(prev => ({ ...prev, format: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jpg">JPG</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quality ({processingOptions.quality}%)</Label>
                <Slider
                  value={[processingOptions.quality]}
                  min={1}
                  max={100}
                  step={1}
                  onValueChange={([value]) => 
                    setProcessingOptions(prev => ({ ...prev, quality: value }))
                  }
                />
              </div>
            </div>

            {/* Resize Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Resize Images</Label>
                <Switch
                  checked={processingOptions.resize.enabled}
                  onCheckedChange={(checked) =>
                    setProcessingOptions(prev => ({
                      ...prev,
                      resize: { ...prev.resize, enabled: checked }
                    }))
                  }
                />
              </div>

              {processingOptions.resize.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Width (px)</Label>
                    <Input
                      type="number"
                      value={processingOptions.resize.width}
                      onChange={(e) =>
                        setProcessingOptions(prev => ({
                          ...prev,
                          resize: { ...prev.resize, width: parseInt(e.target.value) || 0 }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height (px)</Label>
                    <Input
                      type="number"
                      value={processingOptions.resize.height}
                      onChange={(e) =>
                        setProcessingOptions(prev => ({
                          ...prev,
                          resize: { ...prev.resize, height: parseInt(e.target.value) || 0 }
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Compression Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Compression</Label>
                <Switch
                  checked={processingOptions.compression.enabled}
                  onCheckedChange={(checked) =>
                    setProcessingOptions(prev => ({
                      ...prev,
                      compression: { ...prev.compression, enabled: checked }
                    }))
                  }
                />
              </div>

              {processingOptions.compression.enabled && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>Compression Level</Label>
                    <span className="text-gray-500">{processingOptions.compression.level}%</span>
                  </div>
                  <Slider
                    value={[processingOptions.compression.level]}
                    min={1}
                    max={100}
                    step={1}
                    onValueChange={([value]) =>
                      setProcessingOptions(prev => ({
                        ...prev,
                        compression: { ...prev.compression, level: value }
                      }))
                    }
                  />
                </div>
              )}
            </div>
{/* Process Button */}
<div className="flex justify-end pt-6">
                <Button
                  onClick={() => setShowProcessDialog(true)}
                  disabled={!files.some(f => f.status === 'success') || processing}
                  className="flex items-center bg-blue-600 hover:bg-blue-700"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Settings className="h-4 w-4 mr-2" />
                  )}
                  {processing ? 'Processing...' : 'Process Images'}
                </Button>
              </div>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="space-y-6">
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComparison(!showComparison)}
                  className="flex items-center"
                >
                  <SplitSquareVertical className="h-4 w-4 mr-2" />
                  {showComparison ? 'Hide' : 'Show'} Comparison
                </Button>
              </div>

              {processing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                  <Progress value={processingProgress} className="w-64 mt-4" />
                  <p className="mt-4 text-sm text-gray-500">
                    Processing Images... {Math.round(processingProgress)}%
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {files.filter(f => f.processedUrl).map((file) => (
                    <Card key={file.id}>
                      <CardContent className="p-4">
                        <ImagePreview file={file} />
                        <div className="space-y-2 mt-4">
                          <p className="font-medium truncate">{file.file.name}</p>
                          
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>{formatFileSize(file.file.size)}</span>
                            {file.metadata && (
                              <>
                                <span>•</span>
                                <span>{file.metadata.width} × {file.metadata.height}px</span>
                              </>
                            )}
                          </div>

                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = file.processedUrl!;
                                link.download = `processed-${file.file.name}`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                navigator.clipboard.writeText(file.processedUrl!);
                                toast.success('URL copied to clipboard');
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy URL
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Process Confirmation Dialog */}
      <AlertDialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Processing Settings</AlertDialogTitle>
            <AlertDialogDescription>
              Review your processing settings before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Selected Files Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="font-medium">Selected Files</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {files.filter(f => f.status === 'success').map(file => (
                  <div key={file.id} className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="truncate">{file.file.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Processing Options Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="font-medium">Processing Options</div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Output Format:</span>
                  <span className="font-medium">{processingOptions.format.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quality:</span>
                  <span className="font-medium">{processingOptions.quality}%</span>
                </div>
                {processingOptions.resize.enabled && (
                  <div className="flex justify-between">
                    <span>Resize:</span>
                    <span className="font-medium">
                      {processingOptions.resize.width} × {processingOptions.resize.height}px
                    </span>
                  </div>
                )}
                {processingOptions.compression.enabled && (
                  <div className="flex justify-between">
                    <span>Compression Level:</span>
                    <span className="font-medium">{processingOptions.compression.level}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Warning Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center text-sm text-yellow-800">
                <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                <span>Processing will modify your original images according to these settings.</span>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowProcessDialog(false);
                processImages();
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm & Process
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Processing Dialog */}
      <ProcessingDialog 
        open={processing} 
        progress={processingProgress}
      />
    </div>
  );
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Image processor error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-medium">Something went wrong</h3>
          </div>
          <p className="mt-2 text-sm text-red-500">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4"
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export wrapped component
export default function Page() {
  return (
    <ErrorBoundary>
      <ImageProcessor />
    </ErrorBoundary>
  );
}