import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToS3 } from '@/services/s3Service';
import { saveGifToDatabase } from '@/services/dbService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const variablesJson = formData.get('variables') as string;
    
    if (!file || !name) {
      return NextResponse.json(
        { error: 'File and name are required' },
        { status: 400 }
      );
    }

    // Parse variables
    const variables = variablesJson ? JSON.parse(variablesJson) : [];

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate a unique key for the file
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const key = `videos/${timestamp}.${extension}`;

    // Upload video to S3
    const videoUrl = await uploadFileToS3(
      process.env.DO_SPACES_BUCKET!,
      key,
      buffer,
      file.type
    );

    // Save GIF data to database
    const gifId = await saveGifToDatabase({
      name,
      videoUrl,
      variables: variables.map((v: { name: string }) => v.name).filter((name: string) => name.trim() !== '')
    });

    return NextResponse.json({ 
      id: gifId,
      name,
      videoUrl,
      message: 'GIF saved successfully'
    });
  } catch (error) {
    console.error('Error saving GIF:', error);
    return NextResponse.json(
      { error: 'Failed to save GIF' },
      { status: 500 }
    );
  }
} 