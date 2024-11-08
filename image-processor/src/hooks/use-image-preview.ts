// src/hooks/use-image-preview.ts
import { useState, useCallback } from 'react';
import type { UploadableFile } from '@/types';

export function useImagePreview() {
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
}