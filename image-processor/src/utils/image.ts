import { toast } from 'sonner';

export const validateImageFile = (file: File) => {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Supported formats: ${validTypes.join(', ')}`);
  }

  // Validate file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File size must be less than ${formatFileSize(maxSize)}`);
  }

  return true;
};

export const formatFileSize = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const handleUploadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'An unknown error occurred';
  toast.error(message);
  return message;
};

export const getImageDimensions = async (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
};