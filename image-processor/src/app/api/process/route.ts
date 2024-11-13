import { NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import imagemagick from 'imagemagick-native';

// Interface for image metadata
interface ImageMetadata {
  format: string;
  width: number;
  height: number;
  colorSpace: string;
  depth: number;
  compression: string;
  quality: number;
  size: number;
  density: {
    width: number;
    height: number;
    units: string;
  };
  colorProfile: string;
  properties: Record<string, string>;
}

export async function POST(request: Request) {
  try {
    const { fileUrl, options } = await request.json();
    const relativePath = fileUrl.replace(/^\//, '');
    const filepath = join(process.cwd(), 'public', relativePath);

    // Read the original image file
    const imageBuffer = await readFile(filepath);

    // Get image metadata before processing
    const originalMetadata = imagemagick.identify({
      srcData: imageBuffer,
      verbose: true
    }) as ImageMetadata;

    // Prepare ImageMagick options for processing
    const magickOptions: any = {
      srcData: imageBuffer,
      format: options.format.toUpperCase(),
      quality: options.quality
    };

    // Handle image scaling
    if (options.resize?.enabled) {
      magickOptions.width = options.resize.width;
      magickOptions.height = options.resize.height;
      if (options.resize.maintainAspectRatio) {
        magickOptions.resizeStyle = 'aspectfit';
      }
    }

    // Handle compression
    if (options.compression?.enabled) {
      magickOptions.compress = 'JPEG'; // Using JPEG compression even for other formats
      magickOptions.quality = options.compression.level;
    }

    // Process the image
    const processedBuffer = imagemagick.convert(magickOptions);

    // Get processed image metadata
    const processedMetadata = imagemagick.identify({
      srcData: processedBuffer,
      verbose: true
    }) as ImageMetadata;

    // Generate unique filename for processed image
    const timestamp = Date.now();
    const originalFilename = fileUrl.split('/').pop() || 'image';
    const processedFilename = `processed-${timestamp}-${originalFilename}`;
    const processedFilepath = join(process.cwd(), 'public', 'uploads', processedFilename);

    // Save processed image
    await writeFile(processedFilepath, processedBuffer);

    // Calculate compression ratio
    const compressionRatio = (originalMetadata.size - processedMetadata.size) / originalMetadata.size * 100;

    // Save metadata to a JSON file
    const metadataFilename = `metadata-${timestamp}.json`;
    const metadataFilepath = join(process.cwd(), 'public', 'uploads', metadataFilename);
    const metadataContent = {
      original: {
        ...originalMetadata,
        filename: originalFilename,
        path: fileUrl,
      },
      processed: {
        ...processedMetadata,
        filename: processedFilename,
        path: `/uploads/${processedFilename}`,
      },
      processing: {
        compressionRatio: compressionRatio.toFixed(2) + '%',
        options: options,
        timestamp: new Date().toISOString()
      }
    };

    await writeFile(metadataFilepath, JSON.stringify(metadataContent, null, 2));

    return NextResponse.json({
      url: `/uploads/${processedFilename}`,
      metadata: metadataContent,
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