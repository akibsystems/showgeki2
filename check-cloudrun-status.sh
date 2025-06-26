#!/bin/bash

# Cloud Run インスタンス状態チェックスクリプト（非侵襲版）
# リクエストを送らずにログとメタデータのみで状態を判定

set -e

# 設定
PROJECT_ID="showgeki2"
SERVICE_NAME="showgeki2-auto-process"
REGION="asia-northeast1"

# 色設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Cloud Run サービス状態をチェック中...（非侵襲モード）${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. サービス基本情報
echo -e "${BLUE}📊 サービス基本情報${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(status.url)")

SERVICE_STATUS=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(status.conditions[0].type)")

REVISION_NAME=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(status.traffic[0].revisionName)")

echo "  サービス名: $SERVICE_NAME"
echo "  URL: $SERVICE_URL"
echo "  ステータス: $SERVICE_STATUS"
echo "  現在のリビジョン: $REVISION_NAME"
echo ""

# 2. スケール設定確認
echo -e "${BLUE}⚙️  スケール設定${NC}"
MIN_SCALE=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])")

MAX_SCALE=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/maxScale'])")

echo "  最小スケール: ${MIN_SCALE:-0} インスタンス"
echo "  最大スケール: ${MAX_SCALE:-1000} インスタンス"
echo ""

# 3. ログ解析による状態推定
echo -e "${BLUE}📋 ログ解析による状態推定${NC}"

# 最新ログを取得（過去30分）
CURRENT_TIME=$(date +%s)
LOGS=$(gcloud run services logs read $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --limit=20 \
  --format="csv[no-heading](timestamp,textPayload)" 2>/dev/null || echo "")

if [ -z "$LOGS" ]; then
  echo "  ログが取得できませんでした"
  exit 1
fi

# 最新のログエントリのタイムスタンプ
LATEST_LOG=$(echo "$LOGS" | head -n 1)
LATEST_TIMESTAMP=$(echo "$LATEST_LOG" | cut -d',' -f1)
LATEST_MESSAGE=$(echo "$LATEST_LOG" | cut -d',' -f2-)

echo "  最新ログ: $LATEST_TIMESTAMP"
echo "  内容: $LATEST_MESSAGE"

# タイムスタンプを秒に変換（簡易版）
LATEST_TIME=$(date -j -f "%Y-%m-%d %H:%M:%S" "$(echo $LATEST_TIMESTAMP | cut -d'T' -f1,2 | tr 'T' ' ' | cut -d'.' -f1)" +%s 2>/dev/null || echo "$CURRENT_TIME")
TIME_DIFF=$((CURRENT_TIME - LATEST_TIME))

echo "  最終活動: ${TIME_DIFF}秒前"
echo ""

# 4. アクティビティパターン解析
echo -e "${BLUE}📊 アクティビティパターン解析${NC}"

# 起動ログの検出
STARTUP_LOGS=$(echo "$LOGS" | grep -c "Webhook server listening" || echo "0")
REQUEST_LOGS=$(echo "$LOGS" | grep -c "GET\|POST" || echo "0")
PROCESSING_LOGS=$(echo "$LOGS" | grep -c "新しいストーリー\|処理が完了\|OpenAI" || echo "0")

echo "  起動ログ: $STARTUP_LOGS 件"
echo "  リクエストログ: $REQUEST_LOGS 件"
echo "  処理ログ: $PROCESSING_LOGS 件"

# 最新の起動時刻を検出
if [ "$STARTUP_LOGS" -gt 0 ]; then
  LATEST_STARTUP=$(echo "$LOGS" | grep "Webhook server listening" | head -n 1 | cut -d',' -f1)
  STARTUP_TIME=$(date -j -f "%Y-%m-%d %H:%M:%S" "$(echo $LATEST_STARTUP | cut -d'T' -f1,2 | tr 'T' ' ' | cut -d'.' -f1)" +%s 2>/dev/null || echo "$CURRENT_TIME")
  STARTUP_AGE=$((CURRENT_TIME - STARTUP_TIME))
  echo "  最新起動: ${STARTUP_AGE}秒前 ($LATEST_STARTUP)"
else
  echo "  起動ログなし（古いインスタンス or スケールゼロ）"
  STARTUP_AGE=9999
fi

echo ""

# 5. 状態判定（非侵襲的）
echo -e "${BLUE}🎯 状態判定${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 判定ロジック
if [ "$TIME_DIFF" -gt 1800 ]; then
  # 30分以上活動なし
  echo -e "${GREEN}😴 スケールゼロ状態（推定）${NC}"
  echo "   状態: 完全停止状態"
  echo "   課金: $0"
  echo "   根拠: 30分以上ログ活動なし"
  ESTIMATED_STATE="scale-zero"
