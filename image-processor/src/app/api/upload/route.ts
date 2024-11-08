// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Custom type for file system errors
type FileSystemError = {
  code: string;
  message: string;
};

// Ensure directory exists
async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    const fsError = error as FileSystemError;
    if (fsError.code !== 'EEXIST') {
      throw new Error(`Failed to create directory: ${fsError.message}`);
    }
  }
}

// Generate unique filename
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = path.extname(originalName).toLowerCase();
  return `${timestamp}-${random}${extension}`;
}

// Handle file upload
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPG, PNG and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    try {
      // Ensure upload directory exists
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await ensureDirectory(uploadDir);

      // Generate unique filename
      const filename = generateUniqueFilename(file.name);
      const filepath = path.join(uploadDir, filename);

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

    } catch (error) {
      console.error('File write error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save file' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      },
    }
  );
}

// API Route configuration
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
  },
  runtime: 'edge', // Enable edge runtime
};