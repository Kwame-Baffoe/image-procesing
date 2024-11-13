// lib/imagemagick-config.ts
import { 
  initializeImageMagick,
  IConfigurationFiles
} from '@imagemagick/magick-wasm';
import { readFileSync } from 'fs';
import path from 'path';

// Configuration interface
interface MagickConfig {
  wasmPath: string;
  configFiles?: IConfigurationFiles;
}

export class MagickInitializer {
  private static instance: MagickInitializer;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): MagickInitializer {
    if (!MagickInitializer.instance) {
      MagickInitializer.instance = new MagickInitializer();
    }
    return MagickInitializer.instance;
  }

  async initialize(config?: Partial<MagickConfig>): Promise<void> {
    if (this.initialized) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>(async (resolve, reject) => {
      try {
        let wasmLocation: URL | Uint8Array;

        if (typeof window !== 'undefined') {
          wasmLocation = new URL('/magick.wasm', window.location.origin);
        } else {
          const wasmPath = config?.wasmPath || path.join(process.cwd(), 'public', 'magick.wasm');
          wasmLocation = readFileSync(wasmPath);
        }

        await initializeImageMagick(wasmLocation, config?.configFiles);
        this.initialized = true;
        resolve();
      } catch (error) {
        console.error('ImageMagick initialization failed:', error);
        reject(error);
      }
    });

    return this.initPromise;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}