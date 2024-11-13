// app/actions/image-processing.ts
'use server'

import { revalidatePath } from 'next/cache';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export type ProcessingResult = {
  success: boolean;
  url?: string;
  error?: string;
  metadata?: {
    format: string;
    width: number;
    height: number;
    size: number;
    compressionRatio?: string;
  };
};

export async function processImage(
  formData: FormData
): Promise<ProcessingResult> {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      throw new Error('No file provided');
    }

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // Generate safe filename
    const timestamp = Date.now();
    const safeFilename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filepath = path.join(uploadDir, safeFilename);

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process image with Sharp
    const image = sharp(buffer);
    const metadata = await image.metadata();

    const processedImage = image
      .resize({
        width: metadata.width,
        height: metadata.height,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80, progressive: true });

    const outputBuffer = await processedImage.toBuffer();
    const processedMetadata = await processedImage.metadata();

    // Save processed image
    await writeFile(filepath, outputBuffer);

    // Calculate compression ratio
    const originalSize = buffer.length;
    const processedSize = outputBuffer.length;
    const compressionRatio = ((originalSize - processedSize) / originalSize * 100).toFixed(2);

    // Revalidate the path to update UI
    revalidatePath('/');

    return {
      success: true,
      url: `/uploads/${safeFilename}`,
      metadata: {
        format: processedMetadata.format || 'unknown',
        width: processedMetadata.width || 0,
        height: processedMetadata.height || 0,
        size: processedSize,
        compressionRatio: `${compressionRatio}%`
      }
    };

  } catch (error) {
    console.error('Processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed'
    };
  }
}