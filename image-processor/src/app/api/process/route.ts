
// app/api/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, access } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { execute, buildInputFile } from 'wasm-imagemagick';
import { mkdir } from 'fs/promises';

// First, ensure the uploads directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

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

// Helper function to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Helper function to create directory if it doesn't exist
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error('Error creating directory:', error);
  }
}

// Helper function to validate file path
async function validateFilePath(filePath: string): Promise<boolean> {
  try {
    const exists = await fileExists(filePath);
    if (!exists) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Check if it's a valid image file
    await sharp(filePath).metadata();
    return true;
  } catch (error) {
    console.error('File validation error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure uploads directory exists
    await ensureDir(UPLOAD_DIR);

    // Parse request body
    const body = await request.json();
    console.log('Received request body:', body);

    if (!body.fileUrl || !body.options) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Clean up the file URL and get the absolute path
    const relativePath = body.fileUrl.replace(/^\//, '');
    const inputPath = path.join(process.cwd(), 'public', relativePath);
    console.log('Input path:', inputPath);

    // Validate input file
    const isValid = await validateFilePath(inputPath);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid input file' },
        { status: 400 }
      );
    }

    // Create output filename
    const timestamp = Date.now();
    const outputFilename = `processed-${timestamp}.${body.options.format}`;
    const outputPath = path.join(UPLOAD_DIR, outputFilename);
    console.log('Output path:', outputPath);

    try {
      // Process with Sharp
      const imageProcess = sharp(inputPath);

      // Apply resize if enabled
      if (body.options.resize?.enabled) {
        imageProcess.resize({
          width: body.options.resize.width,
          height: body.options.resize.height,
          fit: body.options.resize.maintainAspectRatio ? 'inside' : 'fill'
        });
      }

      // Apply format-specific options
      const quality = body.options.compression.enabled 
        ? body.options.compression.level 
        : body.options.quality;

      switch (body.options.format.toLowerCase()) {
        case 'jpg':
        case 'jpeg':
          imageProcess.jpeg({
            quality,
            mozjpeg: true
          });
          break;

        case 'png':
          imageProcess.png({
            quality,
            compressionLevel: Math.floor((100 - quality) / 10)
          });
          break;

        case 'webp':
          imageProcess.webp({
            quality,
            lossless: quality === 100
          });
          break;

        default:
          throw new Error('Unsupported format');
      }

      // Process the image
      const processedImage = await imageProcess.toBuffer({ resolveWithObject: true });
      await writeFile(outputPath, processedImage.data);

      // Get metadata for both original and processed images
      const [originalStats, originalBuffer, processedStats] = await Promise.all([
        sharp(inputPath).metadata(),
        readFile(inputPath),
        sharp(outputPath).metadata()
      ]);

      const originalSize = originalBuffer.length;
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
            width: processedStats.width,
            height: processedStats.height,
            format: processedStats.format,
            size: processedSize,
            colorSpace: processedStats.space,
            channels: processedStats.channels,
            hasAlpha: processedStats.hasAlpha
          },
          processing: {
            compressionRatio: `${compressionRatio}%`,
            appliedOptions: {
              format: body.options.format,
              quality: body.options.compression.enabled 
                ? body.options.compression.level 
                : body.options.quality,
              resize: body.options.resize,
              compression: body.options.compression
            }
          }
        }
      });

    } catch (processingError) {
      console.error('Processing error:', processingError);
      return NextResponse.json(
        { 
          success: false, 
          error: processingError instanceof Error 
            ? processingError.message 
            : 'Image processing failed'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Route handler error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
