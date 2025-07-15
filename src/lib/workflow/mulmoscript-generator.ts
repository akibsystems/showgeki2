import type { Storyboard, MulmoScript } from '@/types/workflow';
import OpenAI from 'openai';

// OpenAI クライアント
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * LLMを使ってimagePrompt内のキャラクター名の表記揺れを統一
 */
async function normalizeCharacterNamesInPrompts(
  imagePrompts: string[],
  characters: any[]
): Promise<string[]> {
  if (imagePrompts.length === 0 || characters.length === 0) {
    return imagePrompts;
  }

  const systemPrompt = `あなたは日本語のテキスト正規化の専門家です。
与えられた画像プロンプトの中にあるキャラクター名の表記揺れを、正式なキャラクター名に統一してください。

## ルール
1. 敬称（さん、君、ちゃん、様など）は削除して正式名に統一
2. カタカナ・ひらがなの表記揺れも正式名に統一
3. 愛称や略称も正式名に統一
4. キャラクター名以外の部分は変更しない
5. 文脈は保持する

## 出力形式
JSONフォーマットで、各プロンプトの正規化後のテキストを配列で返してください。
{
  "normalized": ["正規化後のプロンプト1", "正規化後のプロンプト2", ...]
}`;

  const userPrompt = `## 正式なキャラクター名一覧
${characters.map(char => `- ${char.name}`).join('\n')}

## 正規化対象のプロンプト
${imagePrompts.map((prompt, index) => `${index + 1}. ${prompt}`).join('\n')}

上記のプロンプトに含まれるキャラクター名を、正式なキャラクター名に統一してください。`;

  try {
    console.log('[MulmoScript Generation] Normalizing character names in image prompts...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 32000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    if (result.normalized && Array.isArray(result.normalized)) {
      console.log('[MulmoScript Generation] Character names normalized successfully');
      return result.normalized;
    }

    console.warn('[MulmoScript Generation] Failed to normalize character names, using original prompts');
    return imagePrompts;

  } catch (error) {
    console.error('[MulmoScript Generation] Error normalizing character names:', error);
    return imagePrompts;
  }
}

/**
 * 配列形式の属性値から適切な値を取得
 */
function getAttributeValue(attribute: any, beatIndex: number): any {
  if (!attribute) return null;

  // 文字列形式の配列（例: "[値1, 値2, ...]"）をパース
  if (typeof attribute === 'string' && attribute.startsWith('[') && attribute.endsWith(']')) {
    try {
      const attrArray = JSON.parse(attribute);
      if (Array.isArray(attrArray)) {
        return beatIndex < attrArray.length ? attrArray[beatIndex] : attrArray[attrArray.length - 1];
      }
    } catch (e) {
      // パース失敗時は元の文字列を返す
      return attribute;
    }
  }

  // 既に配列の場合
  if (Array.isArray(attribute)) {
    return beatIndex < attribute.length ? attribute[beatIndex] : attribute[attribute.length - 1];
  }

  // 配列でない場合はそのまま返す
  return attribute;
}

/**
 * キャラクターの外見情報をimagePromptで処理
 * - 顔参照画像がある場合: "登場人物名(体型:XXX, 服装など:YYY)"
 * - 顔参照画像がない場合: "登場人物名(性別:XXX, 年齢:YYY, ...)"
 * @param beatIndex ビートのインデックス（配列から適切な値を取得するため）
 */
