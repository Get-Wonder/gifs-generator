export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    console.log(`⚠️ tmp folder not found at ${outputFolder}, creating it...`);
    await mkdir(outputFolder, { recursive: true });
    console.log('✅ tmp folder created');
  }

  const timestamp = Date.now();
  const tempVideoPath = join(outputFolder, `input-${timestamp}.mp4`).replace(/\\/g, '/');
  const outputGifPath = join(outputFolder, `output-${timestamp}.gif`).replace(/\\/g, '/');
  const textFilePaths: string[] = [];

  try {
    console.log('🔹 Step 1: Parsing request JSON');
    const { videoUrl, variables } = await request.json();

    console.log('🔹 Step 2: Downloading video');
    const videoResponse = await fetch(videoUrl);
    const videoBuffer = await videoResponse.arrayBuffer();
    await writeFile(tempVideoPath, Buffer.from(videoBuffer));
    console.log('✅ Video downloaded and saved');

    console.log('🔹 Step 3: Writing variable text files and building FFmpeg filters');
    const filterStrings = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Object.entries(variables as Record<string, VariableData>).map(async ([key, data], index) => {
        const rawTextFilePath = join(outputFolder, `text-${timestamp}-${index}.txt`).replace(/\\/g, '/');
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
          `drawtext=textfile='${ffmpegTextFilePath}':x=${shadowX}:y=${shadowY}:fontsize=${fontsize}:fontcolor=black:fontfile='${fontPath}'`,
          `drawtext=textfile='${ffmpegTextFilePath}':x=${x}:y=${y}:fontsize=${fontsize}:fontcolor=${fontcolor}:fontfile='${fontPath}'`
        ].join(',');
      })
    );

    const filterComplex = filterStrings.join(',');

    console.log('🔹 Step 4: Configuring FFmpeg command');
    const command = ffmpeg(tempVideoPath)
      .outputOptions(['-vf', filterComplex, '-f', 'gif', '-loop', '0', '-r', '10'])
      .output(outputGifPath);

    // Print the full ffmpeg command line for debugging
    command.on('start', (cmdLine) => {
      console.log(`🚀 FFmpeg command: ${cmdLine}`);
    });

    console.log('🔹 Step 5: Running FFmpeg');
    await new Promise((resolve, reject) => {
      command
        .on('end', () => {
          console.log('✅ FFmpeg finished successfully');
          resolve(null);
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg error:', err);
          reject(err);
        })
        .run();
    });

    console.log('🔹 Step 6: Reading generated GIF');
    const gifBuffer = await readFile(outputGifPath);
    console.log('✅ GIF read into buffer');

    console.log('🔹 Step 7: Returning response');
    return new NextResponse(gifBuffer, {
      headers: {
        'Content-Type': 'image/gif',
        'Content-Disposition': `attachment; filename="generated-${timestamp}.gif"`,
      },
    });
  } catch (error) {
    console.error('❌ Error generating GIF:', error);
    return NextResponse.json(
      { error: 'Failed to generate GIF', details: String(error) },
      { status: 500 }
    );
  } finally {
    console.log('🔹 Step 8: Cleaning up temp files');
    // const cleanupTasks = [
    //   unlink(tempVideoPath).catch(() => {}),
    //   unlink(outputGifPath).catch(() => {}),
    //   ...textFilePaths.map((path) => unlink(path).catch(() => {})),
    // ];
    // await Promise.all(cleanupTasks);
    console.log('✅ Temp files cleaned up');
  }
}
