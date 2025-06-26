import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { uploadVideoToStorage } from './supabase';
import type { Story, Mulmoscript } from './schemas';

// ================================================================
// Types
// ================================================================

export interface VideoGenerationOptions {
  resolution?: string;
  fps?: number;
  duration?: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
}

export interface VideoGenerationResult {
  url: string;
  path: string;
  duration_sec: number;
  resolution: string;
  size_mb: number;
}

// ================================================================
// FFmpeg Video Generation
// ================================================================

/**
 * Generate video using FFmpeg from story/script content
 */
export async function generateVideo(
  story: Story,
  options: VideoGenerationOptions = {}
): Promise<VideoGenerationResult> {
  const {
    resolution = '1920x1080',
    fps = 30,
    duration = 30,
    backgroundColor = '#1a1a1a',
    textColor = 'white',
    fontSize = 48,
  } = options;

  // Create temporary directory for processing
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-gen-'));
  const outputPath = path.join(tempDir, `${story.id}.mp4`);

  try {
    // Prepare text content for video
    const textContent = prepareTextContent(story);
    
    // Generate video with FFmpeg
    await generateVideoWithFFmpeg({
      text: textContent,
      outputPath,
      resolution,
      fps,
      duration,
      backgroundColor,
      textColor,
      fontSize,
    });

    // Read generated video file
    const videoBuffer = await fs.readFile(outputPath);
    const videoSizeMB = videoBuffer.length / (1024 * 1024);

    // Upload to Supabase Storage
    const fileName = `${story.id}_${Date.now()}.mp4`;
    const { url, path: storagePath } = await uploadVideoToStorage(
      videoBuffer,
      fileName,
      'video/mp4'
    );

    return {
      url,
      path: storagePath,
      duration_sec: duration,
      resolution,
      size_mb: Number(videoSizeMB.toFixed(2)),
    };

  } finally {
    // Clean up temporary files
    await cleanupTempFiles(tempDir);
  }
}

/**
 * Generate video using FFmpeg from Mulmoscript
 */
export async function generateVideoFromScript(
  story: Story,
  script: Mulmoscript,
  options: VideoGenerationOptions = {}
): Promise<VideoGenerationResult> {
  const {
    resolution = (script.canvasSize ? `${script.canvasSize.width}x${script.canvasSize.height}` : '1280x720'),
    fps = 30,
    backgroundColor = '#1a1a1a',
    textColor = 'white',
    fontSize = 48,
  } = options;

  const duration = Math.ceil((script.beats || []).reduce((sum, beat) => sum + (beat.duration || 0), 0));
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-gen-'));
  const outputPath = path.join(tempDir, `${story.id}.mp4`);

  try {
    // Generate video segments for each scene
    const videoSegments: string[] = [];
    
    for (let i = 0; i < (script.beats || []).length; i++) {
      const scene = (script.beats || [])[i];
      const segmentPath = path.join(tempDir, `segment_${i}.mp4`);
      
      await generateVideoWithFFmpeg({
        text: scene.text,
        outputPath: segmentPath,
        resolution,
        fps,
        duration: scene.duration || 3,
        backgroundColor,
        textColor,
        fontSize,
      });
      
      videoSegments.push(segmentPath);
    }

    // Concatenate video segments
    await concatenateVideoSegments(videoSegments, outputPath);

    // Read generated video file
    const videoBuffer = await fs.readFile(outputPath);
    const videoSizeMB = videoBuffer.length / (1024 * 1024);

    // Upload to Supabase Storage
    const fileName = `${story.id}_${Date.now()}.mp4`;
    const { url, path: storagePath } = await uploadVideoToStorage(
      videoBuffer,
      fileName,
      'video/mp4'
    );

    return {
      url,
      path: storagePath,
      duration_sec: duration,
      resolution,
      size_mb: Number(videoSizeMB.toFixed(2)),
    };

  } finally {
    // Clean up temporary files
    await cleanupTempFiles(tempDir);
  }
}

