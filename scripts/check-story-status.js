#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数を設定してください');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStories() {
  // 最新の10件のストーリーを取得
  const { data: stories, error } = await supabase
    .from('stories')
    .select('id, title, status, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log('\n最新のストーリー (10件):');
  console.log('='.repeat(80));
  
  stories.forEach((story, index) => {
    console.log(`\n${index + 1}. ${story.title}`);
    console.log(`   ID: ${story.id}`);
    console.log(`   ステータス: ${story.status}`);
    console.log(`   作成: ${new Date(story.created_at).toLocaleString('ja-JP')}`);
    console.log(`   更新: ${new Date(story.updated_at).toLocaleString('ja-JP')}`);
  });

  // draft状態のストーリーがあるか確認
  const draftStories = stories.filter(s => s.status === 'draft');
  if (draftStories.length > 0) {
    console.log(`\n⚠️  ${draftStories.length}件のストーリーがdraft状態です。`);
    console.log('これらは脚本生成がトリガーされていない可能性があります。');
  }
}

checkStories().catch(console.error);