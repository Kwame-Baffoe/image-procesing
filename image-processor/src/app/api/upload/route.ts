import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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

// Generate unique filename
const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = path.extname(originalName).toLowerCase();
  return `${timestamp}-${random}${extension}`;
};

// Ensure upload directory exists
const ensureUploadDirectory = async () => {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  try {
    await mkdir(uploadDir, { recursive: true });
    return uploadDir;
  } catch (err) { // Changed from error to err to avoid shadow naming
    if ((err as { code?: string }).code !== 'EEXIST') {
      throw new Error('Failed to create upload directory');
    }
    return uploadDir;
  }
};

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    // Validate file existence
    if (!file) {
      return handleError(new Error('No file provided'), 400);
    }

    // Validate file
    validateFileType(file.type);
    validateFileSize(file.size);

    // Prepare upload directory
    const uploadDir = await ensureUploadDirectory();
    const filename = generateUniqueFilename(file.name);
    const filepath = path.join(uploadDir, filename);

    try {
      // Convert file to buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);

      // Return success response
      return NextResponse.json({
        success: true,
        filename,
        url: `/uploads/${filename}`,
        size: file.size,
        type: file.type,
        timestamp: Date.now()
      });
    } catch (err) { // Changed from error to err
      console.error('File write error:', err);
      return handleError(new Error('Failed to save file'));
    }
  } catch (err) { // Changed from error to err
    return handleError(err);
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