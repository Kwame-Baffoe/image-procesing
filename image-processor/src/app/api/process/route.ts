import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { call, initializeImageMagick } from '@imagemagick/magick-wasm';

// Initialize ImageMagick WASM
let initialized = false;

async function ensureImageMagickInit() {
  if (!initialized) {
    await initializeImageMagick();
    initialized = true;
  }
}

interface ProcessingOptions {
  format: 'jpg' | 'png' | 'webp';
  quality: number;
  resize?: {
    enabled: boolean;
    width: number;
    height: number;
    maintainAspectRatio: boolean;
  };
  compression?: {
    enabled: boolean;
    level: number;
  };
}

interface ImageMetadata {
  format: string;
  width: number;
  height: number;
  colorSpace: string;
  quality: number;
  size: number;
  compression: string;
  colorDepth: number;
}

async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  await ensureImageMagickInit();
  
  const result = await call([{
    name: 'input.png',
    content: buffer
  }], ['identify', '-verbose', 'input.png']);

  if (!result.success) {
    throw new Error('Failed to get image metadata');
  }

  const output = result.stdout;
  
  // Parse the verbose output to extract metadata
  const metadata: Partial<ImageMetadata> = {};
  
  // Extract basic properties from identify output
  const formatMatch = output.match(/Format: (\w+)/);
  const dimensionsMatch = output.match(/Geometry: (\d+)x(\d+)/);
  const colorSpaceMatch = output.match(/Colorspace: (\w+)/);
  const qualityMatch = output.match(/Quality: (\d+)/);
  const sizeMatch = output.match(/File size: (\d+)/);
  const compressionMatch = output.match(/Compression: (\w+)/);
  const depthMatch = output.match(/Depth: (\d+)/);

  metadata.format = formatMatch?.[1] || 'unknown';
  metadata.width = dimensionsMatch ? parseInt(dimensionsMatch[1]) : 0;
  metadata.height = dimensionsMatch ? parseInt(dimensionsMatch[2]) : 0;
  metadata.colorSpace = colorSpaceMatch?.[1] || 'unknown';
  metadata.quality = qualityMatch ? parseInt(qualityMatch[1]) : 0;
  metadata.size = sizeMatch ? parseInt(sizeMatch[1]) : 0;
  metadata.compression = compressionMatch?.[1] || 'none';
  metadata.colorDepth = depthMatch ? parseInt(depthMatch[1]) : 0;

  return metadata as ImageMetadata;
}

export async function POST(request: Request) {
  try {
    await ensureImageMagickInit();

    const { fileUrl, options } = await request.json() as { 
      fileUrl: string,
      options: ProcessingOptions 
    };

    // Read the input file
    const filepath = join(process.cwd(), 'public', fileUrl.replace(/^\//, ''));
    const inputBuffer = await readFile(filepath);

    // Get original metadata
    const originalMetadata = await getImageMetadata(inputBuffer);

    // Prepare ImageMagick commands
    const commands = ['convert', 'input.png'];

    // Add resize command if enabled
    if (options.resize?.enabled) {
      const resizeOp = options.resize.maintainAspectRatio
        ? `${options.resize.width}x${options.resize.height}>`
        : `${options.resize.width}x${options.resize.height}!`;
      commands.push('-resize', resizeOp);
    }

    // Add compression if enabled
    if (options.compression?.enabled) {
      commands.push('-quality', options.compression.level.toString());
    }

    // Set output format
    commands.push(`output.${options.format}`);

    // Process the image
    const result = await call([{
      name: 'input.png',
      content: inputBuffer
    }], commands);

    if (!result.success || !result.files?.[0]) {
      throw new Error('Image processing failed');
    }

    // Save the processed image
    const processedBuffer = result.files[0].content;
    const timestamp = Date.now();
    const processedFilename = `processed-${timestamp}.${options.format}`;
    const processedFilepath = join(process.cwd(), 'public', 'uploads', processedFilename);
    
    await writeFile(processedFilepath, processedBuffer);

    // Get processed metadata
    const processedMetadata = await getImageMetadata(processedBuffer);

    // Calculate compression ratio
    const compressionRatio = ((originalMetadata.size - processedMetadata.size) / originalMetadata.size * 100).toFixed(2);

    // Save metadata
    const metadataContent = {
      original: originalMetadata,
      processed: processedMetadata,
      processing: {
        compressionRatio: `${compressionRatio}%`,
        options,
        timestamp: new Date().toISOString()
      }
    };

    const metadataFilename = `metadata-${timestamp}.json`;
    await writeFile(
      join(process.cwd(), 'public', 'uploads', metadataFilename),
      JSON.stringify(metadataContent, null, 2)
    );

    return NextResponse.json({
      success: true,
      url: `/uploads/${processedFilename}`,
      metadata: metadataContent
    });

  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed' 
      },
      { status: 500 }
    );
  }
}