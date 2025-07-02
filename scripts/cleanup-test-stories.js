#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  console.log('🧹 テスト用ストーリーのクリーンアップを開始します...\n');
  
  // load-test-userで始まるUIDのストーリーを削除
  const { data: stories, error: fetchError } = await supabase
    .from('stories')
    .select('id, uid, title')
    .like('uid', 'load-test-user-%');
    
  if (fetchError) {
    console.error('❌ ストーリー取得エラー:', fetchError);
    return;
  }
  
  if (!stories || stories.length === 0) {
    console.log('削除するテストストーリーがありません。');
    return;
  }
  
  console.log(`${stories.length}件のテストストーリーを削除します:`);
  stories.forEach(s => console.log(`  - ${s.title} (uid: ${s.uid})`));
  
  // ストーリーを削除
  const { error: deleteError } = await supabase
    .from('stories')
    .delete()
    .like('uid', 'load-test-user-%');
    
  if (deleteError) {
    console.error('❌ 削除エラー:', deleteError);
    return;
  }
  
  console.log('\n✅ テストストーリーを削除しました。');
  
  // ワークスペースも削除
  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('id, uid, name')
    .like('uid', 'load-test-user-%');
    
  if (!wsError && workspaces && workspaces.length > 0) {
    console.log(`\n${workspaces.length}件のテストワークスペースを削除します。`);
    
    const { error: wsDeleteError } = await supabase
      .from('workspaces')
      .delete()
      .like('uid', 'load-test-user-%');
      
    if (wsDeleteError) {
      console.error('❌ ワークスペース削除エラー:', wsDeleteError);
    } else {
      console.log('✅ テストワークスペースを削除しました。');
    }
  }
  
  console.log('\n🎉 クリーンアップ完了！');
}

cleanup().catch(console.error);