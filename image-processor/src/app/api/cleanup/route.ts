// app/api/cleanup/route.ts
import { NextResponse } from 'next/server';
import { cleanupOldUploads } from '../../lib/uploadUtils'

export async function POST() {
  try {
    await cleanupOldUploads();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}