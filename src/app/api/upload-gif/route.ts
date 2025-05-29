import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToS3 } from '@/services/s3Service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const gifFile = formData.get('gifFile') as File;
    const gifId = formData.get('gifId') as string;
    
    if (!gifFile || !gifId) {
      return NextResponse.json(
        { error: 'GIF file and ID are required' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await gifFile.arrayBuffer());
    
    // Generate a unique key for the GIF file
    const timestamp = Date.now();
    const key = `gifs/${timestamp}-${gifFile.name}`;

    // Upload GIF to S3
    const gifUrl = await uploadFileToS3(
      process.env.DO_SPACES_BUCKET!,
      key,
      buffer,
      'image/gif'
    );

    // Update the database with the new gifUrl
    await prisma.gif.update({
      where: { id: parseInt(gifId) },
      data: { gifUrl }
    });

    return NextResponse.json({ 
      gifUrl,
      message: 'GIF uploaded and saved successfully'
    });
  } catch (error) {
    console.error('Error uploading GIF:', error);
    return NextResponse.json(
      { error: 'Failed to upload GIF' },
      { status: 500 }
    );
  }
} 