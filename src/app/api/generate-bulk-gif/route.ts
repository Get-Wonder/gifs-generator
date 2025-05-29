export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import { writeFile, readFile, unlink, mkdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

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
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const fontPath = join(__dirname, '../../../../Roboto-Regular.ttf')
    .replace(/\\/g, '/')
    .replace(':', '\\:');

  const outputFolder = '/tmp';

  try {
    await stat(outputFolder);
    console.log(`✅ Found existing tmp folder at ${outputFolder}`);
  } catch {
    console.log(`⚠️ tmp folder not found at ${outputFolder}, creating it...`);
    await mkdir(outputFolder, { recursive: true });
    console.log('✅ tmp folder created');
  }

  const timestamp = Date.now();
  const tempVideoPath = join(outputFolder, `input-${timestamp}.mp4`).replace(/\\/g, '/');
  const tempFiles: string[] = [tempVideoPath];
  
  try {
    console.log('🔹 Step 1: Parsing request JSON');
    const { videoUrl, variables, fileContents, gifName } = await request.json();

    console.log('🔹 Step 2: Downloading video');
    const videoResponse = await fetch(videoUrl);
    const videoBuffer = await videoResponse.arrayBuffer();
    await writeFile(tempVideoPath, Buffer.from(videoBuffer));
    console.log('✅ Video downloaded and saved');

    // Calculate total number of GIFs to generate
    const maxLines = Math.max(...Object.values(fileContents as {[key: string]: string[]}).map((lines: string[]) => lines.length));
    
    if (maxLines === 0) {
      return NextResponse.json(
        { error: 'Los archivos de texto están vacíos' },
        { status: 400 }
      );
    }

    console.log(`🔹 Step 3: Generating ${maxLines} GIFs`);
    const zip = new JSZip();

    // Generate each GIF
    for (let i = 0; i < maxLines; i++) {
      console.log(`🔸 Generating GIF ${i + 1}/${maxLines}`);
      
      // Prepare variables for this iteration
      const currentVariables: Record<string, VariableData> = {};
      Object.entries(variables as Record<string, VariableData>).forEach(([key, data]) => {
        let value = data.value.trim() === "" ? " " : data.value;
        
        // If this variable has file content and the line exists, use it
        const fileContent = fileContents[key] as string[] | undefined;
        if (fileContent && fileContent[i]) {
          value = fileContent[i];
        }
        
        currentVariables[key] = {
          ...data,
          value: value
        };
      });

      // Generate GIF for current variables
      const outputGifPath = join(outputFolder, `output-${timestamp}-${i}.gif`).replace(/\\/g, '/');
      tempFiles.push(outputGifPath);

      // Create text files for this iteration
      const textFilePaths: string[] = [];
      const filterStrings = await Promise.all(
        Object.entries(currentVariables).map(async ([, data], index) => {
          const rawTextFilePath = join(outputFolder, `text-${timestamp}-${i}-${index}.txt`).replace(/\\/g, '/');
          await writeFile(rawTextFilePath, data.value);
          textFilePaths.push(rawTextFilePath);
          tempFiles.push(rawTextFilePath);

          const ffmpegTextFilePath = rawTextFilePath.replace(':', '\\:');

          const fontsize = `${parseInt(data.position.fontSize)}`;
          const fontcolor = data.position.color;
          const horizontalCenter = data.position.horizontalCenter;

          const x = horizontalCenter ? '(w-text_w)/2' : `(w*${parseFloat(data.position.left)}/100)`;
          const shadowX = horizontalCenter ? '(w-text_w)/2+2' : `(w*${parseFloat(data.position.left)}/100)+2`;
          const y = `(h*${parseFloat(data.position.top)}/100)`;
          const shadowY = `(h*${parseFloat(data.position.top)}/100)+2`;

          return [
            `drawtext=textfile='${ffmpegTextFilePath}':x=${shadowX}:y=${shadowY}:fontsize=${fontsize}:fontcolor=black:fontfile='${fontPath}'`,
            `drawtext=textfile='${ffmpegTextFilePath}':x=${x}:y=${y}:fontsize=${fontsize}:fontcolor=${fontcolor}:fontfile='${fontPath}'`
          ].join(',');
        })
      );

      const filterComplex = filterStrings.join(',');

      // Generate GIF using FFmpeg
      await new Promise((resolve, reject) => {
        const command = ffmpeg(tempVideoPath)
          .outputOptions(['-vf', filterComplex, '-f', 'gif', '-loop', '0', '-r', '10'])
          .output(outputGifPath);

        command
          .on('end', () => {
            console.log(`✅ GIF ${i + 1} generated successfully`);
            resolve(null);
          })
          .on('error', (err) => {
            console.error(`❌ FFmpeg error for GIF ${i + 1}:`, err);
            reject(err);
          })
          .run();
      });

      // Read generated GIF and add to ZIP
      const gifBuffer = await readFile(outputGifPath);
      zip.file(`${gifName}_${i + 1}.gif`, gifBuffer);
    }

    console.log('🔹 Step 4: Creating ZIP file');
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    console.log('🔹 Step 5: Returning ZIP response');
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${gifName}_bulk.zip"`,
      },
    });
  } catch (error) {
    console.error('❌ Error generating bulk GIFs:', error);
    return NextResponse.json(
      { error: 'Failed to generate bulk GIFs', details: String(error) },
      { status: 500 }
    );
  } finally {
    console.log('🔹 Step 6: Cleaning up temp files');
    const cleanupTasks = tempFiles.map((path) => unlink(path).catch(() => {}));
    await Promise.all(cleanupTasks);
    console.log('✅ Temp files cleaned up');
  }
} 