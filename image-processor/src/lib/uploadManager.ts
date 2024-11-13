// lib/uploadManager.ts
class UploadManager {
    private static instance: UploadManager;
    private isUploading: boolean = false;
    private uploadQueue: Array<() => Promise<void>> = [];
  
    private constructor() {}
  
    static getInstance(): UploadManager {
      if (!UploadManager.instance) {
        UploadManager.instance = new UploadManager();
      }
      return UploadManager.instance;
    }
  
    async upload(uploadFn: () => Promise<void>): Promise<void> {
      if (this.isUploading) {
        throw new Error('An upload is already in progress');
      }
  
      try {
        this.isUploading = true;
        await uploadFn();
      } finally {
        this.isUploading = false;
      }
    }
  
    isUploadInProgress(): boolean {
      return this.isUploading;
    }
  
    reset(): void {
      this.isUploading = false;
      this.uploadQueue = [];
    }
  }
  
  export const uploadManager = UploadManager.getInstance();