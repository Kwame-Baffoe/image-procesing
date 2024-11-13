// app/api/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const { fileUrl, options } = await request.json();

    // Get file path from URL
    const relativePath = fileUrl.replace(/^\//, '');
    const filepath = path.join(process.cwd(), 'public', relativePath);

    // Initialize sharp with the input file
    let imageProcess = sharp(filepath);

    // Apply resize if enabled
    if (options.resize?.enabled) {
      imageProcess = imageProcess.resize({
        width: options.resize.width,
        height: options.resize.height,
        fit: options.resize.maintainAspectRatio ? 'inside' : 'fill'
      });
    }

    // Process based on format with correct quality options
    let processedImage;
    const compressionLevel = options.compression.enabled 
      ? options.compression.level 
      : options.quality;

    switch (options.format.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        processedImage = await imageProcess
          .jpeg({
            quality: compressionLevel,
            mozjpeg: true // Better compression for JPEG
          })
          .toBuffer({ resolveWithObject: true });
        break;

      case 'png':
        processedImage = await imageProcess
          .png({
            quality: compressionLevel,
            compressionLevel: Math.floor((100 - compressionLevel) / 10), // Convert 0-100 to 9-0
            palette: true // Better compression for PNG
          })
          .toBuffer({ resolveWithObject: true });
        break;

      case 'webp':
        processedImage = await imageProcess
          .webp({
            quality: compressionLevel,
            lossless: compressionLevel === 100
          })
          .toBuffer({ resolveWithObject: true });
        break;

      default:
        throw new Error('Unsupported format');
    }

    // Generate output filename
    const timestamp = Date.now();
    const outputFilename = `processed-${timestamp}.${options.format}`;
    const outputPath = path.join(process.cwd(), 'public', 'uploads', outputFilename);

    // Save processed image
    await writeFile(outputPath, processedImage.data);

    // Get processed image metadata
    const metadata = await sharp(outputPath).metadata();

    // Calculate compression ratio
    const originalStats = await sharp(filepath).metadata();
    const originalSize = (await sharp(filepath).toBuffer()).length;
    const processedSize = processedImage.data.length;
    const compressionRatio = ((originalSize - processedSize) / originalSize * 100).toFixed(2);

    return NextResponse.json({
      success: true,
      url: `/uploads/${outputFilename}`,
      metadata: {
        original: {
          width: originalStats.width,
          height: originalStats.height,
          format: originalStats.format,
          size: originalSize,
          colorSpace: originalStats.space,
          channels: originalStats.channels,
          hasAlpha: originalStats.hasAlpha
        },
        processed: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: processedSize,
          colorSpace: metadata.space,
          channels: metadata.channels,
          hasAlpha: metadata.hasAlpha
        },
        processing: {
          compressionRatio: `${compressionRatio}%`,
          appliedOptions: {
            format: options.format,
            quality: compressionLevel,
            resize: options.resize,
            compression: options.compression
          }
        }
      }
    });

  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process image'
      },
      { status: 500 }
    );
  }
}

// Validate we're receiving correct types
interface ProcessingRequest {
  fileUrl: string;
  options: {
    format: 'jpg' | 'jpeg' | 'png' | 'webp';
    quality: number;
    resize?: {
      enabled: boolean;
      width: number;
      height: number;
      maintainAspectRatio: boolean;
    };
    compression: {
      enabled: boolean;
      level: number;
    };
  };
}

// Helper function to validate request
function validateRequest(data: unknown): data is ProcessingRequest {
  const request = data as ProcessingRequest;
  return (
    typeof request?.fileUrl === 'string' &&
    typeof request?.options?.format === 'string' &&
    typeof request?.options?.quality === 'number' &&
    (!request?.options?.resize || typeof request.options.resize.enabled === 'boolean') &&
    typeof request?.options?.compression?.enabled === 'boolean'
  );
}