// ================================================================
// Helper Functions
// ================================================================

/**
 * Prepare text content for video generation
 */
function prepareTextContent(story: Story): string {
  // Extract meaningful text from story
  const title = story.title || 'Untitled Story';
  const content = story.text_raw || '';
  
  // Create formatted text for video
  return `${title}\\n\\n${content}`;
}

/**
 * Find available font file on the system
 */
async function findAvailableFont(): Promise<string> {
  const fontPaths = [
    '/System/Library/Fonts/Arial.ttf',           // macOS
    '/System/Library/Fonts/Helvetica.ttc',      // macOS
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', // Linux
    '/Windows/Fonts/arial.ttf',                 // Windows
  ];
  
  for (const fontPath of fontPaths) {
    try {
      await fs.access(fontPath);
      return fontPath;
    } catch {
      continue;
    }
  }
  
  return ''; // Use default font
}

/**
 * Generate video segment using FFmpeg
 */
async function generateVideoWithFFmpeg(params: {
  text: string;
  outputPath: string;
  resolution: string;
  fps: number;
  duration: number;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
}): Promise<void> {
  const {
    text,
    outputPath,
    resolution,
    fps,
    duration,
    backgroundColor,
    textColor,
    fontSize,
  } = params;

  // Escape text for FFmpeg
  const escapedText = text
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .substring(0, 200); // Limit text length

  // Find available font file
  const fontFile = await findAvailableFont();

  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      '-f', 'lavfi',
      '-i', `color=${backgroundColor}:size=${resolution}:duration=${duration}:rate=${fps}`,
      '-vf', fontFile 
        ? `drawtext=text='${escapedText}':fontcolor=${textColor}:fontsize=${fontSize}:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=${fontFile}`
        : `drawtext=text='${escapedText}':fontcolor=${textColor}:fontsize=${fontSize}:x=(w-text_w)/2:y=(h-text_h)/2`,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-y', // Overwrite output file
      outputPath,
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

/**
 * Concatenate multiple video segments
 */
async function concatenateVideoSegments(
  segmentPaths: string[],
  outputPath: string
): Promise<void> {
  if (segmentPaths.length === 1) {
    // Single segment, just copy
    await fs.copyFile(segmentPaths[0], outputPath);
    return;
  }

  return new Promise((resolve, reject) => {
    // Create concat file list
    const concatList = segmentPaths
      .map(path => `file '${path}'`)
      .join('\n');

    const concatFilePath = path.join(path.dirname(outputPath), 'concat.txt');
    
    fs.writeFile(concatFilePath, concatList).then(() => {
      const ffmpegArgs = [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatFilePath,
        '-c', 'copy',
        '-y', // Overwrite output file
        outputPath,
      ];

      const ffmpeg = spawn('ffmpeg', ffmpegArgs);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg concat failed with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg concat spawn error: ${error.message}`));
      });
    }).catch(reject);
  });
}

/**
 * Clean up temporary files and directories
 */
async function cleanupTempFiles(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to clean up temp directory ${tempDir}:`, error);
  }
}

// ================================================================
// Video Processing Utils
// ================================================================

/**
 * Get video information using FFprobe
 */
export async function getVideoInfo(filePath: string): Promise<{
  duration: number;
  resolution: string;
  size: number;
}> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);

    let stdout = '';
    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(stdout);
          const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
          
          resolve({
            duration: parseFloat(info.format.duration || '0'),
            resolution: `${videoStream.width}x${videoStream.height}`,
            size: parseInt(info.format.size || '0'),
          });
        } catch (error) {
          reject(new Error(`Failed to parse ffprobe output: ${error}`));
        }
      } else {
        reject(new Error(`FFprobe failed with code ${code}`));
      }
    });

    ffprobe.on('error', (error) => {
      reject(new Error(`FFprobe spawn error: ${error.message}`));
    });
  });
}