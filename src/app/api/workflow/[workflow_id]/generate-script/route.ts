import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { MulmoScript, Storyboard } from '@/types/workflow';
// import { generateMulmoscriptWithOpenAI, type ScriptGenerationOptions } from '@/lib/openai-client';
// import type { Story } from '@/lib/schemas';

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

    // ワークフローを取得（Step4の編集済みデータも含む）
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select(`
        id,
        storyboard_id,
        uid,
        status,
        step4_out,
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

    // デバッグ: storyboard.scenes_dataの内容を確認
    console.log('[Script Generation Debug] storyboard.scenes_data:', JSON.stringify(storyboard.scenes_data, null, 2));
    console.log('[Script Generation Debug] workflow.step4_out:', JSON.stringify(workflow.step4_out, null, 2));

    // storyboardのデータから直接MulmoScriptを生成
    const mulmoScript = generateMulmoScriptFromStoryboard(storyboard, workflow.step4_out);

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
 * storyboardのデータから直接MulmoScriptを生成
 */
function generateMulmoScriptFromStoryboard(
  storyboard: Storyboard,
  step4Output?: any
): MulmoScript {
  const scenes = storyboard.scenes_data?.scenes || [];
  const characters = storyboard.characters_data?.characters || [];
  const audioData = storyboard.audio_data;
  const styleData = storyboard.style_data;
  const captionData = storyboard.caption_data;

  // Step4で編集されたプロンプトをマージ
  let mergedScenes = scenes;
  if (step4Output?.userInput?.scenes) {
    const editedScenes = step4Output.userInput.scenes;

    mergedScenes = scenes.map((scene: any) => {
      const editedScene = editedScenes.find((s: any) => s.id === scene.id);
      if (editedScene) {
        return {
          ...scene,
          imagePrompt: editedScene.imagePrompt || scene.imagePrompt,
          dialogue: editedScene.dialogue || scene.dialogue
        };
      }
      return scene;
    });

    console.log('[MulmoScript Generation] Merged edited prompts from Step 4');
  }

  // beatsを生成（マージされたシーンから）
  const beats = mergedScenes.flatMap((scene: any) =>
    scene.dialogue.map((dialog: any) => ({
      text: dialog.text,
      speaker: dialog.speaker,
      imagePrompt: scene.imagePrompt
    }))
  );

  // speakersを生成（シーンで使用されている名前を収集）
  const speakers: Record<string, any> = {};
  const usedSpeakerNames = new Set<string>();

  // beatsで実際に使用されているspeaker名を収集
  beats.forEach(beat => {
    if (beat.speaker) {
      usedSpeakerNames.add(beat.speaker);
    }
  });

  // 使用されているspeaker名それぞれに対して設定を生成
  usedSpeakerNames.forEach(speakerName => {
    // キャラクターデータから一致するものを探す（部分一致も許可）
    const matchingChar = characters.find((char: any) =>
      char.name === speakerName ||
      char.name.includes(speakerName) ||
      speakerName.includes(char.name)
    );

    if (matchingChar) {
      const voiceSettings = audioData?.voiceSettings?.[matchingChar.id];
      speakers[speakerName] = {
        voiceId: voiceSettings?.voiceType || matchingChar.voiceType || 'alloy',
        displayName: {
          ja: speakerName,
          en: speakerName
        }
      };
    } else {
      // マッチするキャラクターが見つからない場合はデフォルト設定
      speakers[speakerName] = {
        voiceId: 'alloy',
        displayName: {
          ja: speakerName,
          en: speakerName
        }
      };
    }
  });

  // BGM設定
  let bgmParams = undefined;
  if (audioData?.bgm) {
    if (audioData.bgm.selected && audioData.bgm.selected !== 'none') {
      bgmParams = {
        bgm: {
          kind: 'url' as const,
          url: audioData.bgm.selected
        },
        bgmVolume: audioData.bgm.volume || 0.5
      };
    }
    if (audioData.bgm.customBgm) {
      bgmParams = {
        bgm: {
          kind: 'url' as const,
          url: audioData.bgm.customBgm
        },
        bgmVolume: audioData.bgm.volume || 0.5
      };
    }
  }

  // 顔参照画像を設定
  const faceReferences: Record<string, any> = {};
  characters.forEach(char => {
    if (char.faceReference) {
      faceReferences[char.name] = {
        type: 'image' as const,
        source: {
          kind: 'url' as const,
          url: char.faceReference
        }
      };
    }
  });

  // 最終的なMulmoScriptを構築
  const mulmoScript: MulmoScript = {
    $mulmocast: { version: '1.0' },
    title: storyboard.title || 'untitled',
    lang: 'ja',
    beats,
    speechParams: {
      provider: 'openai',
      speakers
    },
    imageParams: {
      style: styleData?.imageStyle || 'アニメ風、ソフトパステルカラー、繊細な線画、シネマティック照明',
      quality: 'medium',
      model: 'gpt-image-1',
      ...(Object.keys(faceReferences).length > 0 ? { images: faceReferences } : {})
    },
    audioParams: bgmParams,
    captionParams: captionData?.enabled ? {
      lang: captionData.language || 'ja',
      styles: captionData.styles || [
        "font-size: 24px",
        "color: white",
        "text-shadow: 2px 2px 4px rgba(0,0,0,0.8)",
        "font-family: 'Noto Sans JP', sans-serif",
        "font-weight: bold"
      ]
    } : undefined
  };

  console.log('[MulmoScript Generation] Created MulmoScript from storyboard data');
  console.log('[MulmoScript Generation] Total beats:', beats.length);
  console.log('[MulmoScript Generation] Speakers:', Object.keys(speakers));
  console.log('[MulmoScript Generation] Speaker mappings:', speakers);
  console.log('[MulmoScript Generation] Beat speakers sample:', beats.slice(0, 3).map(b => b.speaker));

  return mulmoScript;
}

/**
 * OpenAIで生成されたMulmoScriptにワークフローデータを統合
 */
function enhanceMulmoScriptWithWorkflowData(
  baseScript: any, // OpenAIからのMulmoscript型
  storyboard: Storyboard,
  step4Output?: any
): MulmoScript {
  const audioData = storyboard.audio_data;
  const styleData = storyboard.style_data;
  const characters = storyboard.characters_data?.characters || [];

  // storyboard.scenes_dataからプロンプトを適用（Step4の編集が反映されているはず）
  if (storyboard.scenes_data?.scenes && baseScript.beats) {
    const scenes = storyboard.scenes_data.scenes;
    console.log('[Storyboard Scene Debug] Using scenes from storyboard with', scenes.length, 'scenes');

    // beatIndexとsceneの対応を管理
    let beatIndex = 0;

    scenes.forEach((scene: any, sceneIndex: number) => {
      console.log(`[Storyboard Scene Debug] Scene ${sceneIndex}: ${scene.id}, imagePrompt: "${scene.imagePrompt?.substring(0, 50)}..."`);

      // このシーンのdialogue数だけbeatsを更新
      for (let i = 0; i < scene.dialogue.length && beatIndex < baseScript.beats.length; i++) {
        if (scene.imagePrompt) {
          console.log(`[Storyboard Scene Debug] Updating beat ${beatIndex} with scene ${sceneIndex} prompt`);
          // storyboardのプロンプトをbeatsに適用
          baseScript.beats[beatIndex].imagePrompt = scene.imagePrompt;
        }
        beatIndex++;
      }
    });

    console.log('[Storyboard Scene Debug] Applied storyboard prompts to beats');
  }

  // Step4で編集されたプロンプトを適用（さらに上書き）
  if (step4Output?.userInput?.scenes && baseScript.beats) {
    const editedScenes = step4Output.userInput.scenes;
    console.log('[Step4 Edit Debug] Found step4Output with', editedScenes.length, 'edited scenes');

    // beatIndexとsceneの対応を管理
    let beatIndex = 0;
    const scenes = storyboard.scenes_data?.scenes || [];

    scenes.forEach((scene: any) => {
      const editedScene = editedScenes.find((s: any) => s.id === scene.id);

      // このシーンのdialogue数だけbeatsを更新
      for (let i = 0; i < scene.dialogue.length && beatIndex < baseScript.beats.length; i++) {
        if (editedScene && editedScene.imagePrompt) {
          console.log(`[Step4 Edit Debug] Overriding beat ${beatIndex} with edited prompt`);
          // 編集されたプロンプトをbeatsに適用
          baseScript.beats[beatIndex].imagePrompt = editedScene.imagePrompt;
        }
        beatIndex++;
      }
    });

    console.log('[Step4 Edit Debug] Applied edited prompts to beats');
  }

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
  const faceReferences: Record<string, any> = {};
  characters.forEach(char => {
    if (char.faceReference) {
      faceReferences[char.name] = {
        type: 'image' as const,
        source: {
          kind: 'url' as const,
          url: char.faceReference
        }
      };
    }
  });

  if (Object.keys(faceReferences).length > 0) {
    baseScript.imageParams = {
      ...baseScript.imageParams,
      images: faceReferences
    };
    console.log('[Face Reference Debug] Applied face references:', Object.keys(faceReferences));
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

  // デバッグ: 最終的なbeatsの内容を確認
  console.log('[Final MulmoScript] beats sample (first 3):', JSON.stringify(baseScript.beats?.slice(0, 3), null, 2));

  return baseScript as MulmoScript;
}

