#!/usr/bin/env node

/**
 * list-recent-videos.js
 * 最近の動画IDをリスト表示（一貫性チェック用）
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function listRecentVideos() {
  const limit = parseInt(process.argv[2]) || 10;
  
  console.log(chalk.blue(`\n📹 Fetching recent ${limit} videos...\n`));
  
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, title, status, created_at, story_id')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error(chalk.red('Error fetching videos:'), error);
    process.exit(1);
  }
  
  if (!videos || videos.length === 0) {
    console.log(chalk.yellow('No videos found'));
    return;
  }
  
  // Get story titles
  const storyIds = [...new Set(videos.map(v => v.story_id).filter(Boolean))];
  const { data: storyboards } = await supabase
    .from('storyboards')
    .select('id, title')
    .in('id', storyIds);
  
  const storyMap = new Map(storyboards?.map(s => [s.id, s.title]) || []);
  
  console.log(chalk.gray('Status: 🟢 completed | 🟡 processing | 🔴 failed\n'));
  
  videos.forEach((video, index) => {
    const title = video.title || storyMap.get(video.story_id) || 'Untitled';
    const statusIcon = 
      video.status === 'completed' ? '🟢' :
      video.status === 'processing' ? '🟡' : '🔴';
    
    console.log(
      `${chalk.gray(`${(index + 1).toString().padStart(2)}.`)} ` +
      `${statusIcon} ` +
      `${chalk.cyan(video.id)} ` +
      `${chalk.white(title.substring(0, 40))}${title.length > 40 ? '...' : ''} ` +
      `${chalk.gray(new Date(video.created_at).toLocaleString())}`
    );
  });
  
  console.log(chalk.gray(`\n💡 To check consistency: node scripts/check-video-consistency.js <VIDEO_ID>`));
}

listRecentVideos();