elif [ "$TIME_DIFF" -gt 900 ]; then
  # 15分以上活動なし
  echo -e "${YELLOW}🌙 スケールゼロ移行中（推定）${NC}"
  echo "   状態: アイドル → スケールゼロ移行中"
  echo "   課金: 減少中 → $0"
  echo "   根拠: 15分以上ログ活動なし"
  ESTIMATED_STATE="scaling-down"
elif [ "$PROCESSING_LOGS" -gt 0 ] && [ "$TIME_DIFF" -lt 300 ]; then
  # 5分以内に処理ログあり
  echo -e "${RED}🏃 処理中またはアクティブ${NC}"
  echo "   状態: 動画生成処理実行中"
  echo "   課金: フル課金中"
  echo "   根拠: 最近の処理ログあり"
  ESTIMATED_STATE="active"
elif [ "$REQUEST_LOGS" -gt 0 ] && [ "$TIME_DIFF" -lt 600 ]; then
  # 10分以内にリクエストあり
  echo -e "${YELLOW}💤 アイドル状態${NC}"
  echo "   状態: 1インスタンス待機中"
  echo "   課金: 最小課金中（数セント/時間）"
  echo "   根拠: 最近のリクエストログあり"
  ESTIMATED_STATE="idle"
elif [ "$STARTUP_AGE" -lt 300 ]; then
  # 5分以内に起動
  echo -e "${PURPLE}🔥 最近起動（コールドスタート後）${NC}"
  echo "   状態: 起動完了、アイドル状態"
  echo "   課金: 最小課金中"
  echo "   根拠: 最近の起動ログあり"
  ESTIMATED_STATE="recently-started"
else
  echo -e "${BLUE}❓ 状態不明${NC}"
  echo "   状態: ログから判定できません"
  echo "   課金: 不明"
  echo "   根拠: 活動パターンが不明"
  ESTIMATED_STATE="unknown"
fi

# 6. インスタンス数推定
echo ""
echo -e "${BLUE}📊 推定インスタンス数${NC}"

case $ESTIMATED_STATE in
  "scale-zero")
    echo "  推定インスタンス数: 0"
    ;;
  "scaling-down")
    echo "  推定インスタンス数: 0-1 (減少中)"
    ;;
  "idle"|"recently-started")
    echo "  推定インスタンス数: 1"
    ;;
  "active")
    if [ "$PROCESSING_LOGS" -gt 3 ]; then
      echo "  推定インスタンス数: 2-3 (高負荷)"
    else
      echo "  推定インスタンス数: 1-2"
    fi
    ;;
  *)
    echo "  推定インスタンス数: 不明"
    ;;
esac

# 7. コスト概算
echo ""
echo -e "${BLUE}💰 現在のコスト概算${NC}"

case $ESTIMATED_STATE in
  "scale-zero")
    echo "  時間あたり: $0.00"
    echo "  状態: 課金停止中"
    ;;
  "scaling-down")
    echo "  時間あたり: $0.00-0.05 (減少中)"
    echo "  状態: 課金停止間近"
    ;;
  "idle"|"recently-started")
    echo "  時間あたり: ~$0.05"
    echo "  状態: 最小課金中"
    ;;
  "active")
    echo "  時間あたり: ~$0.15-0.30"
    echo "  状態: アクティブ課金中"
    ;;
  *)
    echo "  時間あたり: 不明"
    ;;
esac

# 8. 推奨アクション
echo ""
echo -e "${BLUE}💡 推奨アクション${NC}"

case $ESTIMATED_STATE in
  "scale-zero")
    echo "  ✅ 理想的な状態です（課金なし）"
    echo "  📝 新しいストーリー投稿時に自動起動します"
    ;;
  "scaling-down")
    echo "  ⏳ しばらく待てばスケールゼロになります"
    echo "  ⚠️  リクエストを送らないようにしてください"
    ;;
  "idle")
    echo "  💡 15分後にスケールゼロになる予定です"
    echo "  ⚠️  不要なヘルスチェックは避けてください"
    ;;
  "active")
    echo "  🔄 処理が完了するまで待機してください"
    echo "  📊 ログで処理進捗を確認できます"
    ;;
  *)
    echo "  🧪 侵襲的テスト（./check-cloudrun-status.sh）で詳細確認可能"
    echo "  ⚠️  ただし、コンテナを起動させる可能性があります"
    ;;
esac

echo ""
echo -e "${GREEN}✅ 非侵襲チェック完了${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${PURPLE}💡 このチェックはリクエストを送信しないため、コンテナを起動させません${NC}"