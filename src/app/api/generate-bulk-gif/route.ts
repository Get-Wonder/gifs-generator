export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { ffmpegUtils } from '../utils/ffmpeg';

interface VariableData {
  value: string;
  position: {
    top: string;
    left: string;
    fontSize: string;
    color: string;
    horizontalCenter?: boolean;
  };
}

export async function POST(request: Request) {
  try {
    console.log('🔹 Step 1: Parsing request JSON');
    const { videoUrl, variables, fileContents, gifName } = await request.json();

    console.log('🔹 Step 2: Generating bulk GIFs using centralized utility');
    const { gifs, cleanup } = await ffmpegUtils.generateBulkGifs(
      videoUrl,
      variables as Record<string, VariableData>,
      fileContents as { [key: string]: string[] },
      gifName as string
    );

    console.log('🔹 Step 3: Creating ZIP file');
    const zip = new JSZip();

    // Add all generated GIFs to the ZIP
    gifs.forEach(({ filename, buffer }) => {
      zip.file(filename, buffer);
    });

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    console.log('🔹 Step 4: Returning ZIP response');
    const response = new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${gifName}_bulk.zip"`,
      },
    });

    // Schedule cleanup to run after response is sent
    // Note: We don't await this to avoid delaying the response
    cleanup().catch((err) => console.error('Cleanup error:', err));

    return response;
  } catch (error) {
    console.error('❌ Error generating bulk GIFs:', error);
    return NextResponse.json(
      { error: 'Failed to generate bulk GIFs', details: String(error) },
      { status: 500 }
    );
  }
} 