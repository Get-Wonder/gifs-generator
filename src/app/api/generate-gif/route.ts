import { NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface VariableData {
  value: string;
  position: {
    top: string;
    left: string;
    fontSize: string;
    color: string;
  };
}

export async function POST(request: Request) {
  try {
    console.log('🔹 Step 1: Parsing request JSON');
    const { videoUrl, variables } = await request.json();

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const fontPath = join(__dirname, '../../../../Roboto-Regular.ttf').replace(/\\/g, '/').replace(':', '\\:');
    console.log('🔹 Resolved font path:', fontPath);

    const outputFolder = join(process.cwd(), 'tmp');
    await mkdir(outputFolder, { recursive: true });
    console.log('🔹 Ensured tmp folder exists:', outputFolder);

    const timestamp = Date.now();
    const tempVideoPath = join(outputFolder, `input-${timestamp}.mp4`).replace(/\\/g, '/');
    const outputGifPath = join(outputFolder, `output-${timestamp}.gif`).replace(/\\/g, '/');
    console.log('🔹 Temp video path:', tempVideoPath);
    console.log('🔹 Output GIF path:', outputGifPath);

    console.log('🔹 Step 2: Downloading video');
    const videoResponse = await fetch(videoUrl);
    const videoBuffer = await videoResponse.arrayBuffer();
    await writeFile(tempVideoPath, Buffer.from(videoBuffer));
    console.log('✅ Video downloaded and saved');

    const textFilePaths: string[] = [];

    console.log('🔹 Step 3: Writing variable text files and building FFmpeg filters');
    const filterStrings = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Object.entries(variables as Record<string, VariableData>).map(async ([key, data], index) => {
        const rawTextFilePath = join(outputFolder, `text-${timestamp}-${index}.txt`).replace(/\\/g, '/');
        await writeFile(rawTextFilePath, data.value);
        textFilePaths.push(rawTextFilePath);
    
        const ffmpegTextFilePath = rawTextFilePath.replace(':', '\\:');
    
        const x = `${parseFloat(data.position.left.replace('%', ''))}*w/100`;
        const y = `${parseFloat(data.position.top.replace('%', ''))}*h/100`;
        const fontsize = parseInt(data.position.fontSize.replace('px', ''), 10);
        const fontcolor = data.position.color;
    
        return [
            `drawtext=textfile='${ffmpegTextFilePath}':x=(w-text_w)/2+2:y=${y}+2:fontsize=${fontsize}:fontcolor=black:fontfile='${fontPath}'`,
            `drawtext=textfile='${ffmpegTextFilePath}':x=(w-text_w)/2:y=${y}:fontsize=${fontsize}:fontcolor=${fontcolor}:fontfile='${fontPath}'`
          ].join(',');

      })
    );

    const filterComplex = filterStrings.join(',');

    console.log('🔹 Step 4: Configuring FFmpeg command');
    const command = ffmpeg(tempVideoPath)
      .outputOptions(['-vf', filterComplex, '-f', 'gif', '-loop', '0', '-r', '10'])
      .output(outputGifPath);

    const ffmpegCommandString = [
      'ffmpeg',
      '-i', tempVideoPath,
      '-y',
      '-vf', `"${filterComplex}"`,
      '-f', 'gif',
      '-loop', '0',
      '-r', '10',
      outputGifPath,
    ].join(' ');

    console.log('🔹 FFmpeg full command for manual testing:\n', ffmpegCommandString);

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

    console.log('🔹 Step 7: Cleaning up temp files');
    const cleanupTasks = [
      unlink(tempVideoPath),
      unlink(outputGifPath),
      ...textFilePaths.map((path) => unlink(path)),
    ];
    await Promise.all(cleanupTasks);
    console.log('✅ Temp files cleaned up');

    console.log('🔹 Step 8: Returning response');
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
  }
}
