# パフォーマンス最適化ガイド

## 概要

showgeki2システムのパフォーマンスを最大化し、コストを最小化するための包括的な最適化ガイドです。フロントエンド、バックエンド、データベース、インフラストラクチャの各層での最適化手法を説明します。

## パフォーマンス指標

### 目標値

| 指標 | 目標値 | 現在値（参考） |
|------|--------|---------------|
| ページロード時間 | < 2秒 | - |
| API レスポンス時間 | < 500ms | - |
| 動画生成時間 | < 5分 | 3-7分 |
| 動画生成成功率 | > 95% | - |
| 月間コスト | < $100 | - |

## 1. フロントエンド最適化

### 1.1 Next.js 最適化設定

```javascript
// next.config.js
module.exports = {
  // 画像最適化
  images: {
    domains: ['your-supabase-url.supabase.co'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // SWC による高速ビルド
  swcMinify: true,
  
  // 実験的機能
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@supabase/supabase-js', 'lodash'],
  },
  
  // Webpack最適化
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Tree shaking強化
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // チャンク分割戦略
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
          },
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
};
```

### 1.2 コンポーネントの遅延ロード

```typescript
// 重いコンポーネントの動的インポート
import dynamic from 'next/dynamic';

// ScriptDirectorは必要時のみロード
const ScriptDirector = dynamic(
  () => import('@/components/editor/ScriptDirector'),
  {
    loading: () => <div className="animate-pulse h-96 bg-gray-800 rounded" />,
    ssr: false,
  }
);

// Monaco Editorの遅延ロード
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { 
    ssr: false,
    loading: () => <div>エディタを読み込み中...</div>
  }
);
```

### 1.3 画像最適化

```typescript
// components/OptimizedImage.tsx
import Image from 'next/image';
import { useState } from 'react';

export const OptimizedImage = ({ src, alt, priority = false }) => {
  const [isLoading, setLoading] = useState(true);
  
  return (
    <div className="relative overflow-hidden">
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className={`
          duration-700 ease-in-out
          ${isLoading ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0'}
        `}
        onLoadingComplete={() => setLoading(false)}
      />
    </div>
  );
};

// プレースホルダー付き画像
const getBase64 = async (url: string) => {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:image/jpeg;base64,${base64}`;
};
```

### 1.4 バンドルサイズ削減

```bash
# バンドル分析
npm install --save-dev @next/bundle-analyzer

# package.json
"scripts": {
  "analyze": "ANALYZE=true next build"
}
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... 他の設定
});
```

### 1.5 キャッシング戦略

```typescript
// lib/cache.ts
const CACHE_VERSION = 'v1';

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, { data: any; timestamp: number }>;
  private ttl: number = 5 * 60 * 1000; // 5分
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new CacheManager();
    }
    return this.instance;
  }
  
  set(key: string, data: any, ttl?: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (ttl || this.ttl)
    });
  }
  
  get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (cached.timestamp < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  // Service Worker キャッシュ
  async cacheResponse(request: Request, response: Response) {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response.clone());
  }
}
```

## 2. API/バックエンド最適化

### 2.1 APIレスポンス最適化

```typescript
// app/api/stories/route.ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  
  // 必要なフィールドのみ選択
  const { data, count } = await supabase
    .from('stories')
    .select('id, title, status, created_at, beats', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
    
  // キャッシュヘッダー設定
  return NextResponse.json(
    { data, count, page, limit },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'CDN-Cache-Control': 'max-age=300',
      }
    }
  );
}
```

### 2.2 データベースクエリ最適化

```typescript
// lib/db/optimized-queries.ts
export const getStoriesWithVideos = async (userId: string, limit = 20) => {
  // JOINを使用した効率的なクエリ
  const { data } = await supabase
    .from('stories')
    .select(`
      id,
      title,
      status,
      created_at,
      videos!inner (
        id,
        status,
        video_url,
        duration
      )
    `)
    .eq('uid', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  return data;
};

// バッチ処理の最適化
export const batchUpdateStories = async (updates: Array<{id: string, status: string}>) => {
  // 単一のクエリで複数更新
  const { error } = await supabase.rpc('batch_update_stories', {
    updates: updates
  });
  
  return { error };
};
```

### 2.3 並行処理の最適化

```javascript
// webhook-handler.js
const Queue = require('bull');
const videoQueue = new Queue('video generation', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  }
});

// ジョブ処理
videoQueue.process(3, async (job) => { // 3つまで並行処理
  const { videoId, scriptJson } = job.data;
  
  try {
    await processVideoGeneration({
      video_id: videoId,
      script_json: scriptJson
    });
  } catch (error) {
    throw error; // Bullが自動的にリトライ
  }
});

