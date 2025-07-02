import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { withAdminAuth, AdminContext } from '@/lib/admin-auth';
import { ErrorType } from '@/types';

// ================================================================
// Types
// ================================================================

interface StatsOverview {
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  total_stories: number;
  stories_24h: number;
  stories_7d: number;
  total_videos: number;
  completed_videos: number;
  processing_videos: number;
  failed_videos: number;
  total_storage_mb: number;
}

interface DailyStats {
  date: string;
  stories_created: number;
  videos_created: number;
  unique_users: number;
}

// ================================================================
// GET /api/admin/stats
// Get admin statistics
// ================================================================

async function getStats(
  _request: NextRequest,
  _context: AdminContext
): Promise<NextResponse> {
  try {
    const supabase = createAdminClient();
    
    // Get overview stats
    const { data: statsData, error: statsError } = await supabase
      .from('stats_view')
      .select('*')
      .single();
    
    if (statsError) {
      console.error('[getStats] Stats view error:', statsError);
      
      // Fallback to manual calculation if view fails
      const overview = await calculateStatsManually(supabase);
      const daily = await getDailyStats(supabase);
      
      return NextResponse.json({
        success: true,
        data: {
          overview,
          daily,
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Get daily stats for the last 30 days
    const { data: dailyData, error: dailyError } = await supabase
      .from('daily_stats_view')
      .select('*')
      .order('date', { ascending: true });
    
    if (dailyError) {
      console.error('[getStats] Daily stats error:', dailyError);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        overview: statsData as StatsOverview,
        daily: dailyData || [],
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[getStats] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch statistics',
        type: ErrorType.INTERNAL,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// ================================================================
// Helper Functions
// ================================================================

/**
 * Calculate stats manually as fallback
 */
async function calculateStatsManually(supabase: any): Promise<StatsOverview> {
  try {
    // Get user stats
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    // Get story stats
    const { count: totalStories } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true });
    
    const { count: stories24h } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    const { count: stories7d } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    // Get video stats
    const { data: videoStats } = await supabase
      .from('videos')
      .select('status')
      .throwOnError();
    
    const videoCounts = videoStats?.reduce((acc: any, video: any) => {
      acc.total++;
      if (video.status === 'completed') acc.completed++;
      else if (video.status === 'processing') acc.processing++;
      else if (video.status === 'error') acc.failed++;
      return acc;
    }, { total: 0, completed: 0, processing: 0, failed: 0 }) || { total: 0, completed: 0, processing: 0, failed: 0 };
    
    // Calculate active users
    const { data: activeUsers7d } = await supabase
      .from('stories')
      .select('uid', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    const uniqueUsers7d = new Set(activeUsers7d?.map((s: any) => s.uid) || []).size;
    
    const { data: activeUsers30d } = await supabase
      .from('stories')
      .select('uid', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    const uniqueUsers30d = new Set(activeUsers30d?.map((s: any) => s.uid) || []).size;
    
    // Calculate storage
    const { data: storageData } = await supabase
      .from('videos')
      .select('size_mb')
      .eq('status', 'completed');
    
    const totalStorageMb = storageData?.reduce((sum: number, v: any) => sum + (v.size_mb || 0), 0) || 0;
    
    return {
      total_users: totalUsers || 0,
      active_users_7d: uniqueUsers7d,
      active_users_30d: uniqueUsers30d,
      total_stories: totalStories || 0,
      stories_24h: stories24h || 0,
      stories_7d: stories7d || 0,
      total_videos: videoCounts.total,
      completed_videos: videoCounts.completed,
      processing_videos: videoCounts.processing,
      failed_videos: videoCounts.failed,
      total_storage_mb: totalStorageMb,
    };
  } catch (error) {
    console.error('[calculateStatsManually] Error:', error);
    return {
      total_users: 0,
      active_users_7d: 0,
      active_users_30d: 0,
      total_stories: 0,
      stories_24h: 0,
      stories_7d: 0,
      total_videos: 0,
      completed_videos: 0,
      processing_videos: 0,
      failed_videos: 0,
      total_storage_mb: 0,
    };
  }
}

/**
 * Get daily statistics
 */
async function getDailyStats(supabase: any): Promise<DailyStats[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get stories created per day
    const { data: stories } = await supabase
      .from('stories')
      .select('created_at, uid')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });
    
    // Get videos created per day
    const { data: videos } = await supabase
      .from('videos')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });
    
    // Process data by day
    const dailyMap = new Map<string, DailyStats>();
    
    // Initialize all days
    for (let i = 0; i <= 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (30 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      dailyMap.set(dateStr, {
        date: dateStr,
        stories_created: 0,
        videos_created: 0,
        unique_users: 0,
      });
    }
    
    // Count stories and unique users by day
    const usersByDay = new Map<string, Set<string>>();
    
    stories?.forEach((story: any) => {
      const dateStr = story.created_at.split('T')[0];
      const stats = dailyMap.get(dateStr);
      if (stats) {
        stats.stories_created++;
        
        if (!usersByDay.has(dateStr)) {
          usersByDay.set(dateStr, new Set());
        }
        usersByDay.get(dateStr)!.add(story.uid);
      }
    });
    
    // Count videos by day
    videos?.forEach((video: any) => {
      const dateStr = video.created_at.split('T')[0];
      const stats = dailyMap.get(dateStr);
      if (stats) {
        stats.videos_created++;
      }
    });
    
    // Set unique users count
    usersByDay.forEach((users, dateStr) => {
      const stats = dailyMap.get(dateStr);
      if (stats) {
        stats.unique_users = users.size;
      }
    });
    
    return Array.from(dailyMap.values());
  } catch (error) {
    console.error('[getDailyStats] Error:', error);
    return [];
  }
}

// ================================================================
// Export handlers
// ================================================================

export const GET = withAdminAuth(getStats);