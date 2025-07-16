# Supabase Storage バケット設定

## face-reference バケットの作成

顔検出機能を使用するには、Supabase Storageに`face-reference`バケットを作成する必要があります。

### 手順

1. **Supabase Dashboardにログイン**
   - プロジェクトダッシュボードを開く

2. **Storageセクションに移動**
   - 左側のメニューから「Storage」をクリック

3. **新しいバケットを作成**
   - 「New bucket」ボタンをクリック
   - 以下の設定で作成：
     - **Name**: `face-reference`
     - **Public bucket**: ✅ チェックを入れる（公開バケット）
     - **File size limit**: 10MB
     - **Allowed MIME types**: `image/*`（画像ファイルのみ許可）

4. **バケットポリシーの設定**（オプション）
   ```sql
   -- 認証されたユーザーのみアップロード可能
   CREATE POLICY "Authenticated users can upload face references"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'face-reference');

   -- 誰でも読み取り可能（公開URL用）
   CREATE POLICY "Anyone can view face references"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'face-reference');

   -- ユーザーは自分のファイルのみ削除可能
   CREATE POLICY "Users can delete own face references"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (bucket_id = 'face-reference' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

### バケット構造

```
face-reference/
├── instant/
│   └── {uid}/
│       ├── {timestamp}.jpg     # アップロードされた元画像
│       └── {timestamp}.png     # アップロードされた元画像
└── faces/
    └── {workflow_id}/
        ├── 0_{timestamp}_face.jpg      # 切り取られた顔画像
        ├── 0_{timestamp}_thumb.jpg     # サムネイル画像
        ├── 1_{timestamp}_face.jpg
        └── 1_{timestamp}_thumb.jpg
```

### セキュリティ設定

- **Public bucket**: 生成されたURLで誰でもアクセス可能
- **File size limit**: 10MBまで
- **MIME types**: 画像ファイルのみ許可
- **Path structure**: ユーザーIDベースでファイルを分離

### トラブルシューティング

#### エラー: "Bucket not found"
→ `face-reference`バケットが作成されていません。上記の手順で作成してください。

#### エラー: "Invalid file type"
→ 画像ファイル以外をアップロードしようとしています。JPEG、PNG、GIF、WebPのみサポートされています。

#### エラー: "File size too large"
→ 10MBを超えるファイルはアップロードできません。画像を圧縮してください。