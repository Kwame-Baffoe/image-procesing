// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    return uploadDir;
  } catch (error) {
    console.error('Failed to create upload directory:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
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
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Create buffer from file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get image metadata using sharp
    const metadata = await sharp(buffer).metadata();

    // Generate safe filename
    const timestamp = Date.now();
    const safeFilename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Ensure upload directory exists
    const uploadDir = await ensureUploadDir();
    const filepath = path.join(uploadDir, safeFilename);

    // Save file
    await writeFile(filepath, buffer);

    // Return success response with file details and metadata
    return NextResponse.json({
      success: true,
      url: `/uploads/${safeFilename}`,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: buffer.length,
        colorSpace: metadata.space,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};