#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFailedVideos() {
  // 最新の失敗した動画を取得
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, story_id, uid, status, error_msg, created_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log('\n失敗した動画 (最新10件):');
  console.log('='.repeat(80));
  
  videos.forEach((video, index) => {
    console.log(`\n${index + 1}. Video ID: ${video.id}`);
    console.log(`   Story ID: ${video.story_id}`);
    console.log(`   UID: ${video.uid}`);
    console.log(`   ステータス: ${video.status}`);
    console.log(`   エラー: ${video.error_msg || 'エラーメッセージなし'}`);
    console.log(`   作成: ${new Date(video.created_at).toLocaleString('ja-JP')}`);
  });
  
  // load-test-userの統計
  const loadTestVideos = videos.filter(v => v.uid && v.uid.startsWith('load-test-user-'));
  if (loadTestVideos.length > 0) {
    console.log(`\n⚠️  ${loadTestVideos.length}件の負荷テスト動画が失敗しています。`);
  }
}

checkFailedVideos().catch(console.error);