import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, unlink } from 'fs/promises';
import path from 'path';

// Use a file-based lock system instead of memory variable
const LOCK_FILE = path.join(process.cwd(), 'upload.lock');
const fs = require('fs').promises;

// Check if upload is in progress
const isUploadLocked = async (): Promise<boolean> => {
  try {
    await fs.access(LOCK_FILE);
    return true;
  } catch {
    return false;
  }
};

// Create lock
const createLock = async () => {
  await fs.writeFile(LOCK_FILE, Date.now().toString());
};

// Remove lock
const removeLock = async () => {
  try {
    await fs.unlink(LOCK_FILE);
  } catch (err) {
    console.error('Error removing lock:', err);
  }
};

// Custom error handler
const handleError = (error: unknown, status = 500) => {
  console.error('Server error:', error);
  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  return NextResponse.json({ success: false, error: message }, { status });
};

// Validate file type
const validateFileType = (type: string) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(type)) {
    throw new Error('Invalid file type. Only JPG, PNG and WebP are allowed.');
  }
};

// Validate file size
const validateFileSize = (size: number) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (size > maxSize) {
    throw new Error('File size exceeds 10MB limit.');
  }
};

// Clear upload directory
const clearUploadDirectory = async () => {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  try {
    await mkdir(uploadDir, { recursive: true });
    const files = await readdir(uploadDir);
    await Promise.all(
      files.map(file => unlink(path.join(uploadDir, file)))
    );
    return uploadDir;
  } catch (err) {
    if ((err as { code?: string }).code !== 'EEXIST') {
      throw new Error('Failed to prepare upload directory');
    }
    return uploadDir;
  }
};

export async function POST(request: NextRequest) {
  // Check for existing upload
  if (await isUploadLocked()) {
    return handleError(new Error('Another upload is in progress. Please wait.'), 429);
  }

  try {
    await createLock();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return handleError(new Error('No file provided'), 400);
    }

    validateFileType(file.type);
    validateFileSize(file.size);

    // Clear and prepare upload directory
    const uploadDir = await clearUploadDirectory();
    const filename = `upload-${Date.now()}${path.extname(file.name)}`;
    const filepath = path.join(uploadDir, filename);

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    // Get basic image metadata
    const imagemagick = require('imagemagick-native');
    const metadata = imagemagick.identify({
      srcData: buffer,
      verbose: true
    });

    return NextResponse.json({
      success: true,
      filename,
      url: `/uploads/${filename}`,
      metadata: {
        size: file.size,
        type: file.type,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        timestamp: Date.now()
      }
    });

  } catch (err) {
    return handleError(err);
  } finally {
    await removeLock();
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
  },
};