# Video Consistency Check Scripts

## Overview
ローカル環境で動画の一貫性チェックを実行するためのスクリプト群です。

## Prerequisites
- Node.js 18+
- `.env.local` with:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `GEMINI_API_KEY`

## Configuration

### Gemini Model Selection
環境変数またはスクリプト内の`GEMINI_MODEL`定数でモデルを変更できます：

```bash
# 環境変数で設定 (.env.local)
GEMINI_MODEL=gemini-2.5-pro
GEMINI_MAX_TOKENS=16384  # 長い動画の場合
```

```javascript
// scripts/check-video-consistency.js (line 30)
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';  // Default

// Available options:
// - 'gemini-2.5-flash': 高速、低コスト、クイックチェック用（デフォルト）
// - 'gemini-2.5-pro': 高品質、詳細な分析
```

## Usage

### 1. List Recent Videos
最近の動画IDをリスト表示します：

```bash
# デフォルト（最新10件）
node scripts/list-recent-videos.js

# 最新20件を表示
node scripts/list-recent-videos.js 20
```

### 2. Check Video Consistency
指定した動画の一貫性をチェックします：

```bash
# 基本的な使用方法（結果を表示のみ）
node scripts/check-video-consistency.js 4d53042a-a8e3-44db-88f3-f4121ffdd17e

# 結果をデータベースに保存
node scripts/check-video-consistency.js 4d53042a-a8e3-44db-88f3-f4121ffdd17e --save

# JSON形式で出力
node scripts/check-video-consistency.js 4d53042a-a8e3-44db-88f3-f4121ffdd17e --json
```

## Output

### Console Output
- カラー表示でスコアを視覚的に表示
- 🟢 90点以上：優秀
- 🟡 70-89点：良好  
- 🟠 50-69点：要改善
- 🔴 50点未満：不良

### File Output
`video-consistency-<VIDEO_ID>.json` ファイルに完全な結果を保存

## Example Workflow

```bash
# 1. 最近の動画を確認
$ node scripts/list-recent-videos.js 5

📹 Fetching recent 5 videos...

Status: 🟢 completed | 🟡 processing | 🔴 failed

 1. 🟢 4d53042a-a8e3-44db-88f3-f4121ffdd17e 未来の自分への手紙 2025/01/14 10:30:00
 2. 🟢 7e82b1c5-d9f2-4a87-b123-abc123def456 私の夢の会社 2025/01/14 09:15:00
 3. 🟡 9f34c2d6-e1a3-5b98-c234-bcd234efg567 理想の未来 2025/01/14 08:00:00

# 2. 特定の動画をチェック
$ node scripts/check-video-consistency.js 4d53042a-a8e3-44db-88f3-f4121ffdd17e

🔍 Fetching video details for ID: 4d53042a-a8e3-44db-88f3-f4121ffdd17e
✅ Found video: 未来の自分への手紙
   URL: https://...
   Duration: 0:45

📥 Downloading video...
✅ Downloaded 15.2 MB

🤖 Analyzing with Gemini (gemini-2.5-pro)...
✅ Analysis complete

📊 Analysis Results for "未来の自分への手紙"
────────────────────────────────────────────────────────────

📈 Overall Scores:
   視覚的一貫性: 85点 (良好)
   音声一貫性: 92点 (優秀)
   検出キャラクター: 主人公, 友人A, 友人B
   総シーン数: 5

🎬 Scene Analysis:
   Scene 1 (0s - 8.5s):
   Characters: 主人公
   Visual Scores:
     主人公: 95
   Audio Scores:
     主人公: 95

[... more scenes ...]

⚠️  Detected Issues:
   • 主人公の服装がシーン3で変化

────────────────────────────────────────────────────────────

📄 Full results saved to: video-consistency-4d53042a-a8e3-44db-88f3-f4121ffdd17e.json
```

## Troubleshooting

### Gemini API Rate Limit
```
❌ Error: 429 Too Many Requests
⚠️  Gemini API rate limit reached. Try again later.
```
→ 無料プランの制限です。表示される時間待つか、有料プランにアップグレードしてください。

### Video Not Found
```
❌ Error: Video not found
```
→ 指定したVideo IDが存在しません。`list-recent-videos.js`で確認してください。

### Empty GEMINI_API_KEY
```
Error: GEMINI_API_KEY is not set in .env.local
```
→ [Google AI Studio](https://aistudio.google.com/app/apikey)でAPIキーを取得し、`.env.local`に設定してください。