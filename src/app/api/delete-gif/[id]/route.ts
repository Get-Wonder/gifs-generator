import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gifId = parseInt(params.id);

    if (isNaN(gifId)) {
      return NextResponse.json(
        { error: 'Invalid GIF ID' },
        { status: 400 }
      );
    }

    // Check if GIF exists
    const existingGif = await prisma.gif.findUnique({
      where: { id: gifId }
    });

    if (!existingGif) {
      return NextResponse.json(
        { error: 'GIF not found' },
        { status: 404 }
      );
    }

    // Delete the GIF
    await prisma.gif.delete({
      where: { id: gifId }
    });

    return NextResponse.json({ 
      message: 'GIF deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting GIF:', error);
    return NextResponse.json(
      { error: 'Failed to delete GIF' },
      { status: 500 }
    );
  }
} 