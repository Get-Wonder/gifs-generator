import { NextResponse } from 'next/server';
import { getAllGifsFromDatabase } from '@/services/dbService';

export async function GET() {
  try {
    const gifs = await getAllGifsFromDatabase();
    return NextResponse.json(gifs);
  } catch (error) {
    console.error('Error fetching GIFs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GIFs' },
      { status: 500 }
    );
  }
} 