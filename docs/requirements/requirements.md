## mulmocast GUI PoC 要件定義（決定版）

### 1. 目的と範囲

ブラウザだけで **ストーリー入力 → mulmoscript 自動生成 → 動画生成 → 閲覧・管理** を体験できる最小実行可能 GUI を作る。
将来の本番化（認証・課金・RLS 等）を見据えつつ、現段階では **匿名ユーザーで動く PoC** に絞る。

---

### 2. 技術スタック・インフラ

| 項目         | 採用技術                                                                            |
| ---------- | ------------------------------------------------------------------------------- |
| フロント／SSR   | Next.js (App Router) on **Vercel**                                              |
| API 層      | **Vercel API Routes**（Node ランタイム）                                               |
| DB & ストレージ | **Supabase**（PostgreSQL・Storage）<br>※RLS 不使用、Service Role キーを API Route 内部でのみ利用 |
| バリデーション    | **Zod** で入出力・DB 行スキーマを統一                                                        |
| 動画生成ジョブ    | **Cloud Run Jobs**（mulmocast CLI＋FFmpeg コンテナ）                                   |
| ユーザー識別     | ブラウザ `localStorage` / Cookie に保存する匿名 UUID                                       |

---

### 3. 機能要件

| #    | 機能               | 説明                                                      |
| ---- | ---------------- | ------------------------------------------------------- |
| F-01 | 匿名 UID 発行        | 初回アクセスで UUIDv4 を生成し `showgeki_uid` に保存。以後同ブラウザでは同一 UID を利用 |
| F-02 | ワークスペース自動生成      | UID ごとにデフォルトワークスペースを 1 つ作成。ドロップダウンで複数 WS 切替可            |
| F-03 | ストーリー CRUD       | テキスト入力で新規作成・編集・削除。カード一覧表示                               |
| F-04 | mulmoscript 自動生成 | 「スクリプト生成」操作で LLM を呼び出し、自動生成された JSON をエディタに表示            |
| F-05 | スクリプト編集          | Monaco ベースエディタで自由編集・保存。Zod でリアルタイム JSON 構文検証            |
| F-06 | 動画生成             | 「実行」操作で Cloud Run Job をトリガーし、生成完了後に動画 URL を保存           |
| F-07 | 動画再生・管理          | 動画一覧ページで再生・削除。メタデータ（生成日時・解像度・サイズ）を表示                    |
| F-08 | マルチストーリー管理       | 1 ワークスペース内で複数ストーリーを並列管理。複製機能あり                          |

---

### 4. システムフロー

1. **フロント**

   * ユーザー操作を受け取り Vercel API Routes へ REST 呼び出し
2. **API Route**

   * Zod でリクエスト検証
   * Supabase に直接アクセス（Service Role キーを env に保持）
   * 動画生成時は Cloud Run Job を HTTPS 呼び出しで起動
3. **Cloud Run Job**

   * `videos` 行と `script_json` を取得
   * mulmocast で動画生成 → Supabase Storage にアップロード
   * `videos` 行を `completed / failed` に更新し URL を書き込み
4. **フロント更新**

   * ポーリングまたは WebSocket でジョブ進捗を取得し UI を更新

---

### 5. データモデル（ER 概要）

```
workspaces(id, uid, name, created_at)
stories(id, workspace_id, uid, title, text_raw, script_json, status, created_at, updated_at)
videos(id, story_id, uid, url, duration_sec, resolution, size_mb, status, error_msg, created_at)
```

* すべてのクエリで **WHERE uid = \:uid** を必須条件にし、論理的にユーザーデータを分離。

---

### 6. 非機能要件

| 区分     | 要件                                                        |
| ------ | --------------------------------------------------------- |
| 性能     | スクリプト生成 API 応答 ≤ 1 s、動画生成ジョブ ≤ 15 分／本                     |
| 可用性    | Vercel Hobby＋Supabase Free Tier を前提。PoC 目的のため SLA 指定なし    |
| セキュリティ | API でのみ Service Role キー使用。フロント配信 JS へは絶対に露出させない           |
| コスト    | 月間 100 本生成でも Vercel + Supabase + Cloud Run 合計 ≈ 10 USD 以内 |
| 拡張性    | 将来 Supabase Auth＋RLS へ移行できる構成（UID→ユーザーID昇格）               |
| 保守性    | Zod スキーマを型ソースオブトゥルースにし、API・DB・フロントで共有                     |

---

### 7. 画面構成

1. **Dashboard** – ワークスペース選択とストーリーカード一覧
2. **Story Editor** – 左側テキスト入力、右側 mulmoscript プレビュー／エディタ
3. **Video List** – サムネイル＋メタデータ表、絞り込み／削除
4. **Settings（将来）** – データエクスポート、UID マイグレーション

---

### 8. 今後の発展 (ロードマップ概要)

1. Supabase Auth 導入＋RLS 再有効化
2. Stripe 連携によるクレジット課金
3. tRPC もしくは Next.js Route Handlers (Edge Runtime) への移行
4. コラボ編集（Yjs）や字幕エディタなどポストプロダクション機能の拡張

---

以上が **mulmocast GUI PoC** の確定要件です。
