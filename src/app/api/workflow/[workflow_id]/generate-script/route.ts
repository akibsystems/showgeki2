import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { MulmoScript, Storyboard } from '@/types/workflow';
import { generateMulmoscriptWithOpenAI, type ScriptGenerationOptions } from '@/lib/openai-client';
import type { Story } from '@/lib/schemas';

// SERVICE_ROLEキーを使用してSupabaseクライアントを作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
);

// POST: MulmoScript生成と動画作成開始
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflow_id: string }> }
) {
  try {
    // UIDをヘッダーから取得
    const uid = request.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { error: 'Unauthorized: UID required' },
        { status: 401 }
      );
    }

    const { workflow_id } = await params;

    // ワークフローを取得
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select(`
        id,
        storyboard_id,
        uid,
        status,
        storyboards (
          id,
          uid,
          title,
          status,
          summary_data,
          acts_data,
          characters_data,
          scenes_data,
          audio_data,
          style_data,
          caption_data
        )
      `)
      .eq('id', workflow_id)
      .eq('uid', uid)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'ワークフローが見つかりません' },
        { status: 404 }
      );
    }

    const storyboard = workflow.storyboards as unknown as Storyboard;

    if (!storyboard) {
      return NextResponse.json(
        { error: 'ストーリーボードが見つかりません' },
        { status: 404 }
      );
    }

    // Story形式のデータを作成
    const storyData: Story = {
      id: storyboard.id,
      workspace_id: uid,
      uid: uid,
      title: storyboard.title || '無題の作品',
      text_raw: storyboard.summary_data?.description || '',
      beats: storyboard.scenes_data?.scenes.length || 5,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // スクリプト生成オプションを設定
    const generationOptions: ScriptGenerationOptions = {
      beats: storyboard.scenes_data?.scenes.length || 5,
      language: 'ja',
      enableCaptions: storyboard.caption_data?.enabled || false,
      captionStyles: storyboard.caption_data?.enabled ? [
        'font-size: 48px',
        'color: white',
        'text-shadow: 2px 2px 4px rgba(0,0,0,0.8)',
        'font-family: \'Noto Sans JP\', sans-serif',
        'font-weight: bold'
      ] : undefined,
      scenes: storyboard.scenes_data?.scenes.map((scene, index) => ({
        number: index + 1,
        title: scene.title || `シーン${index + 1}`
      }))
    };

    // OpenAI APIを使用してMulmoScriptを生成
    const result = await generateMulmoscriptWithOpenAI(storyData, generationOptions);

    if (!result.success || !result.script) {
      console.error('MulmoScript生成エラー:', result.error);
      return NextResponse.json(
        { error: `MulmoScriptの生成に失敗しました: ${result.error}` },
        { status: 500 }
      );
    }

    const mulmoScript = enhanceMulmoScriptWithWorkflowData(result.script, storyboard);

    // ストーリーボードにMulmoScriptを保存
    const { error: updateError } = await supabase
      .from('storyboards')
      .update({
        mulmoscript: mulmoScript,
        status: 'completed'
      })
      .eq('id', storyboard.id);

    if (updateError) {
      console.error('MulmoScript保存エラー:', updateError);
      return NextResponse.json(
        { error: 'MulmoScriptの保存に失敗しました' },
        { status: 500 }
      );
    }

    // 新しいストーリーを作成（既存のstoriesテーブルを使用）
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .insert({
        workspace_id: uid, // uidをworkspace_idとして使用
        uid: uid,
        title: storyboard.title || '無題の作品',
        text_raw: storyboard.summary_data?.description || '',
        beats: storyboard.scenes_data?.scenes.length || 1,
        script_json: mulmoScript,
        status: 'script_completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (storyError || !story) {
      console.error('ストーリー作成エラー:', storyError);
      return NextResponse.json(
        { error: 'ストーリーの作成に失敗しました' },
        { status: 500 }
      );
    }

    // 新しいビデオエントリを作成
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        story_id: story.id,
        uid: uid,
        status: 'queued',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (videoError || !video) {
      console.error('ビデオ作成エラー:', videoError);
      return NextResponse.json(
        { error: 'ビデオの作成に失敗しました' },
        { status: 500 }
      );
    }

    // ワークフローのステータスを完了に更新
    await supabase
      .from('workflows')
      .update({ status: 'completed' })
      .eq('id', workflow_id);

    return NextResponse.json({
      success: true,
      storyId: story.id,
      videoId: video.id,
      mulmoScript
    });

  } catch (error) {
    console.error('スクリプト生成API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * OpenAIで生成されたMulmoScriptにワークフローデータを統合
 */
function enhanceMulmoScriptWithWorkflowData(
  baseScript: any, // OpenAIからのMulmoscript型
  storyboard: Storyboard
): MulmoScript {
  const audioData = storyboard.audio_data;
  const styleData = storyboard.style_data;
  const characters = storyboard.characters_data?.characters || [];

  // 音声設定を更新（ワークフローで設定された音声タイプを適用）
  if (baseScript.speechParams && baseScript.speechParams.speakers) {
    characters.forEach(char => {
      const voiceSettings = audioData?.voiceSettings?.[char.id];
      if (baseScript.speechParams.speakers[char.name]) {
        baseScript.speechParams.speakers[char.name].voiceId = 
          voiceSettings?.voiceType || char.voiceType || baseScript.speechParams.speakers[char.name].voiceId;
      }
    });
  }

  // BGM設定を適用
  if (audioData?.bgmSettings) {
    baseScript.audioParams = {
      ...baseScript.audioParams,
      bgm: audioData.bgmSettings.customBgm ? {
        kind: 'url' as const,
        url: audioData.bgmSettings.customBgm.url
      } : audioData.bgmSettings.defaultBgm ? {
        kind: 'url' as const,
        url: getBgmUrl(audioData.bgmSettings.defaultBgm)
      } : undefined,
      bgmVolume: audioData.bgmSettings.bgmVolume || 0.2
    };
  }

  // 画風設定を適用
  if (styleData?.imageStyle) {
    baseScript.imageParams = {
      ...baseScript.imageParams,
      style: styleData.imageStyle
    };
  }

  // 顔参照画像を適用
  const faceReferences: Record<string, string> = {};
  characters.forEach(char => {
    if (char.faceReference) {
      faceReferences[char.name] = char.faceReference;
    }
  });
  
  if (Object.keys(faceReferences).length > 0) {
    baseScript.imageParams = {
      ...baseScript.imageParams,
      images: faceReferences
    };
  }

  // シーンの画像URLを適用
  if (storyboard.scenes_data?.scenes && baseScript.beats) {
    let beatIndex = 0;
    storyboard.scenes_data.scenes.forEach(scene => {
      if (scene.imageUrl) {
        // このシーンに対応するビートを更新
        for (let i = 0; i < scene.dialogue.length && beatIndex < baseScript.beats.length; i++) {
          baseScript.beats[beatIndex].image = {
            type: 'image' as const,
            source: {
              kind: 'url' as const,
              url: scene.imageUrl
            }
          };
          beatIndex++;
        }
      } else {
        // 画像URLがない場合は、dialogue数分だけbeatIndexを進める
        beatIndex += scene.dialogue.length;
      }
    });
  }

  // 字幕設定を適用
  if (storyboard.caption_data?.enabled) {
    baseScript.captionParams = {
      lang: storyboard.caption_data.language || 'ja',
      styles: storyboard.caption_data.styles || [
        "font-size: 24px",
        "color: white",
        "text-shadow: 2px 2px 4px rgba(0,0,0,0.8)",
        "font-family: 'Noto Sans JP', sans-serif",
        "font-weight: bold"
      ]
    };
  }

  return baseScript as MulmoScript;
}

/**
 * BGM IDからURLを取得
 */
function getBgmUrl(bgmId: string): string {
  // BGMのマッピング（実際のURLに置き換える必要があります）
  const bgmMap: Record<string, string> = {
    'default-bgm-1': 'https://example.com/bgm/standard.mp3',
    'default-bgm-2': 'https://example.com/bgm/dramatic.mp3',
    'default-bgm-3': 'https://example.com/bgm/fantasy.mp3',
    'epic': 'https://example.com/bgm/epic.mp3',
    'emotional': 'https://example.com/bgm/emotional.mp3',
    'peaceful': 'https://example.com/bgm/peaceful.mp3',
  };
  
  return bgmMap[bgmId] || bgmMap['default-bgm-1'];
}