// src/types/index.ts
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