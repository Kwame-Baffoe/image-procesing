// src/app/api/process/route.ts
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

export async function POST(request: Request) {
  try {
    const { fileUrl, options } = await request.json();

    // Remove leading slash and get the correct file path
    const relativePath = fileUrl.replace(/^\//, '');
    const filepath = join(process.cwd(), 'public', relativePath);

    // Create Sharp instance from the input file
    let processedImage = sharp(filepath);

    // Apply resize if enabled
    if (options.resize.enabled) {
      processedImage = processedImage.resize({
        width: options.resize.width,
        height: options.resize.height,
        fit: options.resize.maintainAspectRatio ? 'inside' : 'fill',
      });
    }

    // Apply enhancements
    if (Object.values(options.enhancement).some(v => v !== 0)) {
      const brightness = 1 + (options.enhancement.brightness / 100);
      const saturation = 1 + (options.enhancement.saturation / 100);
      
      processedImage = processedImage.modulate({
        brightness,
        saturation,
      });

      if (options.enhancement.contrast !== 0) {
        processedImage = processedImage.linear(
          1 + (options.enhancement.contrast / 100),
          0
        );
      }
    }

    // Process image based on format with correct typing
    let outputBuffer: Buffer;
    
    if (options.format === 'jpg') {
      outputBuffer = await processedImage.jpeg({
        quality: Math.min(100, Math.max(1, options.quality)),
        force: true,
      }).toBuffer();
    } 
    else if (options.format === 'png') {
      outputBuffer = await processedImage.png({
        force: true,
      }).toBuffer();
    }
    else if (options.format === 'webp') {
      outputBuffer = await processedImage.webp({
        quality: Math.min(100, Math.max(1, options.quality)),
        force: true,
      }).toBuffer();
    }
    else {
      throw new Error('Unsupported format');
    }

    // Generate unique filename for processed image
    const timestamp = Date.now();
    const originalFilename = fileUrl.split('/').pop() || 'image';
    const processedFilename = `processed-${timestamp}-${originalFilename}`;
    const processedFilepath = join(process.cwd(), 'public', 'uploads', processedFilename);

    // Save processed image
    await writeFile(processedFilepath, outputBuffer);

    // Return the URL for the processed image
    return NextResponse.json({
      url: `/uploads/${processedFilename}`,
      success: true
    });

  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}