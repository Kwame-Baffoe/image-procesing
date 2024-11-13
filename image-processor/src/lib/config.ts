// lib/config.ts
export const config = {
    upload: {
      maxFileSize: 1024 * 1024 * 10, // 10MB
      directory: process.env.UPLOAD_DIR || 'public/uploads',
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxFiles: 1, // Maximum files allowed at once
    },
    processing: {
      maxConcurrent: 1,
      outputFormats: ['jpg', 'png', 'webp'] as const,
    },
    server: {
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    }
  };