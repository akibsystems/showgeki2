#!/bin/bash

# Cloud Run Webhook 単発テスト用 cURL コマンド集

set -e

# 設定
CLOUD_RUN_URL="https://showgeki2-auto-process-mqku5oexhq-an.a.run.app"
WEBHOOK_ENDPOINT="/webhook"
HEALTH_ENDPOINT="/health"

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# UUID生成関数（macOS/Linux対応）
generate_uuid() {
  if command -v uuidgen &> /dev/null; then
    echo $(uuidgen | tr '[:upper:]' '[:lower:]')
  else
    echo $(cat /proc/sys/kernel/random/uuid 2>/dev/null || python3 -c 'import uuid; print(uuid.uuid4())')
  fi
}

echo -e "${GREEN}🚀 Cloud Run Webhook テストツール${NC}"
echo -e "${BLUE}📍 Target URL: ${CLOUD_RUN_URL}${NC}"
echo ""

# ヘルスチェック
echo -e "${YELLOW}1. ヘルスチェック${NC}"
echo "curl ${CLOUD_RUN_URL}${HEALTH_ENDPOINT}"
echo ""
curl -v "${CLOUD_RUN_URL}${HEALTH_ENDPOINT}"
echo ""
echo ""

# UUIDを生成
VIDEO_ID=$(generate_uuid)
STORY_ID=$(generate_uuid)
USER_ID=$(generate_uuid)

echo -e "${YELLOW}2. テスト用動画生成リクエスト${NC}"
echo -e "${BLUE}📹 Video ID: ${VIDEO_ID}${NC}"
echo -e "${BLUE}📝 Story ID: ${STORY_ID}${NC}"
echo -e "${BLUE}👤 User ID: ${USER_ID}${NC}"
echo ""

# JSONペイロード作成
PAYLOAD=$(cat <<EOF
{
  "type": "video_generation",
  "payload": {
    "video_id": "${VIDEO_ID}",
    "story_id": "${STORY_ID}",
    "uid": "${USER_ID}",
    "title": "油ハムの奇跡の旅",
    "text_raw": "これはcURLを使った手動テスト用の動画です。",
    "script_json": {
      "lang": "ja",
      "beats": [
        {
          "text": "かつて、アブラハムの影から生まれた息子、油ハム。その名が運命を呼ぶ夜、風はささやき、世界は静かに息を潜めた。",
          "speaker": "Character",
          "imagePrompt": "薄曇りの夜明け、古代の荒野に立つ若き油ハム。光と影が交錯し、静けさの中に冒険の予感が漂う。"
        },
        {
          "text": "俺は油ハム。親父は偉大だったけど、俺は俺の道を探したいんだ。誰に何を言われても、自分で奇跡を見つけてやるよ。",
          "speaker": "Character",
          "imagePrompt": "自信に満ちた青年油ハムが、手に小さなランプを持ち、荒野の中で一歩踏み出す瞬間。希望に満ちた表情が印象的。"
        },
        {
          "text": "運命の旅路で、油ハムは迷い、涙し、ときに立ち止まった。しかし、彼の心に灯る炎は決して絶えることなく、進み続けた。",
          "speaker": "Narrator",
          "imagePrompt": "嵐の中、油ハムが雨に打たれながらも前を見据えて歩む。空には稲妻が走り、彼の足元には光と影が交錯している。"
        },
        {
          "text": "迷うことを恐れるな。迷いの中でこそ、真実の自分に出会うのだから。油ハム、お前の歩みが未来を照らす灯火となるだろう。",
          "speaker": "WiseCharacter",
          "imagePrompt": "旅の途中で出会った賢者が、油ハムの肩に手を置き、星空の下で静かに語りかける。温かな光が二人を包む。"
        },
        {
          "text": "そして夜明け。油ハムの足跡は黄金色に輝き、彼の心に新たな奇跡が芽生えた。彼の旅は、世界に小さな希望を残したのだった。",
          "speaker": "Narrator",
          "imagePrompt": "朝日が差し込む丘の上で、油ハムが振り返り穏やかに微笑む。背後に伸びる彼の足跡が光り輝く。"
        },
        {
          "text": "あいうえお",
          "speaker": "Character",
          "imagePrompt": "ドラえもんとフリーザが対決する"
        }
      ],
      "title": "油ハムの奇跡の旅",
      "\$mulmocast": { "version": "1.0" },
      "imageParams": {
        "model": "gpt-image-1",
        "style": "リアル写真、高解像度、プロフェッショナル照明",
        "moderation": "low",
        "quality": "low"
      },
      "speechParams": {
        "provider": "openai",
        "speakers": {
          "Narrator": {
            "voiceId": "shimmer",
            "displayName": { "en": "Narrator", "ja": "語り手" }
          },
          "Character": {
            "voiceId": "alloy",
            "displayName": { "en": "Main Character", "ja": "主人公" }
          },
          "WiseCharacter": {
            "voiceId": "echo",
            "displayName": { "en": "Wise Character", "ja": "賢者" }
          }
        }
      }
    }
  }
}
EOF
)

echo "curl コマンド:"
echo "curl -X POST \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '\${PAYLOAD}' \\"
echo "  \"${CLOUD_RUN_URL}${WEBHOOK_ENDPOINT}\""
echo ""

# 実際にリクエスト送信
echo -e "${YELLOW}📤 リクエスト送信中...${NC}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}" \
  "${CLOUD_RUN_URL}${WEBHOOK_ENDPOINT}")

# レスポンスを分析
HTTP_CODE=$(echo "${RESPONSE}" | tail -n1)
RESPONSE_BODY=$(echo "${RESPONSE}" | sed '$d')

echo -e "${BLUE}📬 レスポンス:${NC}"
echo "HTTP Status: ${HTTP_CODE}"
echo "Body: ${RESPONSE_BODY}"
echo ""

if [ "${HTTP_CODE}" = "200" ]; then
    echo -e "${GREEN}✅ リクエスト成功！${NC}"
    echo ""
    echo -e "${YELLOW}📋 Cloud Runログ確認コマンド:${NC}"
    echo "gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=showgeki2-auto-process\" --limit=20 --project=showgeki2 --format=\"table(timestamp,jsonPayload.message)\""
    echo ""
    echo -e "${YELLOW}📊 動画生成状況確認（Supabase）:${NC}"
    echo "video_id: ${VIDEO_ID} の処理状況をSupabaseで確認してください"
else
    echo -e "${RED}❌ リクエスト失敗 (HTTP ${HTTP_CODE})${NC}"
    echo "レスポンス内容を確認してください"
fi

echo ""
echo -e "${YELLOW}🔄 並列テストを実行する場合:${NC}"
echo "node scripts/test-webhook-concurrent.js"

echo ""
echo -e "${GREEN}🎯 テスト完了${NC}"