# 監視・ログ管理ガイド

## 概要

showgeki2システムの健全性を維持し、問題を早期に発見・解決するための監視とログ管理の包括的なガイドです。Google Cloud、Supabase、Vercelの各プラットフォームでの監視方法を説明します。

## 監視アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │     │   Cloud Run     │     │   Supabase      │
│   Analytics     │     │   Monitoring    │     │   Dashboard     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                         │
         └───────────────────────┴─────────────────────────┘
                                 │
                         ┌───────▼────────┐
                         │  統合ダッシュ  │
                         │  ボード        │
                         └────────────────┘
```

## 1. Cloud Run監視

### 1.1 基本メトリクス

```bash
# サービスの状態確認
gcloud run services describe showgeki2-auto-process \
  --region asia-northeast1 \
  --format json | jq '.status'

# CPUとメモリ使用率
gcloud monitoring read \
  "run.googleapis.com/container/cpu/utilizations" \
  --project showgeki2 \
  --filter 'resource.labels.service_name="showgeki2-auto-process"'
```

### 1.2 ログの確認

```bash
# リアルタイムログ監視
gcloud run services logs tail showgeki2-auto-process \
  --region asia-northeast1 \
  --follow

# 特定期間のログ取得
gcloud logging read \
  'resource.type="cloud_run_revision" 
   resource.labels.service_name="showgeki2-auto-process"
   timestamp>="2025-01-01T00:00:00Z"' \
  --limit 100 \
  --format json

# エラーログのみ抽出
gcloud logging read \
  'resource.type="cloud_run_revision"
   severity>=ERROR' \
  --limit 50
```

### 1.3 構造化ログの実装

```javascript
// webhook-handler.js でのログ実装
const log = (level, message, metadata = {}) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity: level,
    message: message,
    ...metadata,
    // Cloud Loggingのための追加フィールド
    'logging.googleapis.com/trace': process.env.TRACE_ID,
    'logging.googleapis.com/spanId': generateSpanId()
  }));
};

// 使用例
log('INFO', '動画生成開始', {
  video_id: videoId,
  story_id: storyId,
  action: 'video_generation_start'
});

log('ERROR', '動画生成失敗', {
  video_id: videoId,
  error: error.message,
  stack: error.stack
});
```

### 1.4 カスタムメトリクス

```javascript
// 処理時間の記録
const startTime = Date.now();

try {
  await generateVideo();
  const duration = Date.now() - startTime;
  
  log('INFO', '動画生成完了', {
    video_id: videoId,
    metrics: {
      total_duration_ms: duration,
      image_generation_ms: imageTime,
      audio_generation_ms: audioTime,
      video_processing_ms: videoTime
    }
  });
} catch (error) {
  log('ERROR', '処理失敗', {
    video_id: videoId,
    duration_ms: Date.now() - startTime,
    error_type: error.constructor.name
  });
}
```

## 2. Vercel監視

### 2.1 Vercel Analytics設定

```javascript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### 2.2 カスタムイベント追跡

```javascript
// lib/analytics.ts
import { track } from '@vercel/analytics';

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    track(eventName, properties);
  }
  
  // 開発環境ではコンソールに出力
  console.log('Analytics Event:', eventName, properties);
};

// 使用例
trackEvent('story_created', {
  story_id: story.id,
  beats: story.beats,
  workspace_id: story.workspace_id
});

trackEvent('video_generation_requested', {
  story_id: storyId,
  has_script: !!story.script_json
});
```

### 2.3 エラー追跡

```javascript
// lib/error-tracking.ts
export const logError = (error: Error, context?: any) => {
  console.error('Application Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });
  
  // Vercelのエラーレポートに送信
  if (window.reportError) {
    window.reportError(error);
  }
};

// グローバルエラーハンドラー
window.addEventListener('unhandledrejection', (event) => {
  logError(new Error(event.reason), {
    type: 'unhandled_promise_rejection'
  });
});
```

## 3. Supabase監視

### 3.1 データベースメトリクス

```sql
-- アクティブ接続数
SELECT count(*) FROM pg_stat_activity;

-- 長時間実行クエリ
SELECT 
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- テーブルサイズ
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3.2 Row Level Security監視

```sql
-- RLSポリシー違反の監視
CREATE OR REPLACE FUNCTION log_rls_violations()
RETURNS event_trigger AS $$
BEGIN
  INSERT INTO security_logs (
    event_time,
    user_id,
    table_name,
    operation,
    error_message
  )
  SELECT 
    NOW(),
    current_user,
    TG_TABLE_NAME,
    TG_OP,
    SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 監視クエリ
