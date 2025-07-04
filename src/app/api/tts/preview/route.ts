import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateUid } from '@/lib/uid-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const uid = await getOrCreateUid(request);
    
    if (!uid) {
      return NextResponse.json(
        { error: 'UID not found' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { storyId, beatIndex } = body;

    // Validate input
    if (!storyId || typeof storyId !== 'string') {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    if (typeof beatIndex !== 'number' || beatIndex < 0) {
      return NextResponse.json(
        { error: 'Valid beat index is required' },
        { status: 400 }
      );
    }

    console.log(`🎤 音声プレビュー要求: Story ${storyId}, Beat ${beatIndex}`);

    // Get the video record with audio preview data
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, audio_preview_data')
      .eq('story_id', storyId)
      .eq('uid', uid)
      .single();

    if (videoError || !video) {
      console.error('Video not found:', videoError);
      return NextResponse.json(
        { error: 'Video record not found' },
        { status: 404 }
      );
    }

    // Check if audio preview data exists
    const audioPreviewData = video.audio_preview_data as any;
    if (!audioPreviewData?.audioFiles) {
      return NextResponse.json(
        { error: 'Audio preview not generated yet' },
        { status: 404 }
      );
    }

    // Find the audio file for the requested beat
    const audioFile = audioPreviewData.audioFiles.find(
      (file: any) => file.beatIndex === beatIndex
    );

    if (!audioFile) {
      return NextResponse.json(
        { error: `Audio not found for beat ${beatIndex}` },
        { status: 404 }
      );
    }

    console.log(`✅ 音声ファイルを取得: ${audioFile.url}`);

    // Fetch the audio file from Supabase storage
    const audioResponse = await fetch(audioFile.url);
    if (!audioResponse.ok) {
      throw new Error('Failed to fetch audio file');
    }

    const audioBuffer = await audioResponse.arrayBuffer();

    // Return audio data
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('TTS preview error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get audio preview' },
      { status: 500 }
    );
  }
}