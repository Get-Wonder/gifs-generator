import { NextRequest, NextResponse } from 'next/server';
import { updateGifVariables } from '@/services/dbService';

export async function PUT(request: NextRequest) {
  try {
    const { gifId, variables } = await request.json();
    
    if (!gifId || !variables) {
      return NextResponse.json(
        { error: 'GIF ID and variables are required' },
        { status: 400 }
      );
    }

    await updateGifVariables(gifId, variables);

    return NextResponse.json({ 
      message: 'GIF variables updated successfully'
    });
  } catch (error) {
    console.error('Error updating GIF variables:', error);
    return NextResponse.json(
      { error: 'Failed to update GIF variables' },
      { status: 500 }
    );
  }
} 