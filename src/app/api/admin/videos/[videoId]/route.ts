import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase';

// ================================================================
// Types
// ================================================================

// ================================================================
// Helper Functions
// ================================================================

async function checkAdminAuth(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized' };
  }
  
  const adminSupabase = createAdminClient();
  const { data: admin, error: adminError } = await adminSupabase
    .from('admins')
    .select('id, is_active')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();
  
  if (adminError || !admin) {
    return { authorized: false, error: 'Admin access required' };
  }
  
  return { authorized: true };
}

// ================================================================
// API Route Handler
// ================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    // Await params as required by Next.js 15
    const { videoId } = await params;
    
    // Check admin authentication
    const authResult = await checkAdminAuth(request);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    
    const adminSupabase = createAdminClient();
    
    // Fetch video first
    const { data: video, error: videoError } = await adminSupabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();
    
    if (videoError || !video) {
      console.error('[video-detail] Error fetching video:', videoError);
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
    
    // Fetch story details separately
    let story = null;
    if (video.story_id) {
      const { data: storyData, error: storyError } = await adminSupabase
        .from('stories')
        .select('id, title, created_at')
        .eq('id', video.story_id)
        .maybeSingle();
      
      if (!storyError && storyData) {
        story = storyData;
      } else if (storyError) {
        console.error('[video-detail] Error fetching story:', storyError);
      }
    }
    
    // Fetch storyboard using story_id
    let storyboard = null;
    if (video.story_id) {
      const { data: storyboardData, error: storyboardError } = await adminSupabase
        .from('storyboards')
        .select('id, story_data, mulmoscript, created_at')
        .eq('id', video.story_id)
        .single();
      
      if (!storyboardError && storyboardData) {
        storyboard = storyboardData;
      }
    }
    
    const response = {
      video: {
        id: video.id,
        uid: video.uid,
        story_id: video.story_id,
        status: video.status,
        url: video.video_url || video.url,  // Changed from video_url to url
        title: video.title,
        created_at: video.created_at,
        updated_at: video.updated_at,
        duration_sec: video.duration || video.duration_sec,  // Changed to match VideoWithRelations
        resolution: video.resolution,
        size_mb: video.size_mb,  // Added size_mb
        error_msg: video.error_msg,  // Added error_msg
        storyboard: storyboard,
        story: story || { id: video.story_id, title: 'Unknown', created_at: video.created_at }
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[video-detail] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}