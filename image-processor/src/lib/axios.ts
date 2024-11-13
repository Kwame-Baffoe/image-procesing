// lib/axios.ts
import axios from 'axios';
import { toast } from 'sonner';

// Create axios instance with custom config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Convert FormData to proper format
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Response error:', error);
    
    let message = 'An error occurred';
    
    if (error.response) {
      // Server responded with error
      message = error.response.data?.error || error.response.statusText;
    } else if (error.request) {
      // Request made but no response
      message = 'No response from server';
    } else {
      // Request setup error
      message = error.message;
    }

    toast.error('Error', {
      description: message
    });

    return Promise.reject(error);
  }
);

// Upload helper function
export const uploadImage = async (file: File, onProgress?: (progress: number) => void) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  } catch (error) {
    throw error;
  }
};

// Process helper function
export const processImage = async (fileUrl: string, options: string) => {
  try {
    const response = await api.post('/api/process', {
      fileUrl,
      options,
    });

    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;