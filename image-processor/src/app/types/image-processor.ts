// src/types/image-processor.ts
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
  
  export type ProcessingStatus = 'idle' | 'processing' | 'success' | 'error';
  
  // src/lib/utils.ts
  import { type ClassValue, clsx } from "clsx";
  import { twMerge } from "tailwind-merge";
  
  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  
  export const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };
  
  export const getImageMetadata = async (file: File): Promise<ImageMetadata> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        });
      };
  
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
  
      img.src = URL.createObjectURL(file);
    });
  };
  
  export const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported';
    }
  
    if (file.size > maxSize) {
      return 'File size exceeds 10MB';
    }
  
    return null;
  };
  
  // src/lib/constants.ts
  export const defaultProcessingOptions: ProcessingOptions = {
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
  
  export const IMAGE_CONFIG = {
    maxSize: 10 * 1024 * 1024, // 10MB
    acceptedTypes: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    }
  } as const;