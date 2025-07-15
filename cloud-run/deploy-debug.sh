#!/bin/bash

# Cloud Run deployment script for showgeki2-auto-process-debug
# This script deploys a debug version from the cloud-run directory

set -e

# Configuration
PROJECT_ID="showgeki2"
BASE_SERVICE_NAME="showgeki2-auto-process"
DEBUG_SERVICE_NAME="${BASE_SERVICE_NAME}-debug"
REGION="asia-northeast1"
IMAGE_TAG="$(date +%Y%m%d-%H%M%S)"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${BASE_SERVICE_NAME}:${IMAGE_TAG}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Cloud Run deployment for ${DEBUG_SERVICE_NAME}${NC}"

# Check if we're in the cloud-run directory
if [ ! -f "webhook-handler.js" ]; then
    echo -e "${RED}❌ Error: This script must be run from the cloud-run directory${NC}"
    exit 1
fi

# Check dependencies
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    exit 1
fi
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    exit 1
fi

echo -e "${GREEN}📦 Building Docker image...${NC}"
docker build --platform linux/amd64 -t "$IMAGE_NAME" .

echo -e "${GREEN}🔄 Pushing image to Google Container Registry...${NC}"
docker push "$IMAGE_NAME"

echo -e "${GREEN}🔐 Ensuring required secrets exist...${NC}"
gcloud secrets create supabase-url --data-file=<(echo -n "YOUR_SUPABASE_URL") --project="$PROJECT_ID" 2>/dev/null || echo "✔️ Secret supabase-url already exists"
gcloud secrets create supabase-service-key --data-file=<(echo -n "YOUR_SUPABASE_SERVICE_KEY") --project="$PROJECT_ID" 2>/dev/null || echo "✔️ Secret supabase-service-key already exists"
gcloud secrets create openai-api-key --data-file=<(echo -n "YOUR_OPENAI_API_KEY") --project="$PROJECT_ID" 2>/dev/null || echo "✔️ Secret openai-api-key already exists"
gcloud secrets create slack-webhook-url --data-file=<(echo -n "YOUR_SLACK_WEBHOOK_URL") --project="$PROJECT_ID" 2>/dev/null || echo "✔️ Secret slack-webhook-url already exists"

echo -e "${GREEN}☁️  Deploying to Cloud Run (debug)...${NC}"
gcloud run deploy "$DEBUG_SERVICE_NAME" \
  --image="$IMAGE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --platform=managed \
  --execution-environment=gen2 \
  --memory=4Gi \
  --cpu=2 \
  --no-cpu-throttling \
  --timeout=3600 \
  --concurrency=1 \
  --max-instances=100 \
  --min-instances=0 \
  --port=8080 \
  --set-env-vars="NODE_ENV=production,OPENAI_IMAGE_QUALITY_DEFAULT=medium" \
  --update-secrets="SUPABASE_URL=supabase-url:latest,SUPABASE_SERVICE_KEY=supabase-service-key:latest,OPENAI_API_KEY=openai-api-key:latest,SLACK_WEBHOOK_URL=slack-webhook-url:latest" \
  --allow-unauthenticated

echo -e "${GREEN}🎉 Debug deployment completed!${NC}"

SERVICE_URL=$(gcloud run services describe "$DEBUG_SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")
echo -e "${GREEN}🔗 Debug Service URL: ${SERVICE_URL}${NC}"

echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "1. Update the secrets with your actual values"
echo -e "2. Test the webhook endpoint:"
echo -e "   curl ${SERVICE_URL}/health"
echo -e "3. Monitor the logs:"
echo -e "   gcloud logging read \"resource.type=cloud_run_revision\" --limit=20 --project=$PROJECT_ID"