// ジョブ追加
const addVideoJob = async (videoId, scriptJson) => {
  await videoQueue.add({
    videoId,
    scriptJson
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    }
  });
};
```

## 3. 動画生成パイプライン最適化

### 3.1 画像生成の最適化

```javascript
// 画像品質の動的調整
const getImageQuality = (environment) => {
  const qualityMap = {
    'development': 'low',    // 開発: 低品質で高速
    'staging': 'medium',     // ステージング: 中品質
    'production': 'medium',  // 本番: 中品質（コストとのバランス）
  };
  
  return process.env.OPENAI_IMAGE_QUALITY_DEFAULT || 
         qualityMap[environment] || 
         'medium';
};

// 画像キャッシュの実装
const imageCache = new Map();

const generateOrGetCachedImage = async (prompt) => {
  const cacheKey = crypto.createHash('md5').update(prompt).digest('hex');
  
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }
  
  const imageUrl = await generateImage(prompt);
  imageCache.set(cacheKey, imageUrl);
  
  // メモリ管理
  if (imageCache.size > 100) {
    const firstKey = imageCache.keys().next().value;
    imageCache.delete(firstKey);
  }
  
  return imageUrl;
};
```

### 3.2 音声生成の最適化

```javascript
// 音声生成のバッチ処理
const generateAudioBatch = async (texts, voiceId) => {
  const promises = texts.map(text => 
    generateSpeech(text, voiceId).catch(err => ({
      error: err,
      text: text
    }))
  );
  
  // Promise.allSettledで部分的な失敗を許容
  const results = await Promise.allSettled(promises);
  
  return results.map((result, index) => ({
    text: texts[index],
    audio: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null
  }));
};
```

### 3.3 動画処理の最適化

```bash
# FFmpegコマンドの最適化
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -preset faster \        # より高速なエンコード
  -crf 23 \              # 品質調整（18-28、大きいほど低品質・高速）
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \  # ストリーミング最適化
  output.mp4
```

## 4. データベース最適化

### 4.1 インデックス最適化

```sql
-- 複合インデックスの作成
CREATE INDEX idx_stories_uid_status_created 
ON stories(uid, status, created_at DESC);

-- 部分インデックス（特定条件のみ）
CREATE INDEX idx_videos_processing 
ON videos(story_id, created_at) 
WHERE status IN ('queued', 'processing');

-- インデックスの使用状況確認
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 4.2 クエリ最適化

```sql
-- EXPLAINで実行計画を確認
EXPLAIN (ANALYZE, BUFFERS) 
SELECT s.*, v.video_url
FROM stories s
LEFT JOIN videos v ON s.id = v.story_id
WHERE s.uid = 'user-id'
  AND s.status = 'completed'
ORDER BY s.created_at DESC
LIMIT 20;

-- マテリアライズドビューの活用
CREATE MATERIALIZED VIEW user_story_stats AS
SELECT 
  uid,
  COUNT(*) as total_stories,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_stories,
  AVG(beats) as avg_beats,
  MAX(created_at) as last_story_date
FROM stories
GROUP BY uid;

-- 定期的な更新
CREATE OR REPLACE FUNCTION refresh_user_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_story_stats;
END;
$$ LANGUAGE plpgsql;
```

### 4.3 接続プーリング

```typescript
// lib/db/connection-pool.ts
import { createClient } from '@supabase/supabase-js';

class SupabasePool {
  private static instance: SupabasePool;
  private clients: Map<string, any> = new Map();
  private maxConnections = 10;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new SupabasePool();
    }
    return this.instance;
  }
  
  getClient(key: string = 'default') {
    if (!this.clients.has(key)) {
      if (this.clients.size >= this.maxConnections) {
        // 最も古い接続を削除
        const oldestKey = this.clients.keys().next().value;
        this.clients.delete(oldestKey);
      }
      
      this.clients.set(key, createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
        {
          auth: { persistSession: false },
          db: { 
            schema: 'public',
          }
        }
      ));
    }
    
    return this.clients.get(key);
  }
}
```

## 5. インフラ最適化

### 5.1 Cloud Run設定最適化

```yaml
# clouddeploy.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: showgeki2-auto-process
spec:
  template:
    metadata:
      annotations:
        # CPU使用率ベースの自動スケーリング
        run.googleapis.com/cpu-throttling: "false"
        autoscaling.knative.dev/metric: "cpu"
        autoscaling.knative.dev/target: "80"
        
        # 起動時間の最適化
        run.googleapis.com/startup-cpu-boost: "true"
        
    spec:
      containerConcurrency: 1
      timeoutSeconds: 3600
      
      # リソース設定
      resources:
        limits:
          cpu: "4"
          memory: "8Gi"
        requests:
          cpu: "2"
          memory: "4Gi"
```

