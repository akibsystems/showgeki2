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

    // 新しいビデオエントリを作成
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        story_id: storyboard.id,
        uid: uid,
        status: 'queued',
        created_at: new Date().toISOString()
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

    // Webhookを送信（非同期で実行し、レスポンスを待たない）
    if (process.env.CLOUD_RUN_WEBHOOK_URL) {
      const webhookPayload = {
        type: 'video_generation',
        payload: {
          video_id: video.id,
          story_id: storyboard.id,
          uid: uid,
          title: storyboard.title || '無題の作品',
          text_raw: storyboard.summary_data?.description || '',
          script_json: mulmoScript
        }
      };

      // Webhookを非同期で送信（レスポンスを待たない）
      fetch(process.env.CLOUD_RUN_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      }).then(() => {
        console.log('Webhook sent successfully for video:', video.id);
      }).catch((webhookError) => {
        console.error('Webhook送信エラー:', webhookError);
        // Webhookエラーは無視
      });
    }

    return NextResponse.json({
      success: true,
      storyboardId: storyboard.id,
      videoId: video.id,
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
    console.log('[Voice Debug] characters:', JSON.stringify(characters, null, 2));
    console.log('[Voice Debug] voiceSettings:', JSON.stringify(audioData?.voiceSettings, null, 2));
    
    characters.forEach(char => {
      const voiceSettings = audioData?.voiceSettings?.[char.id];
      if (baseScript.speechParams.speakers[char.name]) {
        const finalVoice = voiceSettings?.voiceType || char.voiceType || baseScript.speechParams.speakers[char.name].voiceId;
        baseScript.speechParams.speakers[char.name].voiceId = finalVoice;
        console.log(`[Voice Debug] Character "${char.name}" voice: ${finalVoice}`);
      }
    });
  }

  // BGM設定を適用
  if (storyboard.audio_data) {
    // storyboardからStep6で保存されたBGM設定を取得
    const step6BgmData = storyboard.audio_data as any; // Step6Output形式のデータ
    
    console.log('[BGM Debug] audio_data:', JSON.stringify(step6BgmData, null, 2));
    
    if (step6BgmData.bgm) {
      // Step6から保存されたBGM設定を使用
      if (step6BgmData.bgm.selected && step6BgmData.bgm.selected !== 'none') {
        baseScript.audioParams = {
          ...baseScript.audioParams,
          bgm: {
            kind: 'url' as const,
            url: step6BgmData.bgm.selected  // selectedは既に完全なURL
          },
          bgmVolume: step6BgmData.bgm.volume || 0.5
        };
        console.log('[BGM Debug] Applied BGM:', step6BgmData.bgm.selected, 'Volume:', step6BgmData.bgm.volume);
      }
      // customBgmがある場合は優先
      if (step6BgmData.bgm.customBgm) {
        baseScript.audioParams = {
          ...baseScript.audioParams,
          bgm: {
            kind: 'url' as const,
            url: step6BgmData.bgm.customBgm
          },
          bgmVolume: step6BgmData.bgm.volume || 0.5
        };
        console.log('[BGM Debug] Applied custom BGM:', step6BgmData.bgm.customBgm);
      }
    }
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

  console.log('[Final MulmoScript] audioParams:', JSON.stringify(baseScript.audioParams, null, 2));
  console.log('[Final MulmoScript] speechParams.speakers:', JSON.stringify(baseScript.speechParams?.speakers, null, 2));
  
  return baseScript as MulmoScript;
}

