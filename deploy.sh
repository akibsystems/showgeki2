#!/bin/bash

# Cloud Run deployment script for showgeki2-auto-process

set -e

# Configuration
PROJECT_ID="showgeki2"
SERVICE_NAME="showgeki2-auto-process"
REGION="asia-northeast1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Cloud Run deployment for ${SERVICE_NAME}${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    exit 1
fi

# Prompt for project ID if not set
if [ "$PROJECT_ID" = "your-project-id" ]; then
    echo -e "${YELLOW}⚠️  Please update PROJECT_ID in this script before running.${NC}"
    read -p "Enter your Google Cloud Project ID: " PROJECT_ID
    IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
fi

echo -e "${GREEN}📦 Building Docker image...${NC}"
docker build --platform linux/amd64 -t $IMAGE_NAME .

echo -e "${GREEN}🔄 Pushing image to Google Container Registry...${NC}"
docker push $IMAGE_NAME

echo -e "${GREEN}🔐 Creating secrets (if not exist)...${NC}"
# Create secrets for environment variables
gcloud secrets create supabase-config --data-file=<(echo -n "url=YOUR_SUPABASE_URL
service_key=YOUR_SUPABASE_SERVICE_KEY") --project=$PROJECT_ID 2>/dev/null || echo "Secret supabase-config already exists"

gcloud secrets create openai-config --data-file=<(echo -n "api_key=YOUR_OPENAI_API_KEY") --project=$PROJECT_ID 2>/dev/null || echo "Secret openai-config already exists"

echo -e "${GREEN}☁️  Deploying to Cloud Run...${NC}"
# Update the clouddeploy.yaml with the correct PROJECT_ID
sed "s/PROJECT_ID/$PROJECT_ID/g" clouddeploy.yaml > clouddeploy-temp.yaml

# Deploy using gcloud
gcloud run services replace clouddeploy-temp.yaml \
    --region=$REGION \
    --project=$PROJECT_ID

# Clean up temporary file
rm clouddeploy-temp.yaml

echo -e "${GREEN}🎉 Deployment completed!${NC}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format="value(status.url)")
echo -e "${GREEN}🔗 Service URL: ${SERVICE_URL}${NC}"

echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "1. Update the secrets with your actual values:"
echo -e "   gcloud secrets versions add supabase-config --data-file=supabase.env --project=$PROJECT_ID"
echo -e "   gcloud secrets versions add openai-config --data-file=openai.env --project=$PROJECT_ID"
echo -e "2. Grant necessary permissions to the service account"
echo -e "3. Monitor the logs: gcloud logs tail --follow --project=$PROJECT_ID"