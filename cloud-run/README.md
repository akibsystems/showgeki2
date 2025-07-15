# Cloud Run Webhook Handler

This directory contains the Cloud Run service for processing Showgeki2 webhooks and generating videos.

## Structure

```
cloud-run/
├── webhook-handler.js    # Main webhook processing logic
├── package.json         # Dependencies for Cloud Run service
├── Dockerfile          # Container configuration
├── deploy.sh           # Production deployment script
├── deploy-debug.sh     # Debug deployment script
└── README.md          # This file
```

## Deployment

### Prerequisites

1. Install gcloud CLI
2. Install Docker
3. Configure Google Cloud credentials
4. Update secrets in Google Secret Manager

### Deploy to Production

```bash
cd cloud-run
./deploy.sh
```

### Deploy Debug Version

```bash
cd cloud-run
./deploy-debug.sh
```

## Local Development

1. Copy `.env.local` from the parent directory:
   ```bash
   cp ../.env.local .
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run locally:
   ```bash
   npm start
   ```

## Architecture

This service is intentionally separated from the main Next.js application to:
- Maintain clear boundaries between web app and background processing
- Allow independent scaling and deployment
- Use CommonJS modules without affecting the main app's ES modules configuration
- Simplify dependency management for Cloud Run specific requirements