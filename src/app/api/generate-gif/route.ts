export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
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
    const { videoUrl, variables } = await request.json();

    console.log('🔹 Step 2: Sanitizing variables');
    const sanitizedVariables = ffmpegUtils.sanitizeVariables(variables as Record<string, VariableData>);

    console.log('🔹 Step 3: Generating GIF using centralized utility');
    const { gifBuffer, cleanup } = await ffmpegUtils.generateSingleGif(videoUrl, sanitizedVariables);

    console.log('🔹 Step 4: Returning response');
    const timestamp = Date.now();
    const response = new NextResponse(gifBuffer, {
      headers: {
        'Content-Type': 'image/gif',
        'Content-Disposition': `attachment; filename="generated-${timestamp}.gif"`,
      },
    });

    // Schedule cleanup to run after response is sent
    // Note: We don't await this to avoid delaying the response
    cleanup().catch((err) => console.error('Cleanup error:', err));

    return response;
  } catch (error) {
    console.error('❌ Error generating GIF:', error);
    return NextResponse.json(
      { error: 'Failed to generate GIF', details: String(error) },
      { status: 500 }
    );
  }
}
