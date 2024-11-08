// src/components/ImageProcess.tsx
'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
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
  RotateCw,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
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
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FileWithPreview extends File {
  preview: string;
  uploadProgress?: number;
  status?: 'uploading' | 'complete' | 'error';
  id: string;
  error?: string;
  processingStatus?: 'waiting' | 'processing' | 'complete' | 'error';
}

interface ProcessedFile {
  id: string;
  original: string;
  processed: string;
  url: string;
  metadata: {
    size: number;
    width: number;
    height: number;
    format: string;
  };
  notes?: string;
  processedAt: Date;
}

interface ProcessingOptions {
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
  advancedFilters: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
  processingNotes: string;
}

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const defaultProcessingOptions: ProcessingOptions = {
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
  advancedFilters: {
    brightness: 0,
    contrast: 0,
    saturation: 0,
  },
  processingNotes: '',
};

const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ... (previous code remains the same)

export default function ImageProcess() {
    const [activeTab, setActiveTab] = useState('upload');
    const [files, setFiles] = useState<FileWithPreview[]>([]);
    const [options, setOptions] = useState<ProcessingOptions>(defaultProcessingOptions);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [currentStage, setCurrentStage] = useState<string>('');
    const uploadQueueRef = useRef<string[]>([]);
  
    const handleFileUpload = async (file: FileWithPreview) => {
      const formData = new FormData();
      formData.append('file', file);
  
      try {
        uploadQueueRef.current = [...uploadQueueRef.current, file.id];
        
        // Update file status to uploading
        setFiles(current =>
          current.map(f =>
            f.id === file.id
              ? { ...f, status: 'uploading', uploadProgress: 0 }
              : f
          )
        );
  
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
  
        if (!response.ok) throw new Error('Upload failed');
  
        const data = await response.json();
  
        // Update file status to complete
        setFiles(current =>
          current.map(f =>
            f.id === file.id
              ? { 
                  ...f, 
                  uploadProgress: 100, 
                  status: 'complete',
                  processingStatus: 'waiting'
                }
              : f
          )
        );
  
        uploadQueueRef.current = uploadQueueRef.current.filter(id => id !== file.id);
  
      } catch (error) {
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
        uploadQueueRef.current = uploadQueueRef.current.filter(id => id !== file.id);
        throw error;
      }
    };
  
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map(file => ({
        ...file,
        preview: URL.createObjectURL(file),
        id: generateUniqueId(),
        status: 'uploading' as const,
        uploadProgress: 0
      }));
  
      setFiles(prev => [...prev, ...newFiles]);
  
      // Process each file
      for (const file of newFiles) {
        try {
          await handleFileUpload(file);
        } catch (error) {
          console.error('Upload error:', error);
          // Error is handled in handleFileUpload
        }
      }
    }, []);
  
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: ACCEPTED_TYPES,
      maxSize: 10485760, // 10MB
      multiple: true
    });
  
    const removeFile = useCallback((fileToRemove: FileWithPreview) => {
      setFiles(files => files.filter(file => file !== fileToRemove));
      URL.revokeObjectURL(fileToRemove.preview);
    }, []);
  
    const resetAdvancedFilters = useCallback(() => {
      setOptions(prev => ({
        ...prev,
        advancedFilters: defaultProcessingOptions.advancedFilters
      }));
    }, []);
  
    const simulateProcessingStages = async () => {
      const stages = [
        { name: 'Analyzing images', duration: 1000 },
        { name: 'Applying transformations', duration: 1500 },
        { name: 'Optimizing output', duration: 1000 },
        { name: 'Finalizing', duration: 500 }
      ];
  
      let completedProgress = 0;
      for (const stage of stages) {
        setCurrentStage(stage.name);
        const startProgress = completedProgress;
        const increment = 25;
        
        await new Promise<void>(resolve => {
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / stage.duration, 1);
            const currentProgress = startProgress + (progress * increment);
            setProgress(Math.floor(currentProgress));
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              completedProgress += increment;
              resolve();
            }
          };
          requestAnimationFrame(animate);
        });
      }
    };
  
    const handleProcess = async () => {
      setProcessing(true);
      setProgress(0);
      setError(null);
      
      try {
        // Only process files that are complete
        const readyFiles = files.filter(f => f.status === 'complete');
        const formData = new FormData();
        
        readyFiles.forEach(file => formData.append('images', file));
        formData.append('config', JSON.stringify(options));
  
        // Start processing animation
        simulateProcessingStages();
  
        const response = await fetch('/api/process', {
          method: 'POST',
          body: formData
        });
  
        if (!response.ok) {
          throw new Error('Processing failed');
        }
  
        const result = await response.json();
        
        // Add timestamp and normalize data
        const processedResults = result.files.map((file: ProcessedFile) => ({
          ...file,
          processedAt: new Date(),
          notes: options.processingNotes
        }));
  
        setProcessedFiles(processedResults);
        setActiveTab('results');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setProcessing(false);
        setProgress(0);
        setCurrentStage('');
      }
    };
  
    // Clean up on unmount
    React.useEffect(() => {
      return () => {
        files.forEach(file => {
          if (file.preview) {
            URL.revokeObjectURL(file.preview);
          }
        });
      };
    }, [files]);
  

    // ... (previous code remains the same)

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card className="bg-white shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>Image Processing Station</span>
              {uploadQueueRef.current.length > 0 && (
                <span className="text-sm text-blue-500">
                  ({uploadQueueRef.current.length} uploads in progress)
                </span>
              )}
            </div>
            {processing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center text-sm text-blue-600"
              >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {currentStage || 'Processing...'}
              </motion.div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" disabled={processing}>
                <Upload className="h-4 w-4 mr-2" />
                Upload {files.length > 0 && `(${files.length})`}
              </TabsTrigger>
              <TabsTrigger 
                value="options" 
                disabled={files.length === 0 || processing || files.every(f => f.status === 'error')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Options
              </TabsTrigger>
              <TabsTrigger value="results" disabled={processedFiles.length === 0}>
                <Filter className="h-4 w-4 mr-2" />
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
                        {isDragActive ? 'Drop your images here' : 'Drag & drop your images here'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Supports: PNG, JPG, WebP up to 10MB
                      </p>
                    </div>
                  </div>
                </div>

                <AnimatePresence mode="popLayout">
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.2 }}
                      className="relative border rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="relative h-20 w-20 rounded-md overflow-hidden">
                          <Image
                            src={file.preview}
                            alt={`Preview of ${file.name}`}
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
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
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
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Remove file
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          
                          {file.status === 'uploading' && (
                            <div className="mt-2 space-y-1">
                              <Progress value={file.uploadProgress} className="h-1" />
                              <p className="text-xs text-gray-500 flex items-center">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
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
                                Upload failed
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleFileUpload(file)}
                                  className="text-xs"
                                >
                                  <RotateCw className="h-3 w-3 mr-1" />
                                  Retry
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(file)}
                                  className="text-xs text-red-500"
                                >
                                  <X className="h-3 w-3 mr-1" />
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
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => {
                        files.forEach(file => URL.revokeObjectURL(file.preview));
                        setFiles([]);
                      }}
                      className="flex items-center"
                      disabled={processing}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                    <Button
                      onClick={() => setActiveTab('options')}
                      disabled={files.some(f => f.status === 'uploading') || processing}
                      className="flex items-center"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Continue to Options
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Options Tab Content */}
            <TabsContent value="options">
              <div className="space-y-6">
                {/* Basic Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Output Format</Label>
                    <Select
                      value={options.outputFormat}
                      onValueChange={(value) => setOptions({ ...options, outputFormat: value })}
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
                    <Label>Quality ({options.quality}%)</Label>
                    <Slider
                      value={[options.quality]}
                      min={0}
                      max={100}
                      step={1}
                      className="pt-2"
                      onValueChange={([value]) => setOptions({ ...options, quality: value })}
                    />
                  </div>
                </div>

                {/* Resize Options */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="resize">Resize Images</Label>
                    <Switch
                      id="resize"
                      checked={options.resize}
                      onCheckedChange={(checked) => setOptions({ ...options, resize: checked })}
                    />
                  </div>

                  {options.resize && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="space-y-2">
                        <Label>Width (px)</Label>
                        <Input
                          type="number"
                          value={options.width}
                          onChange={(e) => setOptions({ 
                            ...options, 
                            width: parseInt(e.target.value) || 0 
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Height (px)</Label>
                        <Input
                          type="number"
                          value={options.height}
                          onChange={(e) => setOptions({ 
                            ...options, 
                            height: parseInt(e.target.value) || 0 
                          })}
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="aspectRatio">Maintain Aspect Ratio</Label>
                    <Switch
                      id="aspectRatio"
                      checked={options.maintainAspectRatio}
                      onCheckedChange={(checked) => setOptions({ 
                        ...options, 
                        maintainAspectRatio: checked 
                      })}
                    />
                  </div>
                </div>

                {/* Image Enhancement Options */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="colorCorrection">Color Correction</Label>
                    <Switch
                      id="colorCorrection"
                      checked={options.colorCorrection}
                      onCheckedChange={(checked) => setOptions({ 
                        ...options, 
                        colorCorrection: checked 
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="sharpen">Sharpen</Label>
                    <Switch
                      id="sharpen"
                      checked={options.sharpen}
                      onCheckedChange={(checked) => setOptions({ 
                        ...options, 
                        sharpen: checked 
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="watermark">Add Watermark</Label>
                    <Switch
                      id="watermark"
                      checked={options.watermark}
                      onCheckedChange={(checked) => setOptions({ 
                        ...options, 
                        watermark: checked 
                      })}
                    />
                  </div>

                  {options.watermark && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <Label>Watermark Text</Label>
                      <Input
                        value={options.watermarkText}
                        onChange={(e) => setOptions({ 
                          ...options, 
                          watermarkText: e.target.value 
                        })}
                        placeholder="Enter watermark text"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Advanced Filters Section */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <Label>Advanced Filters</Label>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetAdvancedFilters}
                            className="h-8 w-8 p-0"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Reset all filters
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="space-y-6">
                    {Object.entries(options.advancedFilters).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="capitalize">{key}</Label>
                          <span className="text-sm text-gray-500">
                            {value > 0 ? '+' : ''}{value}
                          </span>
                        </div>
                        <Slider
                          value={[value]}
                          min={-100}
                          max={100}
                          step={1}
                          className="pt-2"
                          onValueChange={([newValue]) => setOptions(prev => ({
                            ...prev,
                            advancedFilters: {
                              ...prev.advancedFilters,
                              [key]: newValue
                            }
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Processing Notes */}
                <div className="space-y-2 border-t pt-4">
                  <Label>Processing Notes</Label>
                  <Textarea
                    value={options.processingNotes}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      processingNotes: e.target.value
                    }))}
                    placeholder="Add any special instructions or notes for this batch of images..."
                    className="min-h-[100px] resize-y"
                  />
                </div>

                <div className="flex space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('upload')}
                    className="flex-1"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Back to Upload
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={files.length === 0 || files.some(f => f.status === 'uploading')}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Process Images
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Results Tab */}
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
                      {currentStage || `Processing... ${progress}%`}
                    </p>
                  </div>
                ) : processedFiles.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
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
                                  alt={`Processed version of ${file.original}`}
                                  fill
                                  className="object-cover transition-transform group-hover:scale-105"
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium truncate">{file.original}</p>
                                    <p className="text-sm text-gray-500">
                                      Processed {file.metadata.created && 
                                        new Date(file.metadata.created).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {file.metadata.location && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <div className="text-xs text-gray-500">
                                              📍 {file.metadata.location.latitude.toFixed(2)},
                                              {file.metadata.location.longitude.toFixed(2)}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Location metadata preserved
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              const link = document.createElement('a');
                                              link.href = file.url;
                                              link.download = file.processed;
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                              
                                              // Update status to downloaded
                                              setProcessedFiles(prev => 
                                                prev.map(f => 
                                                  f.processed === file.processed 
                                                    ? { ...f, status: 'downloaded' } 
                                                    : f
                                                )
                                              );
                                            }}
                                          >
                                            <Download className={`h-4 w-4 ${
                                              file.status === 'downloaded' ? 'text-green-500' : ''
                                            }`} />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {file.status === 'downloaded' 
                                            ? 'Downloaded' 
                                            : 'Download processed image'}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </div>
                                <div className="text-sm text-gray-500 space-y-1">
                                  <p>Size: {(file.metadata.size / 1024).toFixed(2)} KB</p>
                                  <p>Dimensions: {file.metadata.width}x{file.metadata.height}px</p>
                                  <p>Format: {file.metadata.format.toUpperCase()}</p>
                                  {file.notes && (
                                    <p className="text-gray-600 italic mt-2">"{file.notes}"</p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setFiles([]);
                          setProcessedFiles([]);
                          setOptions(defaultProcessingOptions);
                          setActiveTab('upload');
                        }}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Process New Images
                      </Button>
                      <Button
                        onClick={() => {
                          const zip = new JSZip();
                          processedFiles.forEach(file => {
                            zip.file(file.processed, fetch(file.url).then(res => res.blob()));
                          });
                          zip.generateAsync({ type: 'blob' }).then(content => {
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(content);
                            link.download = 'processed-images.zip';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            // Mark all as downloaded
                            setProcessedFiles(prev => 
                              prev.map(f => ({ ...f, status: 'downloaded' }))
                            );
                          });
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download All
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
                    <p className="mt-4 text-gray-500">No processed images yet</p>
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
                <p>You are about to process {files.filter(f => f.status === 'complete').length} image(s) with the following settings:</p>
                
                <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                  <p><strong>Output Format:</strong> {options.outputFormat}</p>
                  <p><strong>Quality:</strong> {options.quality}%</p>
                  
                  {options.resize && (
                    <p><strong>Resize:</strong> {options.width}x{options.height}px
                      {options.maintainAspectRatio && ' (maintaining aspect ratio)'}
                    </p>
                  )}
                  
                  {options.colorCorrection && <p><strong>Color Correction:</strong> Enabled</p>}
                  {options.sharpen && <p><strong>Sharpening:</strong> Enabled</p>}
                  
                  {Object.entries(options.advancedFilters).some(([_, value]) => value !== 0) && (
                    <div>
                      <strong>Advanced Filters:</strong>
                      <ul className="ml-4 mt-1">
                        {options.advancedFilters.brightness !== 0 && (
                          <li>Brightness: {options.advancedFilters.brightness > 0 ? '+' : ''}{options.advancedFilters.brightness}</li>
                        )}
                        {options.advancedFilters.contrast !== 0 && (
                          <li>Contrast: {options.advancedFilters.contrast > 0 ? '+' : ''}{options.advancedFilters.contrast}</li>
                        )}
                        {options.advancedFilters.saturation !== 0 && (
                          <li>Saturation: {options.advancedFilters.saturation > 0 ? '+' : ''}{options.advancedFilters.saturation}</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {options.watermark && (
                    <p><strong>Watermark:</strong> "{options.watermarkText}"</p>
                  )}
                  
                  {options.processingNotes && (
                    <div className="mt-2">
                      <strong>Notes:</strong>
                      <p className="text-sm text-gray-600 mt-1">{options.processingNotes}</p>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-500">
                  This process cannot be undone. Processed images will be available for download.
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
              Proceed with Processing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}