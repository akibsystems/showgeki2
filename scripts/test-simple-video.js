#!/usr/bin/env node

// 簡単な動画生成APIテスト
const { randomUUID } = require('crypto');

async function testSimpleVideoGeneration() {
  console.log('🎬 簡単な動画生成APIテスト...');
  
  const testUid = randomUUID();
  console.log(`👤 テストUID: ${testUid}`);
  
  try {
    // 1. ワークスペース作成
    console.log('🏢 ワークスペース作成中...');
    const workspaceResponse = await fetch('http://localhost:3000/api/workspaces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-uid': testUid
      },
      body: JSON.stringify({
        name: 'Simple Video Test Workspace'
      })
    });
    
    if (!workspaceResponse.ok) {
      throw new Error(`Workspace creation failed: ${workspaceResponse.status}`);
    }
    
    const workspace = await workspaceResponse.json();
    console.log(`✅ ワークスペース作成成功: ${workspace.data.id}`);
    
    // 2. ストーリー作成
    console.log('📝 ストーリー作成中...');
    const storyResponse = await fetch('http://localhost:3000/api/stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-uid': testUid
      },
      body: JSON.stringify({
        workspace_id: workspace.data.id,
        title: 'Simple Test Story',
        text_raw: 'This is a simple test story for video generation.'
      })
    });
    
    if (!storyResponse.ok) {
      throw new Error(`Story creation failed: ${storyResponse.status}`);
    }
    
    const story = await storyResponse.json();
    console.log(`✅ ストーリー作成成功: ${story.data.id}`);
    
    // 3. 動画生成（スクリプトなしで直接テキストから）
    console.log('🎬 動画生成開始...');
    const videoResponse = await fetch(`http://localhost:3000/api/stories/${story.data.id}/generate-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-uid': testUid
      }
    });
    
    if (!videoResponse.ok) {
      const errorData = await videoResponse.json();
      throw new Error(`Video generation failed: ${videoResponse.status} - ${errorData.error}`);
    }
    
    const videoResult = await videoResponse.json();
    console.log(`✅ 動画生成開始: ${videoResult.data.video_id}`);
    
    // 4. 動画ステータス確認
    console.log('⏳ 動画生成完了を待機中...');
    let attempts = 0;
    const maxAttempts = 20; // 2分間待機
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 6000)); // 6秒待機
      attempts++;
      
      const statusResponse = await fetch(`http://localhost:3000/api/videos/${videoResult.data.video_id}/status`, {
        headers: {
          'x-uid': testUid
        }
      });
      
      if (!statusResponse.ok) {
        console.warn(`⚠️  ステータス確認失敗: ${statusResponse.status}`);
        continue;
      }
      
      const status = await statusResponse.json();
      console.log(`📊 動画ステータス: ${status.data.status} (${attempts}/${maxAttempts})`);
      
      if (status.data.status === 'completed') {
        console.log('🎉 動画生成成功！');
        console.log(`🎥 動画URL: ${status.data.url}`);
        console.log(`⏱️  動画時間: ${status.data.duration_sec}秒`);
        console.log(`📐 解像度: ${status.data.resolution}`);
        console.log(`💾 ファイルサイズ: ${status.data.size_mb}MB`);
        return true;
      } else if (status.data.status === 'failed') {
        console.error(`❌ 動画生成失敗: ${status.data.error_msg}`);
        return false;
      }
    }
    
    console.log('⏰ 動画生成タイムアウト');
    return false;
    
  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
    return false;
  }
}

testSimpleVideoGeneration().then(success => {
  if (success) {
    console.log('\n🎉 Simple video generation test passed!');
  } else {
    console.log('\n💥 Simple video generation test failed!');
    process.exit(1);
  }
});