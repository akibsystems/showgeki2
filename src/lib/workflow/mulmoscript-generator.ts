import type { Storyboard, MulmoScript } from '@/types/workflow';

/**
 * storyboardのデータから直接MulmoScriptを生成
 */
export function generateMulmoScriptFromStoryboard(
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
      model: 'gpt-image-1',
      ...(Object.keys(faceReferences).length > 0 ? { images: faceReferences } : {})
    },
    audioParams: bgmParams,
    captionParams: captionData?.enabled ? {
      lang: captionData.language || 'ja',
      styles: captionData.styles || [
        "font-family: Arial, sans-serif",
        "font-size: 32px",
        "color: white",
        "text-align: center",
        "text-shadow: 0px 0px 20px rgba(0, 0, 0, 1.0)",
        "position: absolute",
        "bottom: 0px",
        "width: 80%",
        "padding-left: 10%",
        "padding-right: 10%",
        "padding-top: 4px",
        "background: rgba(0, 0, 0, 0.4)",
        "word-wrap: break-word",
        "overflow-wrap: break-word"
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