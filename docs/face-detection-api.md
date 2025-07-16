# 顔検出API仕様書

## API一覧

### 1. 顔検出API
**エンドポイント**: `POST /api/instant/detect-faces`

顔検出を実行し、検出された顔を切り取って保存します。

### 2. タグ更新API
**エンドポイント**: `POST /api/instant/update-face-tags`

顔にタグ（名前、役割）を設定します。

### 3. 順序更新API
**エンドポイント**: `PUT /api/instant/update-face-tags`

顔の表示順序を更新します。

### 4. 顔削除API
**エンドポイント**: `DELETE /api/instant/update-face-tags`

顔情報を削除します。

---

## 1. 顔検出API

### リクエスト

```http
POST /api/instant/detect-faces
Content-Type: application/json
X-User-UID: {user_id}
```

```json
{
  "imageUrl": "https://example.com/image.jpg",
  "workflowId": "123e4567-e89b-12d3-a456-426614174000",  // オプション
  "storyboardId": "234e5678-f89c-23e4-b567-537625285001" // オプション
}
```

### レスポンス

**成功時 (200 OK)**
```json
{
  "success": true,
  "faces": [
    {
      "id": "face-0-1642345678901",
      "index": 0,
      "imageUrl": "https://supabase.co/storage/v1/object/public/showgeki2/faces/...",
      "thumbnailUrl": "https://supabase.co/storage/v1/object/public/showgeki2/faces/..._thumb.jpg",
      "boundingBox": {
        "x": 100,
        "y": 50,
        "width": 150,
        "height": 200,
        "vertices": [
          { "x": 100, "y": 50 },
          { "x": 250, "y": 50 },
          { "x": 250, "y": 250 },
          { "x": 100, "y": 250 }
        ]
      },
      "confidence": 0.98,
      "attributes": {
        "joy": 0.8,
        "sorrow": 0.1,
        "anger": 0.05,
        "surprise": 0.05
      }
    }
  ],
  "totalFaces": 1,
  "originalImageUrl": "https://example.com/image.jpg",
  "processedAt": "2024-01-15T10:30:00.000Z"
}
```

**エラー時**
```json
{
  "success": false,
  "error": "エラーメッセージ",
  "faces": [],
  "totalFaces": 0,
  "originalImageUrl": "",
  "processedAt": "2024-01-15T10:30:00.000Z"
}
```

### エラーコード

| ステータス | エラー | 説明 |
|-----------|-------|------|
| 401 | 認証が必要です | X-User-UIDヘッダーが未設定 |
| 400 | 画像URLが必要です | imageUrlが未指定 |
| 400 | 無効な画像URLです | URLが不正または画像ファイルでない |
| 400 | 対応していない画像形式です | サポート外の画像フォーマット |
| 500 | 予期しないエラーが発生しました | サーバー内部エラー |

---

## 2. タグ更新API

### リクエスト

```http
POST /api/instant/update-face-tags
Content-Type: application/json
X-User-UID: {user_id}
```

```json
{
  "faceId": "550e8400-e29b-41d4-a716-446655440000",
  "tag": {
    "name": "田中太郎",
    "role": "protagonist",  // protagonist | friend | family | colleague | other
    "description": "主人公の親友"  // オプション
  }
}
```

### レスポンス

**成功時 (200 OK)**
```json
{
  "success": true,
  "face": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "index": 0,
    "imageUrl": "https://...",
    "thumbnailUrl": "https://...",
    "boundingBox": { ... },
    "confidence": 0.98,
    "attributes": { ... },
    "tag": {
      "name": "田中太郎",
      "role": "protagonist",
      "description": "主人公の親友",
      "order": 0
    }
  }
}
```

---

## 3. 順序更新API

### リクエスト

```http
PUT /api/instant/update-face-tags
Content-Type: application/json
X-User-UID: {user_id}
```

```json
{
  "faceIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660f9500-f39c-52e5-c827-557766551111",
    "770fa600-a40d-63f6-d938-668877662222"
  ]
}
```

### レスポンス

**成功時 (200 OK)**
```json
{
  "success": true
}
```

---

## 4. 顔削除API

### リクエスト

```http
DELETE /api/instant/update-face-tags?faceId={face_id}
X-User-UID: {user_id}
```

### レスポンス

**成功時 (200 OK)**
```json
{
  "success": true
}
```

---

## 使用例

### JavaScript/TypeScript

```typescript
// 1. 顔検出
async function detectFaces(imageUrl: string) {
  const response = await fetch('/api/instant/detect-faces', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-UID': userId,
    },
    body: JSON.stringify({ imageUrl }),
  });
  
  const data = await response.json();
  if (data.success) {
    console.log(`${data.totalFaces}人の顔を検出しました`);
    return data.faces;
  } else {
    throw new Error(data.error);
  }
}

// 2. タグ付け
async function tagFace(faceId: string, name: string, role: string) {
  const response = await fetch('/api/instant/update-face-tags', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-UID': userId,
    },
    body: JSON.stringify({
      faceId,
      tag: { name, role }
    }),
  });
  
  return response.json();
}
```

### cURL

```bash
# 顔検出
curl -X POST https://your-domain.com/api/instant/detect-faces \
  -H "Content-Type: application/json" \
  -H "X-User-UID: user123" \
  -d '{
    "imageUrl": "https://example.com/photo.jpg"
  }'

# タグ更新
curl -X POST https://your-domain.com/api/instant/update-face-tags \
  -H "Content-Type: application/json" \
  -H "X-User-UID: user123" \
  -d '{
    "faceId": "550e8400-e29b-41d4-a716-446655440000",
    "tag": {
      "name": "山田花子",
      "role": "friend"
    }
  }'
```

## 制限事項

- 画像サイズ: 最大10MB
- 対応フォーマット: JPEG, PNG, GIF, WebP
- 最大検出顔数: 制限なし（ただし、パフォーマンスの観点から50人程度を推奨）
- タグの文字数制限:
  - name: 最大100文字
  - description: 最大500文字

## レート制限

- Vision API: Google Cloudの割り当てに準拠
- その他のAPI: 1分間に60リクエストまで

## セキュリティ

- 全てのAPIはユーザー認証が必要（X-User-UIDヘッダー）
- ユーザーは自分が作成したワークフローの顔情報のみアクセス可能
- 顔画像のURLは推測困難なランダムな文字列を使用