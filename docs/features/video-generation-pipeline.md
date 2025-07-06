# 動画生成パイプライン ドキュメント

## 概要

showgeki2の動画生成パイプラインは、ユーザーのストーリーからAIを活用して自動的に動画を生成するシステムです。Cloud Run上で動作し、OpenAI APIとmulmocast-cliを組み合わせて高品質な動画を生成します。

## システムアーキテクチャ

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Frontend    │────▶│  Supabase   │────▶│  Cloud Run   │
│  (Next.js)   │     │  Database   │     │  Webhook     │
└──────────────┘     └─────────────┘     └──────────────┘
                            │                     │
                            │                     ▼
                            │            ┌──────────────┐
                            │            │ OpenAI APIs  │
                            │            ├──────────────┤
                            │            │ • GPT-4      │
                            │            │ • DALL-E 3   │
                            │            │ • TTS        │
                            │            └──────────────┘
                            │                     │
                            ▼                     ▼
                    ┌─────────────┐      ┌──────────────┐
                    │  Supabase   │◀─────│ mulmocast-cli│
                    │  Storage    │      │ (動画生成)   │
                    └─────────────┘      └──────────────┘
```

## 処理フロー

### 1. 全体の流れ

```
1. ユーザーがストーリーを投稿
   ↓
2. 脚本生成（GPT-4）
   ↓
3. 動画生成リクエスト作成
   ↓
4. Supabase Webhookがトリガー
   ↓
5. Cloud Runが処理開始
   ↓
6. 画像生成（DALL-E 3）
   ↓
7. 音声生成（OpenAI TTS）
   ↓
8. 動画合成（mulmocast-cli）
   ↓
9. Supabase Storageにアップロード
   ↓
10. ステータス更新・通知
```

### 2. 詳細な処理ステップ

#### Step 1: 動画生成リクエスト

```typescript
// Frontend: /api/stories/[id]/generate-video
const requestVideoGeneration = async (storyId: string) => {
  // 1. videosテーブルにレコード作成
  const video = await supabase
    .from('videos')
    .insert({
      story_id: storyId,
      uid: auth.uid,
      status: 'queued'
    })
    .select()
    .single();

  // 2. webhookがトリガーされる（Supabase設定）
  // INSERT on videos table → Cloud Run webhook
};
```

#### Step 2: Webhook処理開始

```javascript
// webhook-handler.js
async function processVideoGeneration(payload) {
  const { video_id, story_id, uid, title, script_json } = payload;
  
  // ステータスを'processing'に更新
  await updateVideoStatus(video_id, 'processing');
  
  try {
    // 一意の作業ディレクトリを作成
    const uniquePaths = createUniquePaths(video_id);
    
    // MulmoScriptファイルを書き込み
    writeScriptJson(script_json, uniquePaths.scriptPath);
    
    // 動画生成実行
    const result = await generateMovie(
      uniquePaths.scriptPath, 
      uniquePaths.outputPath
    );
    
    // アップロード
    const videoUrl = await uploadToSupabase(result.videoPath, video_id);
    
    // 完了
    await updateVideoStatus(video_id, 'completed', { url: videoUrl });
    
  } catch (error) {
    await updateVideoStatus(video_id, 'failed', { error: error.message });
  }
}
```

## mulmocast-cli統合

### 1. Docker環境設定

```dockerfile
FROM node:22-alpine

# 必要な依存関係をインストール
RUN apk add --no-cache \
  cairo cairo-dev pango pango-dev jpeg-dev giflib-dev \
  librsvg librsvg-dev libc6-compat g++ make python3 \
  ffmpeg imagemagick chromium nss freetype freetype-dev \
  harfbuzz ca-certificates ttf-freefont font-noto-cjk

# Puppeteer環境変数
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CI=true

# mulmocast-cliをクローン
RUN git clone https://github.com/yuniruyuni/mulmocast-cli.git /app/mulmocast-cli
WORKDIR /app/mulmocast-cli

# 画像品質パッチを適用
COPY mulmocast-quality.patch .
RUN patch -p1 < mulmocast-quality.patch

