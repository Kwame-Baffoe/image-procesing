// hooks/useImageUpload.ts
import { useState } from 'react';
import { uploadImage, processImage } from '@/lib/axios';

export interface UploadableFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'waiting' | 'uploading' | 'success' | 'error' | 'processing';
  error?: string;
  metadata?: string;
  processedUrl?: string;
}

export function useImageUpload() {
  const [files, setFiles] = useState<UploadableFile[]>([]);

  const handleUpload = async (fileItem: UploadableFile) => {
    try {
      setFiles(current =>
        current.map(f =>
          f.id === fileItem.id
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        )
      );

      const result = await uploadImage(fileItem.file, (progress) => {
        setFiles(current =>
          current.map(f =>
            f.id === fileItem.id && f.status === 'uploading'
              ? { ...f, progress }
              : f
          )
        );
      });

      // Update file with response data
      setFiles(current =>
        current.map(f =>
          f.id === fileItem.id
            ? {
                ...f,
                status: 'success',
                progress: 100,
                metadata: result.metadata,
                processedUrl: result.url
              }
            : f
        )
      );

    } catch (error) {
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
      throw error;
    }
  };

  const handleProcess = async (fileItem: UploadableFile, options: string) => {
    try {
      setFiles(current =>
        current.map(f =>
          f.id === fileItem.id
            ? { ...f, status: 'processing', progress: 0 }
            : f
        )
      );

      const result = await processImage(fileItem.processedUrl!, options);

      setFiles(current =>
        current.map(f =>
          f.id === fileItem.id
            ? {
                ...f,
                status: 'success',
                progress: 100,
                processedUrl: result.url,
                metadata: result.metadata
              }
            : f
        )
      );

      return result;
    } catch (error) {
      setFiles(current =>
        current.map(f =>
          f.id === fileItem.id
            ? {
                ...f,
                status: 'error',
                progress: 0,
                error: error instanceof Error ? error.message : 'Processing failed'
              }
            : f
        )
      );
      throw error;
    }
  };

  return {
    files,
    setFiles,
    handleUpload,
    handleProcess
  };
}