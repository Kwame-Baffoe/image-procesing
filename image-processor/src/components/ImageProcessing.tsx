// app/page.tsx
"use client";

import React, { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import axios from 'axios';
import { 
  Upload, 
  AlertCircle,
  Loader2,
  Download,
  Settings,
  Image as ImageIcon,
  Trash2,
  FileDown,
  Copy,
  CheckCircle2
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

// Types
interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  type: string;
  lastModified: number;
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
  enhancement: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
  compression: {
    enabled: boolean;
    level: number;
  };
}

const defaultProcessingOptions: ProcessingOptions = {
  format: 'png',
  quality: 90,
  resize: {
    enabled: false,
    width: 1920,
    height: 1080,
    maintainAspectRatio: true
  },
  enhancement: {
    brightness: 0,
    contrast: 0,
    saturation: 0
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

export default function ImageProcessor() {
  const [files, setFiles] = useState<UploadableFile[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>(defaultProcessingOptions);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

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

    } catch (error) {
      console.error('Upload error:', error);
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

        setFiles(current =>
          current.map(f =>
            f.id === file.id
              ? {
                  ...f,
                  status: 'success',
                  progress: 100,
                  processedUrl: response.data.url
                }
              : f
          )
        );

        setProcessingProgress(((i + 1) / successfulFiles.length) * 100);
      }

      setActiveTab('results');
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Processing failed');
    } finally {
      setProcessing(false);
      setProcessingProgress(0);
    }
  };

  // Dropzone configuration
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setGlobalError(null);

    const newFiles = acceptedFiles.map(file => ({
      id: generateUniqueId(),
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'waiting' as const
    }));

    setFiles(current => [...current, ...newFiles]);

    for (const fileItem of newFiles) {
      await handleFileUpload(fileItem);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxSize: 10485760, // 10MB
    multiple: true
  });

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      files.forEach(file => {
        URL.revokeObjectURL(file.preview);
      });
    };
  }, [files]);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImageIcon className="h-6 w-6" />
            <span>Image Processor</span>
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
                  border-2 border-dashed rounded-lg p-8 text-center
                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                `}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">
                  {isDragActive ? 'Drop files here' : 'Drag & drop files or click to select'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Supports: JPG, PNG, WebP up to 10MB
                </p>
              </div>

              {/* File List */}
              <div className="mt-6 space-y-4">
                <AnimatePresence>
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
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

            {/* Enhancement Options */}
            <div className="space-y-4">
              <Label>Image Enhancements</Label>
              {Object.entries(processingOptions.enhancement).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label className="capitalize">{key}</Label>
                    <span className="text-gray-500">
                      {value > 0 ? '+' : ''}{value}
                    </span>
                  </div>
                  <Slider
                    value={[value]}
                    min={-100}
                    max={100}
                    step={1}
                    onValueChange={([newValue]) =>
                      setProcessingOptions(prev => ({
                        ...prev,
                        enhancement: {
                          ...prev.enhancement,
                          [key]: newValue
                        }
                      }))
                    }
                  />
                </div>
              ))}
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
                onClick={processImages}
                disabled={!files.some(f => f.status === 'success') || processing}
                className="flex items-center"
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
                      <div className="relative aspect-video mb-4">
                        <Image
                          src={file.processedUrl!}
                          alt={`Processed ${file.file.name}`}
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                      
                      <div className="space-y-2">
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

            {globalError && (
              <div className="text-red-500 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4" />
                <span>{globalError}</span>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </div>
);
}