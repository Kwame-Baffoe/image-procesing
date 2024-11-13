import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Helper to ensure consistent error response format
const createErrorResponse = (message: string, status = 500) => {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: { 'Content-Type': 'application/json' } }
  );
};

// Helper to ensure consistent success response format
const createSuccessResponse = (data: any) => {
  return NextResponse.json(
    { success: true, ...data },
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

// Ensure upload directory exists
async function ensureUploadDir() {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  try {
    await mkdir(uploadDir, { recursive: true });
    return uploadDir;
  } catch (error) {
    console.error('Directory creation error:', error);
    throw new Error('Failed to create upload directory');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure upload directory exists
    const uploadDir = await ensureUploadDir();

    // Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      return createErrorResponse('Failed to parse form data', 400);
    }

    // Get file from form data
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return createErrorResponse('No file provided', 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return createErrorResponse('Invalid file type. Only JPG, PNG and WebP are allowed.', 415);
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return createErrorResponse('File size exceeds 10MB limit', 413);
    }

    // Generate safe filename
    const timestamp = Date.now();
    const safeFilename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filepath = path.join(uploadDir, safeFilename);

    try {
      // Convert file to buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);

      // Return success response with file details
      return createSuccessResponse({
        filename: safeFilename,
        url: `/uploads/${safeFilename}`,
        size: file.size,
        type: file.type,
        timestamp
      });

    } catch (error) {
      console.error('File write error:', error);
      return createErrorResponse('Failed to save file');
    }

  } catch (error) {
    console.error('Server error:', error);
    return createErrorResponse('Internal server error');
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
  },
};