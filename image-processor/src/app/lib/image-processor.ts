// lib/image-processor.ts
import { 
  ImageMagick, 
  MagickFormat, 
  MagickGeometry,
  IMagickImage
} from '@imagemagick/magick-wasm';
import { MagickInitializer } from './imagemagick-config';

export interface ProcessingOptions {
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
  optimization?: {
    enabled: boolean;
    level: 'low' | 'medium' | 'high';
  };
}

export interface ImageMetadata {
  format: string;
  width: number;
  height: number;
  colorSpace: string;
  quality: number;
  fileSize: number;
  compression: string;
  colorDepth: number;
  filename: string;
  density?: {
    x: number;
    y: number;
    units: string;
  };
  hasAlpha?: boolean;
  channels?: string[];
}

export class ImageProcessor {
  private static async ensureInitialized(): Promise<void> {
    const initializer = MagickInitializer.getInstance();
    if (!initializer.isInitialized()) {
      await initializer.initialize();
    }
  }

  private static getMetadata(image: IMagickImage, filename: string): ImageMetadata {
    // Get buffer size from image
    const bufferSize = image.write(data => data.length);

    return {
      format: image.format.toString(),
      width: image.width,
      height: image.height,
      colorSpace: image.colorSpace.toString(),
      quality: image.quality,
      fileSize: bufferSize,
      compression: image.compression.toString(),
      colorDepth: image.depth,
      filename,
      density: {
        x: image.density.x,
        y: image.density.y,
        units: image.density.units.toString()
      },
      hasAlpha: image.hasAlpha,
      channels: image.channels.map(c => c.toString())
    };
  }

  static async processBuffer(buffer: Buffer, options: ProcessingOptions, originalFilename: string): Promise<{
    processedBuffer: Buffer;
    metadata: {
      original: ImageMetadata;
      processed: ImageMetadata;
    };
  }> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      try {
        ImageMagick.read(buffer, async (img) => {
          const originalMetadata = this.getMetadata(img, originalFilename);

          // Apply optimizations if enabled
          if (options.optimization?.enabled) {
            switch (options.optimization.level) {
              case 'low':
                img.strip();
                break;
              case 'medium':
                img.strip();
                img.optimize();
                break;
              case 'high':
                img.strip();
                img.optimize();
                break;
            }
          }

          // Apply resize if enabled
          if (options.resize?.enabled) {
            const geometry = new MagickGeometry(
              options.resize.width,
              options.resize.height
            );
            geometry.ignoreAspectRatio = !options.resize.maintainAspectRatio;
            img.resize(geometry);
          }

          // Apply compression if enabled
          if (options.compression?.enabled) {
            img.quality = options.compression.level;
          }

          // Set output format and quality
          const format = MagickFormat[options.format.toUpperCase() as keyof typeof MagickFormat];
          img.format = format;
          img.quality = options.quality;

          // Process the image and get the buffer
          img.write(data => {
            const processedBuffer = Buffer.from(data);
            
            // Create new ImageMagick instance for processed metadata
            ImageMagick.read(processedBuffer, (processedImg) => {
              const processedMetadata = this.getMetadata(
                processedImg,
                `processed-${originalFilename}`
              );

              resolve({
                processedBuffer,
                metadata: {
                  original: originalMetadata,
                  processed: processedMetadata
                }
              });
            });
          }, format);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}