export const runtime = 'nodejs';

import ffmpeg from 'fluent-ffmpeg';
import { writeFile, readFile, unlink, mkdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

interface FFmpegConfig {
  fontPath: string;
  outputFolder: string;
  timestamp: number;
}

export class FFmpegUtils {
  private config: FFmpegConfig;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    this.config = {
      fontPath: join(__dirname, '../../../../Roboto-Regular.ttf')
        .replace(/\\/g, '/')
        .replace(':', '\\:'),
      outputFolder: '/tmp',
      timestamp: Date.now()
    };
  }

  async ensureOutputFolder(): Promise<void> {
    try {
      await stat(this.config.outputFolder);
      console.log(`✅ Found existing tmp folder at ${this.config.outputFolder}`);
    } catch {
      console.log(`⚠️ tmp folder not found at ${this.config.outputFolder}, creating it...`);
      await mkdir(this.config.outputFolder, { recursive: true });
      console.log('✅ tmp folder created');
    }
  }

  async downloadVideo(videoUrl: string): Promise<{ videoPath: string; cleanup: () => Promise<void> }> {
    const tempVideoPath = join(this.config.outputFolder, `input-${this.config.timestamp}.mp4`).replace(/\\/g, '/');
    
    console.log('🔹 Downloading video');
    const videoResponse = await fetch(videoUrl);
    const videoBuffer = await videoResponse.arrayBuffer();
    await writeFile(tempVideoPath, Buffer.from(videoBuffer));
    console.log('✅ Video downloaded and saved');

    return {
      videoPath: tempVideoPath,
      cleanup: async () => {
        await unlink(tempVideoPath).catch(() => {});
      }
    };
  }

  async createTextFilesAndFilters(
    variables: Record<string, VariableData>,
    iterationId?: string | number
  ): Promise<{ filterComplex: string; textFilePaths: string[] }> {
    const textFilePaths: string[] = [];
    const id = iterationId !== undefined ? `-${iterationId}` : '';

    const filterStrings = await Promise.all(
      Object.entries(variables).map(async ([, data], index) => {
        const rawTextFilePath = join(
          this.config.outputFolder, 
          `text-${this.config.timestamp}${id}-${index}.txt`
        ).replace(/\\/g, '/');
        
        await writeFile(rawTextFilePath, data.value);
        textFilePaths.push(rawTextFilePath);

        const ffmpegTextFilePath = rawTextFilePath.replace(':', '\\:');

        const fontsize = `${parseInt(data.position.fontSize)}`;
        const fontcolor = data.position.color;
        const horizontalCenter = data.position.horizontalCenter;

        const x = horizontalCenter ? '(w-text_w)/2' : `(w*${parseFloat(data.position.left)}/100)`;
        const shadowX = horizontalCenter ? '(w-text_w)/2+2' : `(w*${parseFloat(data.position.left)}/100)+2`;
        const y = `(h*${parseFloat(data.position.top)}/100)`;
        const shadowY = `(h*${parseFloat(data.position.top)}/100)+2`;

        return [
          `drawtext=textfile='${ffmpegTextFilePath}':x=${shadowX}:y=${shadowY}:fontsize=${fontsize}:fontcolor=black:fontfile='${this.config.fontPath}'`,
          `drawtext=textfile='${ffmpegTextFilePath}':x=${x}:y=${y}:fontsize=${fontsize}:fontcolor=${fontcolor}:fontfile='${this.config.fontPath}'`
        ].join(',');
      })
    );

    return {
      filterComplex: filterStrings.join(','),
      textFilePaths
    };
  }

  async generateGif(
    videoPath: string,
    filterComplex: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(videoPath)
        .outputOptions(['-vf', filterComplex, '-f', 'gif', '-loop', '0', '-r', '10'])
        .output(outputPath);

      command
        .on('start', (cmdLine) => {
          console.log(`🚀 FFmpeg command: ${cmdLine}`);
        })
        .on('end', () => {
          console.log('✅ FFmpeg finished successfully');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg error:', err);
          reject(err);
        })
        .run();
    });
  }

  async generateSingleGif(
    videoUrl: string,
    variables: Record<string, VariableData>
  ): Promise<{ gifBuffer: Buffer; cleanup: () => Promise<void> }> {
    await this.ensureOutputFolder();
    
    const { videoPath, cleanup: cleanupVideo } = await this.downloadVideo(videoUrl);
    const outputGifPath = join(this.config.outputFolder, `output-${this.config.timestamp}.gif`).replace(/\\/g, '/');
    
    const { filterComplex, textFilePaths } = await this.createTextFilesAndFilters(variables);
    
    await this.generateGif(videoPath, filterComplex, outputGifPath);
    
    const gifBuffer = await readFile(outputGifPath);
    
    const cleanup = async () => {
      await cleanupVideo();
      await unlink(outputGifPath).catch(() => {});
      const cleanupTasks = textFilePaths.map((path) => unlink(path).catch(() => {}));
      await Promise.all(cleanupTasks);
    };

    return { gifBuffer, cleanup };
  }

  async generateBulkGifs(
    videoUrl: string,
    variables: Record<string, VariableData>,
    fileContents: { [key: string]: string[] },
    gifName: string
  ): Promise<{ gifs: { filename: string; buffer: Buffer }[]; cleanup: () => Promise<void> }> {
    await this.ensureOutputFolder();
    
    const { videoPath, cleanup: cleanupVideo } = await this.downloadVideo(videoUrl);
    const tempFiles: string[] = [];
    const gifs: { filename: string; buffer: Buffer }[] = [];

    // Calculate total number of GIFs to generate
    const maxLines = Math.max(...Object.values(fileContents).map((lines: string[]) => lines.length));
    
    if (maxLines === 0) {
      throw new Error('Los archivos de texto están vacíos');
    }

    console.log(`🔹 Generating ${maxLines} GIFs`);

    // Generate each GIF
    for (let i = 0; i < maxLines; i++) {
      console.log(`🔸 Generating GIF ${i + 1}/${maxLines}`);
      
      // Prepare variables for this iteration
      const currentVariables: Record<string, VariableData> = {};
      let filenameValue = `${gifName}_${i + 1}`; // fallback filename
      
      Object.entries(variables).forEach(([key, data]) => {
        let value = data.value.trim() === "" ? " " : data.value;
        
        // If this variable has file content and the line exists, use it
        const fileContent = fileContents[key];
        if (fileContent && fileContent[i]) {
          value = fileContent[i];
          // Use the first variable with file content as the filename
          filenameValue = value.replace(/[^a-zA-Z0-9\-_]/g, '_'); // sanitize filename
        }
        
        currentVariables[key] = {
          ...data,
          value: value
        };
      });

      // Generate GIF for current variables
      const outputGifPath = join(this.config.outputFolder, `output-${this.config.timestamp}-${i}.gif`).replace(/\\/g, '/');
      tempFiles.push(outputGifPath);

      const { filterComplex, textFilePaths } = await this.createTextFilesAndFilters(currentVariables, i);
      tempFiles.push(...textFilePaths);

      await this.generateGif(videoPath, filterComplex, outputGifPath);

      // Read generated GIF
      const gifBuffer = await readFile(outputGifPath);
      gifs.push({
        filename: `${filenameValue}.gif`,
        buffer: gifBuffer
      });

      console.log(`✅ GIF ${i + 1} generated successfully`);
    }

    const cleanup = async () => {
      await cleanupVideo();
      const cleanupTasks = tempFiles.map((path) => unlink(path).catch(() => {}));
      await Promise.all(cleanupTasks);
    };

    return { gifs, cleanup };
  }

  sanitizeVariables(variables: Record<string, VariableData>): Record<string, VariableData> {
    return Object.fromEntries(
      Object.entries(variables).map(([key, data]) => [
        key,
        {
          ...data,
          value: data.value.trim() === "" ? " " : data.value,
        },
      ])
    );
  }
}

// Export a singleton instance for use across the app
export const ffmpegUtils = new FFmpegUtils(); 