// lib/uploadUtils.ts
import fs from 'fs/promises';
import path from 'path';

export async function getUploadedFiles() {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  
  try {
    const files = await fs.readdir(uploadDir);
    return files.filter(file => !file.endsWith('.meta.json') && !file.endsWith('.gitkeep'));
  } catch (error) {
    console.error('Error reading uploads directory:', error);
    return [];
  }
}

export async function deleteUploadedFile(filename: string) {
  const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
  const metaFilepath = `${filepath}.meta.json`;

  try {
    await fs.unlink(filepath);
    try {
      await fs.unlink(metaFilepath);
    } catch (error) {
      // Metadata file might not exist, ignore
    }
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

export async function cleanupOldUploads(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  const now = Date.now();

  try {
    const files = await fs.readdir(uploadDir);
    
    for (const file of files) {
      if (file === '.gitkeep') continue;
      
      const filepath = path.join(uploadDir, file);
      const stats = await fs.stat(filepath);
      
      if (now - stats.mtimeMs > maxAge) {
        await deleteUploadedFile(file);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old uploads:', error);
  }
}