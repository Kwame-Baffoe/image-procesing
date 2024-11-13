class UploadManager {
  private static instance: UploadManager;
  private uploading: boolean = false;

  private constructor() {}

  static getInstance(): UploadManager {
    if (!UploadManager.instance) {
      UploadManager.instance = new UploadManager();
    }
    return UploadManager.instance;
  }

  canUpload(): boolean {
    return !this.uploading;
  }

  startUpload(): void {
    this.uploading = true;
  }

  endUpload(): void {
    this.uploading = false;
  }

  reset(): void {
    this.uploading = false;
  }

  async upload(uploadFn: () => Promise<void>): Promise<void> {
    if (this.uploading) {
      throw new Error('An upload is already in progress');
    }

    try {
      this.uploading = true;
      await uploadFn();
    } finally {
      this.uploading = false;
    }
  }
}

export default UploadManager.getInstance();