SELECT * FROM security_logs
WHERE event_time > NOW() - INTERVAL '24 hours'
ORDER BY event_time DESC;
```

### 3.3 ストレージ使用量

```javascript
// Supabase Storage監視
const getStorageMetrics = async () => {
  const { data, error } = await supabase.storage
    .from('videos')
    .list('', {
      limit: 1000,
      offset: 0
    });
    
  if (data) {
    const totalSize = data.reduce((sum, file) => sum + file.metadata.size, 0);
    const totalSizeGB = totalSize / (1024 * 1024 * 1024);
    
    console.log('Storage Metrics:', {
      total_files: data.length,
      total_size_gb: totalSizeGB.toFixed(2),
      average_size_mb: (totalSize / data.length / (1024 * 1024)).toFixed(2)
    });
  }
};
```

## 4. 統合ダッシュボード

### 4.1 Google Cloud Monitoring Dashboard

```json
{
  "displayName": "Showgeki2 Dashboard",
  "dashboardFilters": [],
  "gridLayout": {
    "widgets": [
      {
        "title": "動画生成成功率",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"logging.googleapis.com/user/video_generation_success_rate\"",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_RATE"
                }
              }
            }
          }]
        }
      },
      {
        "title": "平均処理時間",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"logging.googleapis.com/user/video_processing_time\"",
                "aggregation": {
                  "alignmentPeriod": "300s",
                  "perSeriesAligner": "ALIGN_MEAN"
                }
              }
            }
          }]
        }
      }
    ]
  }
}
```

### 4.2 カスタムメトリクスの定義

```bash
# メトリクス記述子の作成
gcloud logging metrics create video_generation_success_rate \
  --description="動画生成の成功率" \
  --log-filter='
    resource.type="cloud_run_revision"
    jsonPayload.action="video_generation_complete"
    (jsonPayload.status="completed" OR jsonPayload.status="failed")'

gcloud logging metrics create average_processing_time \
  --description="平均動画処理時間" \
  --log-filter='
    resource.type="cloud_run_revision"
    jsonPayload.metrics.total_duration_ms>0'
  --value-extractor='EXTRACT(jsonPayload.metrics.total_duration_ms)'
```

## 5. アラート設定

### 5.1 Cloud Runアラート

```bash
# エラー率アラート
gcloud alpha monitoring policies create \
  --notification-channels=$NOTIFICATION_CHANNEL_ID \
  --display-name="High Error Rate Alert" \
  --condition-display-name="Error rate > 10%" \
  --condition-type=threshold \
  --condition-threshold-value=0.1 \
  --condition-threshold-duration=300s \
  --condition-threshold-aggregation='{"alignmentPeriod":"60s","perSeriesAligner":"ALIGN_RATE"}'

# メモリ使用率アラート
gcloud alpha monitoring policies create \
  --notification-channels=$NOTIFICATION_CHANNEL_ID \
  --display-name="High Memory Usage" \
  --condition-display-name="Memory > 90%" \
  --condition-type=threshold \
  --condition-threshold-value=0.9
```

### 5.2 Slackアラート統合

```javascript
// lib/alerts.ts
const sendSlackAlert = async (alert: {
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  details?: any;
}) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;
  
  const color = {
    info: '#36a64f',
    warning: '#ff9800',
    error: '#dc3545',
    critical: '#ff0000'
  }[alert.severity];
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [{
        color,
        title: `${alert.severity.toUpperCase()}: ${alert.title}`,
        text: alert.message,
        fields: alert.details ? Object.entries(alert.details).map(([k, v]) => ({
          title: k,
          value: String(v),
          short: true
        })) : [],
        footer: 'Showgeki2 Monitoring',
        ts: Math.floor(Date.now() / 1000)
      }]
    })
  });
};
```

## 6. ログ分析クエリ

### 6.1 動画生成分析

```sql
-- BigQueryでのログ分析（Cloud Loggingをエクスポート）
WITH video_logs AS (
  SELECT
    JSON_EXTRACT_SCALAR(jsonPayload, '$.video_id') AS video_id,
    JSON_EXTRACT_SCALAR(jsonPayload, '$.status') AS status,
    CAST(JSON_EXTRACT_SCALAR(jsonPayload, '$.metrics.total_duration_ms') AS INT64) AS duration_ms,
    timestamp
  FROM `showgeki2.cloud_run_logs.run_googleapis_com_stdout`
  WHERE JSON_EXTRACT_SCALAR(jsonPayload, '$.action') = 'video_generation_complete'
)
SELECT
  DATE(timestamp) AS date,
  COUNT(*) AS total_videos,
  COUNTIF(status = 'completed') AS successful,
  COUNTIF(status = 'failed') AS failed,
  AVG(duration_ms) / 1000 AS avg_duration_sec,
  MAX(duration_ms) / 1000 AS max_duration_sec
