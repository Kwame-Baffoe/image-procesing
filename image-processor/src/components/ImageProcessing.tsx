
// src/components/ImageProcessing.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import JSZip from 'jszip';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  Check, 
  AlertCircle,
  Loader2,
  Download,
  RefreshCw,
  Filter,
  Settings,
  Image as ImageIcon,
  Save,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Types
interface FileWithPreview extends File {
  preview: string;
  uploadProgress?: number;
  status?: 'uploading' | 'complete' | 'error';
  error?: string;
  id: string;
}

interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  channels?: number;
  space?: string;
  density?: number;
  hasAlpha?: boolean;
  orientation?: number;
}

interface ProcessedImage {
  original: string;
  processed: string;
  url: string;
  metadata: ImageMetadata;
}

interface ProcessingConfig {
  inputFormat: string;
  outputFormat: string;
  quality: number;
  resize: boolean;
  width: number;
  height: number;
  maintainAspectRatio: boolean;
  colorCorrection: boolean;
  sharpen: boolean;
  watermark: boolean;
  watermarkText: string;
  brightness: number;
  contrast: number;
  saturation: number;
  batchProcessing: boolean;
}

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const DEFAULT_CONFIG: ProcessingConfig = {
  inputFormat: 'JPG',
  outputFormat: 'PNG',
  quality: 80,
  resize: false,
  width: 1920,
  height: 1080,
  maintainAspectRatio: true,
  colorCorrection: false,
  sharpen: false,
  watermark: false,
  watermarkText: '',
  brightness: 0,
  contrast: 0,
  saturation: 0,
  batchProcessing: false,
};

// Helper functions
const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Main Component
export default function ImageProcessing() {
  // State
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [config, setConfig] = useState<ProcessingConfig>(DEFAULT_CONFIG);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [processedFiles, setProcessedFiles] = useState<ProcessedImage[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [activeTab, setActiveTab] = useState('upload');

  // Cleanup effect
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  // File upload handler
  const handleFileUpload = async (file: FileWithPreview) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      setFiles(current =>
        current.map(f =>
          f.id === file.id
            ? { ...f, status: 'uploading', uploadProgress: 0 }
            : f
        )
      );

      // Progress simulation
      const progressInterval = setInterval(() => {
        setFiles(current =>
          current.map(f =>
            f.id === file.id && f.status === 'uploading'
              ? { ...f, uploadProgress: Math.min((f.uploadProgress || 0) + 10, 90) }
              : f
          )
        );
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      // Update file status
      setFiles(current =>
        current.map(f =>
          f.id === file.id
            ? {
                ...f,
                uploadProgress: 100,
                status: 'complete',
                preview: data.url
              }
            : f
        )
      );

      // Get metadata for single files
      if (!config.batchProcessing) {
        const metadataResponse = await fetch('/api/metadata', {
          method: 'POST',
          body: formData,
        });

        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          setMetadata(metadata);
        }
      }

    } catch (error) {
      console.error('Upload error:', error);
      setFiles(current =>
        current.map(f =>
          f.id === file.id
            ? {
                ...f,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed'
              }
            : f
        )
      );
    }
  };

  // Dropzone configuration
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    
    const newFiles = acceptedFiles.map(file => ({
      ...file,
      preview: URL.createObjectURL(file),
      id: generateUniqueId(),
      status: 'uploading' as const,
      uploadProgress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);

    for (const file of newFiles) {
      await handleFileUpload(file);
    }
  }, [config.batchProcessing]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 10485760, // 10MB
    multiple: config.batchProcessing,
  });

  // File removal
  const removeFile = useCallback((fileToRemove: FileWithPreview) => {
    setFiles(files => files.filter(file => file !== fileToRemove));
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    if (files.length === 1) {
      setMetadata(null);
    }
  }, [files]);

  // Processing handler
  const handleProcess = async () => {
    setProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));
      formData.append('config', JSON.stringify(config));

      const stages = ['Analyzing', 'Processing', 'Optimizing', 'Finalizing'];
      
      for (const [index, stage] of stages.entries()) {
        setCurrentStage(stage);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProgress((index + 1) * 25);
      }

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      const result = await response.json();
      setProcessedFiles(result.files);
      setActiveTab('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setProcessing(false);
      setProgress(0);
      setCurrentStage('');
    }
  };

  // Download handler
  const handleDownload = async (file: ProcessedImage) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.processed;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to download file');
    }
  };

  // Download all handler
  const handleDownloadAll = async () => {
    try {
      const zip = new JSZip();
      
      await Promise.all(
        processedFiles.map(async (file) => {
          const response = await fetch(file.url);
          const blob = await response.blob();
          zip.file(file.processed, blob);
        })
      );

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'processed-images.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Batch download failed:', error);
      setError('Failed to download files');
    }
  };

  // Reset handler
  const handleReset = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setMetadata(null);
    setConfig(DEFAULT_CONFIG);
    setProcessedFiles([]);
    setActiveTab('upload');
  };

