// src/app/api/types.ts
export interface NodeError extends Error {
    code?: string;
  }
  
  export interface UploadResponse {
    success: boolean;
    filename?: string;
    url?: string;
    size?: number;
    type?: string;
    error?: string;
  }
  
  export interface MetadataResponse {
    width?: number;
    height?: number;
    format?: string;
    size: number;
    channels?: number;
    space?: string;
    density?: number;
    hasAlpha?: boolean;
    orientation?: number;
    error?: string;
  }