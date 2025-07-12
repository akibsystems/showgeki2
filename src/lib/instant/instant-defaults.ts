// Instant Mode のデフォルト設定

export const INSTANT_DEFAULTS = {
  // 画風設定
  imageStyle: {
    anime: {
      preset: 'anime',
      quality: 'medium',
      prompt_suffix: 'anime style, soft pastel colors, Studio Ghibli inspired'
    },
    realistic: {
      preset: 'realistic',
      quality: 'medium',
      prompt_suffix: 'photorealistic, cinematic lighting, highly detailed'
    },
    watercolor: {
      preset: 'watercolor',
      quality: 'medium',
      prompt_suffix: 'watercolor painting, soft edges, artistic style'
    }
  },

  // 音声割り当て
  voiceAssignment: {
    // キャラクタータイプ別のデフォルト音声
    male_protagonist: 'onyx',
    female_protagonist: 'nova',
    male_support: 'echo',
    female_support: 'shimmer',
    narrator: 'alloy',
    elderly: 'fable',
    default: 'alloy'
  },

  // BGM設定
  bgm: {
    default: {
      url: '/audio/bgm/story002.mp3',
      name: 'Rise and Shine',
      volume: 0.3
    },
    byMood: {
      happy: '/audio/bgm/story001.mp3',
      dramatic: '/audio/bgm/story002.mp3',
      sad: '/audio/bgm/story003.mp3',
      mysterious: '/audio/bgm/story004.mp3',
      energetic: '/audio/bgm/story005.mp3'
    }
  },

  // 字幕設定
  caption: {
    enabled: true,
    lang: 'ja',
    fontSize: 36,
    fontFamily: 'Noto Sans JP',
    color: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 2,
    position: 'bottom',
    marginBottom: 50
  },

  // 動画時間とシーン数の対応
  duration: {
    short: {
      maxSeconds: 30,
      scenes: 3,
      description: '短め（〜30秒）'
    },
    medium: {
      maxSeconds: 60,
      scenes: 5,
      description: '標準（〜60秒）'
    },
    long: {
      maxSeconds: 90,
      scenes: 8,
      description: '長め（〜90秒）'
    }
  },

  // プロンプト設定
  prompts: {
    systemPrompt: `あなたはシェイクスピア風の劇作家です。
与えられたストーリーを、指定されたシーン数の劇的な5幕構成に変換してください。
各シーンは簡潔で印象的なものにし、全体で指定された時間内に収まるようにしてください。`,
    
    characterPrompt: `登場人物の性格、外見、役割を詳細に設定してください。
主人公、サポートキャラクター、ナレーターなどの役割を明確にしてください。`,

    scriptPrompt: `シェイクスピア風の文体で、日本語の台本を作成してください。
各シーンは短く印象的に、感情豊かな台詞を心がけてください。`
  }
};

// ヘルパー関数
export function getSceneCountForDuration(duration: 'short' | 'medium' | 'long'): number {
  return INSTANT_DEFAULTS.duration[duration].scenes;
}

export function getImageStyleConfig(style: 'anime' | 'realistic' | 'watercolor') {
  return INSTANT_DEFAULTS.imageStyle[style];
}

export function getDefaultBgmForMood(mood?: string): string {
  if (mood && mood in INSTANT_DEFAULTS.bgm.byMood) {
    return INSTANT_DEFAULTS.bgm.byMood[mood as keyof typeof INSTANT_DEFAULTS.bgm.byMood];
  }
  return INSTANT_DEFAULTS.bgm.default.url;
}