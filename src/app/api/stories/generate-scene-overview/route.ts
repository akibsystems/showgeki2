import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SceneInfo {
  number: number;
  title: string;
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const { storyText, beatCount } = await request.json();

    if (!storyText || !beatCount) {
      return NextResponse.json(
        { error: 'Story text and beat count are required' },
        { status: 400 }
      );
    }

    const prompt = `以下の物語を${beatCount}個のシーンに分割してください。

物語:
${storyText}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: `あなたはシェイクスピアの生まれ変わりであり、魅力的な短編動画コンテンツの制作を専門とする演出家です。
与えられた物語をシェイクスピアだったらどのような演出をするかを想像しながら、シーンを分割してください。

## 創作指針
物語をもとに、シェイクスピア風の５幕構成の悲喜劇として脚本を考えてください。
台詞には現代的で少しカジュアルな日本語を使う。
台詞の数が脚本全体で指定された個数となるようにカウントする。
元の物語のエッセンスと感情を捉え、多様なキャラクターの個性で視覚的・感情的な演出を行う。

## 出力形式
以下のJSON形式で出力してください:
{
  "scenes": [
    {
      "number": 1,
      "title": "シーンのタイトル",
      "summary": "シーンのあらすじ（50文字程度）"
    }
  ]
}

## 重要な指示
- 各シーンは物語の流れに沿って自然に分割してください
- シェイクスピア風の５幕構成（序幕、展開、クライマックス、転換、終幕）を意識してください
- タイトルは短く印象的に、劇的な雰囲気を含めて
- あらすじは簡潔にシーンの要点を説明
- 指定された個数のシーンに必ず分割してください
- 日本語で出力してください`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const result = completion.choices[0].message.content;
    if (!result) {
      throw new Error('Failed to generate scene overview');
    }

    const parsedResult = JSON.parse(result);
    const scenes: SceneInfo[] = parsedResult.scenes || [];

    // シーン数が要求と一致しない場合の調整
    if (scenes.length !== beatCount) {
      console.warn(`Generated ${scenes.length} scenes, but requested ${beatCount}`);
      // 必要に応じてシーンを調整
      while (scenes.length < beatCount) {
        scenes.push({
          number: scenes.length + 1,
          title: `シーン ${scenes.length + 1}`,
          summary: '（詳細は後で設定）',
        });
      }
      if (scenes.length > beatCount) {
        scenes.splice(beatCount);
      }
    }

    // シーン番号を確実に設定
    scenes.forEach((scene, index) => {
      scene.number = index + 1;
    });

    console.log('シーン分析', scenes);

    return NextResponse.json({ scenes });
  } catch (error) {
    console.error('Error generating scene overview:', error);
    return NextResponse.json(
      { error: 'Failed to generate scene overview' },
      { status: 500 }
    );
  }
}