### 5.2 CDN設定

```javascript
// vercel.json
{
  "headers": [
    {
      "source": "/images/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/cached/:path*",
      "destination": "/api/:path*",
      "has": [
        {
          "type": "header",
          "key": "x-cache-control",
          "value": "(?<age>.*)"
        }
      ]
    }
  ]
}
```

### 5.3 コスト最適化

```javascript
// scripts/cost-optimizer.js
const analyzeUsage = async () => {
  // Cloud Run使用状況
  const cloudRunCost = await getCloudRunMetrics();
  
  // Supabase使用状況
  const { data: dbSize } = await supabase.rpc('get_database_size');
  const { data: storageSize } = await supabase.storage.from('videos').list();
  
  // OpenAI使用状況
  const openAiUsage = await getOpenAIUsage();
  
  const recommendations = [];
  
  // 推奨事項の生成
  if (cloudRunCost.avgCpuUtilization < 30) {
    recommendations.push({
      type: 'cloud_run',
      action: 'CPUを2から1に削減',
      savings: '$10/月'
    });
  }
  
  if (storageSize.totalGB > 100) {
    recommendations.push({
      type: 'storage',
      action: '古い動画の圧縮またはアーカイブ',
      savings: '$5/月'
    });
  }
  
  return { usage: { cloudRunCost, dbSize, storageSize, openAiUsage }, recommendations };
};
```

## 6. モニタリングとプロファイリング

### 6.1 パフォーマンスプロファイリング

```typescript
// lib/profiler.ts
export class PerformanceProfiler {
  private marks: Map<string, number> = new Map();
  
  start(label: string) {
    this.marks.set(label, performance.now());
  }
  
  end(label: string): number {
    const start = this.marks.get(label);
    if (!start) return 0;
    
    const duration = performance.now() - start;
    this.marks.delete(label);
    
    // 閾値を超えたら警告
    if (duration > 1000) {
      console.warn(`Performance: ${label} took ${duration}ms`);
    }
    
    return duration;
  }
  
  async profile<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      return await fn();
    } finally {
      this.end(label);
    }
  }
}

// 使用例
const profiler = new PerformanceProfiler();
const result = await profiler.profile('generate_script', async () => {
  return await generateScript(story);
});
```

### 6.2 メモリリーク検出

```javascript
// scripts/memory-monitor.js
const v8 = require('v8');
const heapSnapshots = [];

const captureHeapSnapshot = () => {
  const snapshot = v8.writeHeapSnapshot();
  heapSnapshots.push({
    timestamp: Date.now(),
    file: snapshot,
    memory: process.memoryUsage()
  });
  
  // 古いスナップショットを削除
  if (heapSnapshots.length > 5) {
    const old = heapSnapshots.shift();
    fs.unlinkSync(old.file);
  }
};

// 定期的にスナップショット取得
setInterval(captureHeapSnapshot, 60 * 60 * 1000); // 1時間ごと

// メモリ使用量の監視
setInterval(() => {
  const usage = process.memoryUsage();
  if (usage.heapUsed > 1024 * 1024 * 1024) { // 1GB超
    console.error('High memory usage detected:', usage);
    // アラート送信
  }
}, 60 * 1000); // 1分ごと
```

## 最適化チェックリスト

### 開発時
- [ ] バンドルサイズの確認（目標: < 500KB）
- [ ] Lighthouse スコアの確認（目標: > 90）
- [ ] 不要な依存関係の削除
- [ ] 画像フォーマットの最適化

### デプロイ前
- [ ] 本番ビルドの最適化確認
- [ ] キャッシュ設定の確認
- [ ] データベースインデックスの確認
- [ ] API レート制限の設定

### 運用中
- [ ] パフォーマンスメトリクスの監視
- [ ] コスト分析レポートの確認
- [ ] ボトルネックの特定と改善
- [ ] スケーリング設定の調整

## まとめ

パフォーマンス最適化は継続的なプロセスです：
1. **測定**: メトリクスの収集と分析
2. **最適化**: ボトルネックの特定と改善
3. **検証**: 改善効果の確認
4. **監視**: 継続的なモニタリング

関連ドキュメント:
- [監視・ログ管理](./monitoring-logging.md)
- [トラブルシューティング](./troubleshooting-guide.md)
- [デプロイメント](./deployment.md)