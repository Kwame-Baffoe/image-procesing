// src/lib/types/image.ts
export interface ImageMetadata {
    width: number;
    height: number;
    size: number;
    type: string;
    lastModified: number;
  }
  
  export interface UploadableFile {
    id: string;
    file: File;
    preview: string;
    progress: number;
    status: 'waiting' | 'uploading' | 'success' | 'error' | 'processing';
    error?: string;
    metadata?: ImageMetadata;
    processedUrl?: string;
    originalUrl?: string;
  }
  
  export interface ProcessingOptions {
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
  
  // src/lib/hooks/use-image-upload.ts
  "use client";
  
  import { useState, useCallback } from 'react';
  import axios from 'axios';
  import { type UploadableFile } from '@/lib/types/image';
  
  export const useImageUpload = () => {
    const [files, setFiles] = useState<UploadableFile[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);
  
    const uploadFile = useCallback(async (fileItem: UploadableFile) => {
      const formData = new FormData();
      formData.append("file", fileItem.file);
  
      try {
        setUploadError(null);
        setFiles(current =>
          current.map(f =>
            f.id === fileItem.id
              ? { ...f, status: 'uploading', progress: 0 }
              : f
          )
        );
  
        const response = await axios.post<{ url: string; metadata: any }>(
          '/api/upload',
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
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
          }
        );
  
        setFiles(current =>
          current.map(f =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: 'success',
                  progress: 100,
                  metadata: response.data.metadata,
                  originalUrl: response.data.url,
                  processedUrl: response.data.url
                }
              : f
          )
        );
  
        return response.data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        setUploadError(errorMessage);
        setFiles(current =>
          current.map(f =>
            f.id === fileItem.id
              ? { ...f, status: 'error', progress: 0, error: errorMessage }
              : f
          )
        );
        throw error;
      }
    }, []);
  
    return { files, setFiles, uploadError, setUploadError, uploadFile };
  };
  
  // src/lib/hooks/use-image-processing.ts
  "use client";
  
  import { useState, useCallback } from 'react';
  import axios from 'axios';
  import { type UploadableFile, type ProcessingOptions } from '@/lib/types/image';
  
  export const useImageProcessing = () => {
    const [processing, setProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [processingError, setProcessingError] = useState<string | null>(null);
  
    const processImage = useCallback(async (
      file: UploadableFile,
      options: ProcessingOptions,
      onFileUpdate: (updatedFile: UploadableFile) => void
    ) => {
      try {
        setProcessing(true);
        setProcessingError(null);
        
        onFileUpdate({ ...file, status: 'processing', progress: 0 });
  
        const response = await axios.post<{ url: string }>('/api/process', {
          fileUrl: file.originalUrl || file.processedUrl,
          options
        });
  
        onFileUpdate({
          ...file,
          status: 'success',
          progress: 100,
          processedUrl: response.data.url
        });
  
        return response.data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Processing failed';
        setProcessingError(errorMessage);
        onFileUpdate({
          ...file,
          status: 'error',
          progress: 0,
          error: errorMessage
        });
        throw error;
      } finally {
        setProcessing(false);
        setProcessingProgress(0);
      }
    }, []);
  
    return {
      processing,
      processingProgress,
      processingError,
      processImage,
      setProcessingProgress,
      setProcessingError
    };
  };
  
  // src/lib/hooks/use-image-preview.ts
  "use client";
  
  import { useState, useCallback } from 'react';
  import { type UploadableFile } from '@/lib/types/image';
  
  export const useImagePreview = () => {
    const [previewFile, setPreviewFile] = useState<UploadableFile | null>(null);
    const [compareMode, setCompareMode] = useState(false);
  
    const openPreview = useCallback((file: UploadableFile) => {
      setPreviewFile(file);
    }, []);
  
    const closePreview = useCallback(() => {
      setPreviewFile(null);
      setCompareMode(false);
    }, []);
  
    const toggleCompareMode = useCallback(() => {
      setCompareMode(prev => !prev);
    }, []);
  
    return {
      previewFile,
      compareMode,
      openPreview,
      closePreview,
      toggleCompareMode
    };
  };
  
  // src/lib/utils.ts
  export const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };
  
  export const validateImageFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
    if (!allowedTypes.includes(file.type)) {
      return 'Unsupported file type. Please upload JPG, PNG, or WebP images.';
    }
  
    if (file.size > maxSize) {
      return 'File size exceeds 10MB limit.';
    }
  
    return null;
  };