// Component JSX
return (
    <div className="max-w-6xl mx-auto p-4">
      <Card className="bg-white shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Image Processing Station</span>
            {processing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center text-sm text-blue-600"
              >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {currentStage}
              </motion.div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="options" disabled={files.length === 0}>
                Options
              </TabsTrigger>
              <TabsTrigger value="results" disabled={processedFiles.length === 0}>
                Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <div className="space-y-6">
                <div
                  {...getRootProps()}
                  className={`
                    relative border-2 border-dashed rounded-lg p-8
                    transition-all duration-200 ease-in-out
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                    hover:border-blue-400 hover:bg-blue-50/50
                  `}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center space-y-4">
                    <motion.div
                      animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Upload className="h-12 w-12 text-gray-400" />
                    </motion.div>
                    <div className="text-center">
                      <p className="text-base text-gray-600">
                        {isDragActive 
                          ? 'Drop your images here...' 
                          : 'Drag & drop images here, or click to select'
                        }
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Supports: PNG, JPG, WebP up to 10MB
                        {config.batchProcessing && ' (multiple files allowed)'}
                      </p>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="relative border rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="relative h-20 w-20 rounded-md overflow-hidden">
                          <Image
                            src={file.preview}
                            alt={file.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium truncate">{file.name}</p>
                              <p className="text-sm text-gray-500">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(file)}
                                    className="text-gray-500 hover:text-red-500"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove file</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          {file.status === 'uploading' && (
                            <div className="mt-2 space-y-1">
                              <Progress 
                                value={file.uploadProgress} 
                                className="h-1"
                              />
                              <p className="text-xs text-gray-500">
                                Uploading... {file.uploadProgress}%
                              </p>
                            </div>
                          )}

                          {file.status === 'complete' && (
                            <p className="text-xs text-green-500 mt-2 flex items-center">
                              <Check className="h-3 w-3 mr-1" />
                              Ready for processing
                            </p>
                          )}

                          {file.status === 'error' && (
                            <div className="mt-2">
                              <p className="text-xs text-red-500 flex items-center">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {file.error}
                              </p>
                              <div className="flex space-x-2 mt-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleFileUpload(file)}
                                  className="text-xs"
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Retry
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(file)}
                                  className="text-xs text-red-500"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {files.length > 0 && (
                  <div className="flex space-x-4">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setActiveTab('options')}
                      disabled={files.some(f => f.status === 'uploading')}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Continue to Options
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="options">
              <div className="space-y-6">
                {/* Basic Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Output Format</Label>
                    <Select
                      value={config.outputFormat}
                      onValueChange={(value) => setConfig({ ...config, outputFormat: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PNG">PNG</SelectItem>
                        <SelectItem value="JPG">JPG</SelectItem>
                        <SelectItem value="WebP">WebP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quality ({config.quality}%)</Label>
                    <div className="pt-2">
                      <Slider
                        value={[config.quality]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={([value]) => setConfig({ ...config, quality: value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Resize Options */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="resize">Resize Images</Label>
                    <Switch
                      id="resize"
                      checked={config.resize}
                      onCheckedChange={(checked) => setConfig({ ...config, resize: checked })}
                    />
                  </div>

                  {config.resize && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Width (px)</Label>
                          <Input
                            type="number"
                            value={config.width}
                            onChange={(e) => setConfig({ 
                              ...config, 
                              width: parseInt(e.target.value) || config.width 
                            })}
                            min={1}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Height (px)</Label>
                          <Input
                            type="number"
                            value={config.height}
                            onChange={(e) => setConfig({ 
                              ...config, 
                              height: parseInt(e.target.value) || config.height 
                            })}
                            min={1}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="aspectRatio">Maintain Aspect Ratio</Label>
                        <Switch
                          id="aspectRatio"
                          checked={config.maintainAspectRatio}
                          onCheckedChange={(checked) => 
                            setConfig({ ...config, maintainAspectRatio: checked })
                          }
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Image Enhancements */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="colorCorrection">Color Correction</Label>
                    <Switch
                      id="colorCorrection"
                      checked={config.colorCorrection}
                      onCheckedChange={(checked) => 
                        setConfig({ ...config, colorCorrection: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="sharpen">Sharpen</Label>
                    <Switch
                      id="sharpen"
                      checked={config.sharpen}
                      onCheckedChange={(checked) => 
                        setConfig({ ...config, sharpen: checked })
                      }
                    />
                  </div>

                  {/* Advanced Adjustments */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Brightness</Label>
                      <span className="text-sm text-gray-500">
                        {config.brightness > 0 ? '+' : ''}{config.brightness}
                      </span>
                    </div>
                    <Slider
                      value={[config.brightness]}
                      min={-100}
                      max={100}
                      step={1}
                      onValueChange={([value]) => 
                        setConfig({ ...config, brightness: value })
                      }
                    />

                    <div className="flex items-center justify-between">
                      <Label>Contrast</Label>
                      <span className="text-sm text-gray-500">
                        {config.contrast > 0 ? '+' : ''}{config.contrast}
                      </span>
                    </div>
                    <Slider
                      value={[config.contrast]}
                      min={-100}
                      max={100}
                      step={1}
                      onValueChange={([value]) => 
                        setConfig({ ...config, contrast: value })
                      }
                    />

                    <div className="flex items-center justify-between">
                      <Label>Saturation</Label>
                      <span className="text-sm text-gray-500">
                        {config.saturation > 0 ? '+' : ''}{config.saturation}
                      </span>
                    </div>
                    <Slider
                      value={[config.saturation]}
                      min={-100}
                      max={100}
                      step={1}
                      onValueChange={([value]) => 
                        setConfig({ ...config, saturation: value })
                      }
                    />
                  </div>
                </div>

                {/* Watermark Option */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="watermark">Add Watermark</Label>
                    <Switch
                      id="watermark"
                      checked={config.watermark}
                      onCheckedChange={(checked) => 
                        setConfig({ ...config, watermark: checked })
                      }
                    />
                  </div>

                  {config.watermark && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <Label>Watermark Text</Label>
                      <Input
                        value={config.watermarkText}
                        onChange={(e) => 
                          setConfig({ ...config, watermarkText: e.target.value })
                        }
                        placeholder="Enter watermark text"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('upload')}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Back to Upload
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={files.length === 0 || files.some(f => f.status !== 'complete')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Process Images
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="results">
              <div className="space-y-6">
                {processing ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-12 w-12 text-blue-500" />
                    </motion.div>
                    <Progress value={progress} className="w-64 mt-4" />
                    <p className="mt-4 text-sm text-gray-500">
                      {currentStage}... {progress}%
                    </p>
                  </div>
                ) : processedFiles.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Processed Images</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadAll}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download All
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {processedFiles.map((file, index) => (
                        <motion.div
                          key={file.processed}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative group"
                        >
                          <Card>
                            <CardContent className="p-4">
                              <div className="relative aspect-video mb-4 overflow-hidden rounded-lg">
                                <Image
                                  src={file.url}
                                  alt={`Processed ${file.original}`}
                                  fill
                                  className="object-cover transition-transform group-hover:scale-105"
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium truncate">
                                    {file.original}
                                  </p>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDownload(file)}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Download processed image
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <div className="text-sm text-gray-500 space-y-1">
                                  <p>Size: {formatFileSize(file.metadata.size)}</p>
                                  <p>
                                    Dimensions: {file.metadata.width}x
                                    {file.metadata.height}px
                                  </p>
                                  <p>
                                    Format: {file.metadata.format.toUpperCase()}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={handleReset}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Process New Images
                      </Button>
                    </div>
                  </motion.div>
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="text-center py-12">
                    <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
                    <p className="mt-4 text-gray-500">
                      No processed images yet
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Processing</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>Process {files.length} image(s) with the following settings:</p>
                <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
                  <p><strong>Output Format:</strong> {config.outputFormat}</p>
                  <p><strong>Quality:</strong> {config.quality}%</p>
                  {config.resize && (
                    <p>
                      <strong>Resize:</strong> {config.width}x{config.height}px
                      {config.maintainAspectRatio && ' (maintaining aspect ratio)'}
                    </p>
                  )}
                  {config.colorCorrection && (
                    <p><strong>Color Correction:</strong> Enabled</p>
                  )}
                  {config.sharpen && <p><strong>Sharpen:</strong> Enabled</p>}
                  {config.watermark && (
                    <p><strong>Watermark:</strong> "{config.watermarkText}"</p>
                  )}
                  {(config.brightness !== 0 || 
                    config.contrast !== 0 || 
                    config.saturation !== 0) && (
                    <div>
                      <strong>Adjustments:</strong>
                      <ul className="ml-4 mt-1">
                        {config.brightness !== 0 && (
                          <li>Brightness: {config.brightness > 0 ? '+' : ''}
                            {config.brightness}
                          </li>
                        )}
                        {config.contrast !== 0 && (
                          <li>Contrast: {config.contrast > 0 ? '+' : ''}
                            {config.contrast}
                          </li>
                        )}
                        {config.saturation !== 0 && (
                          <li>Saturation: {config.saturation > 0 ? '+' : ''}
                            {config.saturation}
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  This process cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmDialog(false);
                handleProcess();
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Process Images
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Toast Alert */}
      <AnimatePresence>
        {processedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-600">Success</AlertTitle>
              <AlertDescription className="text-green-600">
                Successfully processed {processedFiles.length} image(s)
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ImageProcessing;