FROM video_logs
GROUP BY date
ORDER BY date DESC;
```

### 6.2 エラー分析

```sql
-- エラーパターンの分析
SELECT
  JSON_EXTRACT_SCALAR(jsonPayload, '$.error_type') AS error_type,
  COUNT(*) AS occurrences,
  ARRAY_AGG(DISTINCT JSON_EXTRACT_SCALAR(jsonPayload, '$.video_id') LIMIT 5) AS sample_videos
FROM `showgeki2.cloud_run_logs.run_googleapis_com_stderr`
WHERE severity = 'ERROR'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY error_type
ORDER BY occurrences DESC;
```

## 7. パフォーマンス監視

### 7.1 レスポンスタイム監視

```javascript
// middleware.ts
export async function middleware(request: NextRequest) {
  const start = Date.now();
  
  const response = NextResponse.next();
  
  const duration = Date.now() - start;
  
  // レスポンスヘッダーに追加
  response.headers.set('X-Response-Time', `${duration}ms`);
  
  // 遅いリクエストをログ
  if (duration > 1000) {
    console.warn('Slow request detected:', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration_ms: duration
    });
  }
  
  return response;
}
```

### 7.2 キャッシュヒット率

```javascript
// lib/cache-monitoring.ts
let cacheStats = {
  hits: 0,
  misses: 0,
  errors: 0
};

export const getCacheStats = () => {
  const total = cacheStats.hits + cacheStats.misses;
  return {
    ...cacheStats,
    hitRate: total > 0 ? (cacheStats.hits / total) * 100 : 0
  };
};

// 定期的にメトリクスを送信
setInterval(() => {
  console.log('Cache Stats:', getCacheStats());
  cacheStats = { hits: 0, misses: 0, errors: 0 }; // リセット
}, 60000); // 1分ごと
```

## 8. 定期レポート

### 8.1 日次レポートスクリプト

```javascript
// scripts/daily-report.js
const generateDailyReport = async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  // 動画生成統計
  const { data: videoStats } = await supabase
    .from('videos')
    .select('status, proc_time')
    .gte('created_at', yesterday.toISOString())
    .lt('created_at', new Date().toISOString());
    
  const report = {
    date: yesterday.toISOString().split('T')[0],
    videos: {
      total: videoStats.length,
      completed: videoStats.filter(v => v.status === 'completed').length,
      failed: videoStats.filter(v => v.status === 'failed').length,
      avgProcessingTime: videoStats
        .filter(v => v.proc_time)
        .reduce((sum, v) => sum + v.proc_time, 0) / videoStats.length
    },
    // 他の統計...
  };
  
  // レポート送信
  await sendSlackReport(report);
  await saveReportToDatabase(report);
};
```

### 8.2 週次トレンド分析

```sql
-- 週次トレンドクエリ
WITH weekly_stats AS (
  SELECT
    DATE_TRUNC('week', created_at) AS week,
    COUNT(*) AS total_stories,
    COUNT(DISTINCT uid) AS unique_users,
    AVG(beats) AS avg_beats
  FROM stories
  WHERE created_at > CURRENT_DATE - INTERVAL '12 weeks'
  GROUP BY week
)
SELECT
  week,
  total_stories,
  unique_users,
  avg_beats,
  LAG(total_stories) OVER (ORDER BY week) AS prev_week_stories,
  (total_stories - LAG(total_stories) OVER (ORDER BY week))::FLOAT / 
    LAG(total_stories) OVER (ORDER BY week) * 100 AS growth_rate
FROM weekly_stats
ORDER BY week DESC;
```

## 監視チェックリスト

### 日次チェック
- [ ] Cloud Runエラーログの確認
- [ ] 動画生成成功率の確認（目標: 95%以上）
- [ ] 平均処理時間の確認（目標: 5分以内）
- [ ] ストレージ使用量の確認

### 週次チェック
- [ ] パフォーマンストレンドの分析
- [ ] エラーパターンの分析
- [ ] コスト分析
- [ ] キャパシティプランニング

### 月次チェック
- [ ] ログローテーションの確認
- [ ] アラート設定の見直し
- [ ] メトリクスの精度確認
- [ ] ダッシュボードの更新

## まとめ

効果的な監視とログ管理により：
1. **問題の早期発見**: アラートによる迅速な対応
2. **パフォーマンス最適化**: メトリクスに基づいた改善
3. **コスト管理**: リソース使用の可視化
4. **ユーザー体験向上**: エラーの削減と応答性の改善

関連ドキュメント:
- [トラブルシューティングガイド](./troubleshooting-guide.md)
- [パフォーマンス最適化](./performance-optimization.md)
- [セキュリティガイド](./security-guide.md)