# 依存関係をインストール
RUN yarn install --frozen-lockfile
```

### 2. mulmocast実行

```javascript
function generateMovie(scriptPath, outputPath, captionLang = null) {
  const mulmocastPath = '/app/mulmocast-cli';
  
  // 字幕言語に応じてコマンドを調整
  const captionArgs = captionLang ? `--caption ${captionLang}` : '';
  const command = `yarn movie "${scriptPath}" -f -o "${outputDir}" ${captionArgs}`;
  
  const startTime = Date.now();
  
  // 実行
  execSync(command, {
    cwd: mulmocastPath,
    stdio: 'inherit',
    timeout: 600000, // 10分タイムアウト
    maxBuffer: 1024 * 1024 * 10
  });
  
  // 出力ファイルの確認
  const outputFiles = captionLang 
    ? [`script__${captionLang}.mp4`]  // 字幕付き
    : ['script.mp4'];                  // 字幕なし
    
  // メトリクス収集
  const executionTime = Date.now() - startTime;
  const metrics = {
    imageGenerationTime: Math.round(executionTime * 0.65),
    audioGenerationTime: Math.round(executionTime * 0.20),
    videoProcessingTime: Math.round(executionTime * 0.15),
    totalTime: Math.round(executionTime / 1000)
  };
  
  return { videoPath: foundPath, metrics };
}
```

## OpenAI API統合

### 1. 画像生成（DALL-E 3）

```javascript
// mulmocast-cli内部で実行される
const generateImage = async (prompt) => {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: enhancePrompt(prompt),
    n: 1,
    size: "1792x1024",
    quality: process.env.OPENAI_IMAGE_QUALITY_DEFAULT || "medium",
    style: "vivid"
  });
  
  return response.data[0].url;
};