function processImagePromptForCharacters(imagePrompt: string, characters: any[], beatIndex: number): string {
  let processedPrompt = imagePrompt;

  characters.forEach(char => {
    const hasImage = !!char.faceReference;

    // エスケープされた名前でマッチング
    const escapedName = char.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let replacement: string;

    if (hasImage) {
      // 画像指定済みの場合：体型と服装のみ
      const attributes = [];
      const bodyType = getAttributeValue(char.bodyType, beatIndex);
      const visualDescription = getAttributeValue(char.visualDescription, beatIndex);

      if (bodyType) attributes.push(`体型:${bodyType}`);
      if (visualDescription) attributes.push(`服装など:${visualDescription}`);

      replacement = `${char.name}(画像指定済み${attributes.length > 0 ? ', ' + attributes.join(', ') : ''})`;
    } else {
      // 画像指定なしの場合：全ての外見情報
      const attributes = [];

      // 性別は配列ではないのでそのまま使用
      if (char.sex) attributes.push(`性別:${char.sex}`);

      // 各属性を配列対応で処理
      const age = getAttributeValue(char.age, beatIndex);
      const skinColor = getAttributeValue(char.skinColor, beatIndex);
      const height = getAttributeValue(char.height, beatIndex);
      const weight = getAttributeValue(char.weight, beatIndex);
      const hairStyle = getAttributeValue(char.hairStyle, beatIndex);
      const eyeColor = getAttributeValue(char.eyeColor, beatIndex);
      const hairColor = getAttributeValue(char.hairColor, beatIndex);
      const bodyType = getAttributeValue(char.bodyType, beatIndex);
      const visualDescription = getAttributeValue(char.visualDescription, beatIndex);

      if (age) attributes.push(`年齢:${age}`);
      if (skinColor) attributes.push(`肌の色:${skinColor}`);
      if (height) attributes.push(`身長:${height}`);
      if (weight) attributes.push(`体重:${weight}`);
      if (hairStyle) attributes.push(`髪型:${hairStyle}`);
      if (eyeColor) attributes.push(`瞳の色:${eyeColor}`);
      if (hairColor) attributes.push(`髪の色:${hairColor}`);
      if (bodyType) attributes.push(`体型:${bodyType}`);
      if (visualDescription) attributes.push(`服装など:${visualDescription}`);

      replacement = `${char.name}(${attributes.join(', ')})`;
    }

    // キャラクター名を含む様々なパターンを置換
    const patterns = [
      // "登場人物名（詳細情報）" パターン
      new RegExp(`${escapedName}[（(][^）)]*[）)]`, 'g'),
      // "登場人物名:" に続く説明パターン
      new RegExp(`${escapedName}[:：][^、。]+`, 'g'),
      // 単独の登場人物名
      new RegExp(`${escapedName}(?![ァ-ヶー])`, 'g')
    ];

    patterns.forEach(pattern => {
      processedPrompt = processedPrompt.replace(pattern, replacement);
    });
  });

  return processedPrompt;
}

/**
 * storyboardのデータから直接MulmoScriptを生成
 */
export async function generateMulmoScriptFromStoryboard(
  storyboard: Storyboard,
  step4Output?: any
): Promise<MulmoScript> {
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

  // 表記揺れを解決するためにimagePromptsを正規化
  const imagePrompts = mergedScenes.map((scene: any) => scene.imagePrompt);
  const normalizedPrompts = await normalizeCharacterNamesInPrompts(imagePrompts, characters);

  // 正規化されたプロンプトをマージ
  const normalizedScenes = mergedScenes.map((scene: any, index: number) => ({
    ...scene,
    imagePrompt: normalizedPrompts[index] || scene.imagePrompt
  }));

  // beatsを生成（正規化されたシーンから）
  const beats = normalizedScenes.flatMap((scene: any) =>
    scene.dialogue.map((dialog: any) => ({
      text: dialog.text,
      speaker: dialog.speaker,
      imagePrompt: scene.imagePrompt
    }))
  );

  // 画像指定に基づいてimagePromptを調整
  const processedBeats = beats.map((beat, index) => {
    const processedPrompt = processImagePromptForCharacters(beat.imagePrompt, characters, index);
    return {
      ...beat,
      imagePrompt: processedPrompt
    };
  });

  console.log('[MulmoScript Generation] Processed image prompts for characters');

  // speakersを生成（シーンで使用されている名前を収集）
  const speakers: Record<string, any> = {};
  const usedSpeakerNames = new Set<string>();

  // processedBeatsで実際に使用されているspeaker名を収集
  processedBeats.forEach(beat => {
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
    beats: processedBeats,
    speechParams: {
      provider: 'openai',
      speakers
    },
    imageParams: {
      //style: styleData?.imageStyle || 'アニメ風、ソフトパステルカラー、繊細な線画、シネマティック照明',
      style: 'anime style, soft pastel colors, Whisper of the Heart style, muted watercolor backgrounds, soft lighting, subtle cel shading, delicate line art, negative_prompt: realistic style, photorealism, overly saturated colors, strong contrast, harsh lighting, sharp outlines, thick line art, noisy textures, digital art style, glossy finish, exaggerated expressions, overly detailed shading, high dynamic range, blurred details',
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
  console.log('[MulmoScript Generation] Total beats:', processedBeats.length);
  console.log('[MulmoScript Generation] Speakers:', Object.keys(speakers));
  console.log('[MulmoScript Generation] Speaker mappings:', speakers);
  console.log('[MulmoScript Generation] Beat speakers sample:', processedBeats.slice(0, 3).map(b => b.speaker));

  return mulmoScript;
}