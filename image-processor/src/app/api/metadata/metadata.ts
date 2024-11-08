// src/app/api/metadata/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    try {
      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Get metadata using sharp
      const metadata = await sharp(buffer).metadata();

      return NextResponse.json({
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: file.size,
        channels: metadata.channels,
        space: metadata.space,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation
      });

    } catch (error) {
      console.error('Metadata extraction error:', error);
      return NextResponse.json(
        { error: 'Failed to extract metadata' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Request handling error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}