import { prisma } from '../lib/prisma';

export interface GifData {
  name: string;
  videoUrl: string;
  variables: string[];
}

interface VariableWithStyles {
  name: string;
  value: string;
  styles: {
    top: number;
    left: number;
    fontSize: number;
    color: string;
    horizontallyCentered: boolean;
  };
}

export interface DatabaseGif {
  id: number;
  name: string;
  videoUrl: string | null;
  gifUrl: string | null;
  variables: VariableWithStyles[] | null;
}

export const saveGifToDatabase = async (gifData: GifData): Promise<number> => {
  try {
    // Transform variables to include styles with placeholder values
    const variablesWithStyles: VariableWithStyles[] = gifData.variables.map(variableName => ({
      name: variableName,
      value: variableName,
      styles: {
        top: 45,
        left: 45,
        fontSize: 68,
        color: "#ffffff",
        horizontallyCentered: false
      }
    }));

    const gif = await prisma.gif.create({
      data: {
        name: gifData.name,
        videoUrl: gifData.videoUrl,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variables: variablesWithStyles as any
      }
    });
    
    return gif.id;
  } catch (error) {
    console.error('Error saving GIF to database:', error);
    throw new Error('Failed to save GIF to database');
  }
};

export const getAllGifsFromDatabase = async (): Promise<DatabaseGif[]> => {
  try {
    const gifs = await prisma.gif.findMany({
      orderBy: {
        id: 'desc'
      }
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return gifs.map((gif: any) => ({
      id: gif.id,
      name: gif.name,
      videoUrl: gif.videoUrl,
      gifUrl: gif?.gifUrl,
      variables: gif.variables as VariableWithStyles[] | null
    }));
  } catch (error) {
    console.error('Error fetching GIFs from database:', error);
    throw new Error('Failed to fetch GIFs from database');
  }
};

export const updateGifVariables = async (
  gifId: number, 
  variables: { [key: string]: { value: string; position: { top: string; left: string; fontSize: string; color: string; horizontalCenter?: boolean } } }
): Promise<void> => {
  try {
    // Transform variables from component format to database format
    const variablesWithStyles: VariableWithStyles[] = Object.entries(variables).map(([name, data]) => ({
      name,
      value: data.value,
      styles: {
        top: parseFloat(data.position.top),
        left: parseFloat(data.position.left),
        fontSize: parseInt(data.position.fontSize),
        color: data.position.color,
        horizontallyCentered: data.position.horizontalCenter || false
      }
    }));

    await prisma.gif.update({
      where: { id: gifId },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variables: variablesWithStyles as any
      }
    });
  } catch (error) {
    console.error('Error updating GIF variables:', error);
    throw new Error('Failed to update GIF variables');
  }
}; 