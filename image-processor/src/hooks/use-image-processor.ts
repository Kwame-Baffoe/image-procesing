// src/hooks/use-image-processor.ts
import { useState, useCallback } from 'react';
import axios from 'axios';
import type { UploadableFile, ProcessingOptions } from '../types';

interface UploadResponse {
  url: string;
  metadata: ImageMetadata;
}

interface ProcessResponse {
  url: string;
}

interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  type: string;
  lastModified: number;
}

export function useImageProcessor() {
  const [files, setFiles] = useState<UploadableFile[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const uploadFile = useCallback(async (fileItem: UploadableFile) => {
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

      const response = await axios.post<UploadResponse>('/api/upload', formData, {
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
                originalUrl: response.data.url,
                processedUrl: response.data.url
              }
            : f
        )
      );

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
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

  const processImage = useCallback(async (
    fileItem: UploadableFile,
    options: ProcessingOptions
  ) => {
    try {
      setFiles(current =>
        current.map(f =>
          f.id === fileItem.id
            ? { ...f, status: 'processing', progress: 0 }
            : f
        )
      );

      const response = await axios.post<ProcessResponse>('/api/process', {
        fileUrl: fileItem.originalUrl || fileItem.processedUrl,
        options
      });

      // Update processing progress
      setProcessingProgress(100);

      setFiles(current =>
        current.map(f =>
          f.id === fileItem.id
            ? {
                ...f,
                status: 'success',
                progress: 100,
                processedUrl: response.data.url
              }
            : f
        )
      );

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
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

  const removeFile = useCallback((fileId: string) => {
    setFiles(current => current.filter(f => f.id !== fileId));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setGlobalError(null);
  }, []);

  return {
    files,
    setFiles,
    globalError,
    setGlobalError,
    processing,
    setProcessing,
    processingProgress,
    setProcessingProgress,
    uploadFile,
    processImage,
    removeFile,
    clearFiles
  };
}