// プロンプト強化
const enhancePrompt = (basePrompt) => {
  return `ジブリ風アニメーション、ソフトパステルカラー、${basePrompt}、高品質、詳細な背景、映画的な構図`;
};
```

### 2. 音声生成（OpenAI TTS）

```javascript
// mulmocast-cli内部で実行される
const generateSpeech = async (text, voiceId) => {
  const response = await openai.audio.speech.create({
    model: "tts-1-hd",
    voice: voiceId, // alloy, echo, fable, nova, onyx, shimmer
    input: text,
    speed: 1.0
  });
  
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer;
};
```

## ファイル管理

### 1. 一意のパス生成

```javascript
function createUniquePaths(videoId) {
  const uniqueDir = path.join(WORK_DIR, 'temp', videoId);
  return {
    tempDir: uniqueDir,
    scriptPath: path.join(uniqueDir, 'script.json'),
    outputPath: path.join(uniqueDir, 'output.mp4')
  };
}
```

### 2. クリーンアップ

```javascript
// 処理完了後の一時ファイル削除
finally {
  if (uniquePaths && uniquePaths.tempDir) {
    try {
      console.log('🧹 一時ファイルをクリーンアップ中...');
      if (fs.existsSync(uniquePaths.tempDir)) {
        fs.rmSync(uniquePaths.tempDir, { recursive: true, force: true });
        console.log(`✅ 一時ディレクトリを削除: ${uniquePaths.tempDir}`);
      }
    } catch (cleanupError) {
      console.error('⚠️ クリーンアップエラー:', cleanupError.message);
    }
  }
}
```

## アップロード処理

### 1. 動画アップロード

```javascript
async function uploadVideoToSupabase(localPath, videoId) {
  const fileName = `${videoId}/video.mp4`;
  const fileBuffer = fs.readFileSync(localPath);
  
  // ファイルサイズ計算
  const fileSizeMB = fileBuffer.length / (1024 * 1024);
  
  // アップロード（リトライ付き）
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from('videos')
        .upload(fileName, fileBuffer, {
          contentType: 'video/mp4',
          upsert: false,
        });
        
      if (error) throw error;
      
      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);
        
      return publicUrl;
      
    } catch (error) {
      if (attempt === MAX_RETRY_ATTEMPTS - 1) throw error;
      
      // 指数バックオフ
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 2. メタデータ抽出

```javascript
// FFprobeで動画メタデータを取得
const extractVideoMetadata = (videoPath) => {
  const ffprobeCommand = `ffprobe -v quiet -print_format json -show_streams "${videoPath}"`;
  const output = execSync(ffprobeCommand, { encoding: 'utf8' });
  const metadata = JSON.parse(output);
  
  let duration = 0;
  let resolution = "1920x1080";
  
  if (metadata.streams && metadata.streams.length > 0) {
    const stream = metadata.streams[0];
    if (stream.width && stream.height) {
      resolution = `${stream.width}x${stream.height}`;
    }
    if (stream.duration) {
      duration = Math.round(parseFloat(stream.duration));
    }
  }
  
  return { duration, resolution };
};
```

## 並行処理制御

### 1. レート制限

```javascript
// リクエスト数のトラッキング
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 1; // Cloud Run concurrency=1

// レート制限チェック
if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
  // 429エラーを返す前にvideo statusを更新
  await updateVideoStatus(video_id, 'failed', {
    error_msg: 'Rate limit exceeded (429)'
  });
  
  res.writeHead(429, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: 'Rate limit exceeded',
    activeRequests,
    maxRequests: MAX_CONCURRENT_REQUESTS
  }));
  return;
}
```

### 2. 同期処理

```javascript
// webhook処理を同期的に実行（完了まで待機）
try {
  activeRequests++;
  console.log(`📊 アクティブリクエスト数: ${activeRequests}/${MAX_CONCURRENT_REQUESTS}`);
  
  const result = await processVideoGeneration(requestData);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: true,
    message: 'Video generation completed',
    video_id: requestData.video_id
  }));
  
} finally {
  activeRequests--;
  console.log(`📊 アクティブリクエスト数: ${activeRequests}/${MAX_CONCURRENT_REQUESTS}`);
}
```

## プレビュー生成

### 1. 画像のみ生成

```javascript
async function processImagePreview(payload) {
  const { video_id, script_json } = payload;
  
  // 画像品質を低に設定（プレビュー用）
  const previewScript = JSON.parse(JSON.stringify(script_json));
  previewScript.imageParams.quality = 'low';
  
  // mulmocast-cliで画像のみ生成
  const command = `yarn images "${scriptPath}" -o "${outputDir}"`;
  execSync(command, {
    cwd: mulmocastPath,
    stdio: 'inherit',
    timeout: 300000 // 5分タイムアウト
  });
  
  // 生成された画像をアップロード
  const uploadedFiles = await uploadOutputDirectoryToSupabase(
    outputDir, 
    video_id
  );
  
  // preview_dataを更新
  await updateVideoPreview(video_id, {
    images: imageFiles,
    generatedAt: new Date().toISOString()
  });
}
```

## エラーハンドリング

### 1. エラー種別

```javascript
const ERROR_TYPES = {
  INVALID_INPUT: 'Invalid video generation request',
  OPENAI_RATE_LIMIT: 'OpenAI API rate limit exceeded',
  STORAGE_ERROR: 'Failed to upload video',
  PROCESSING_ERROR: 'Video processing failed',
  TIMEOUT: 'Processing timeout'
};
```

### 2. エラー通知

```javascript
// Slack通知（オプション）
async function sendSlackErrorNotification(error, context) {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  
  const message = {
    attachments: [{
      color: '#dc3545',
      title: 'Video Generation Error',
      fields: [
        { title: 'Video ID', value: context.video_id, short: true },
        { title: 'Error Type', value: error.type, short: true },
        { title: 'Message', value: error.message },
        { title: 'Stack Trace', value: `\`\`\`${error.stack}\`\`\`` }
      ],
      footer: 'showgeki2',
      ts: Math.floor(Date.now() / 1000)
    }]
  };
  
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
}
```

## パフォーマンスメトリクス

### 1. 処理時間の記録

```javascript
const metrics = {
  imageGenerationTime: 0,   // 画像生成（DALL-E 3）
  audioGenerationTime: 0,   // 音声生成（TTS）
  videoProcessingTime: 0,   // 動画合成（FFmpeg）
  uploadTime: 0,            // アップロード
  totalTime: 0              // 総処理時間
};

// データベースに記録
await supabase
  .from('videos')
  .update({
    proc_time: metrics.totalTime,
    metrics: metrics // 将来的に詳細メトリクスカラムを追加
  })
  .eq('id', video_id);
```

### 2. モニタリング

```javascript
// Cloud Runログに出力
console.log('📊 詳細処理時間:');
console.log(`  - 画像生成: ${metrics.imageGenerationTime}秒`);
console.log(`  - 音声生成: ${metrics.audioGenerationTime}秒`);
console.log(`  - 動画合成: ${metrics.videoProcessingTime}秒`);
console.log(`  - アップロード: ${metrics.uploadTime}秒`);
console.log(`  - 総処理時間: ${metrics.totalTime}秒`);
```

## まとめ

showgeki2の動画生成パイプラインは、複数のAIサービスを組み合わせて高品質な動画を自動生成するシステムです。主な特徴：

1. **スケーラブル**: Cloud Runによる自動スケーリング
2. **高品質**: DALL-E 3とOpenAI TTSによる高品質コンテンツ
3. **信頼性**: リトライ機構とエラーハンドリング
4. **モニタリング**: 詳細なメトリクスとログ
5. **最適化**: 並行処理制御とリソース管理