# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Showgeki2 is an AI-powered Japanese web application that transforms user stories into Shakespeare-style 5-act theatrical videos. Users submit stories about their future dreams, receive an 8-digit registration ID, and get AI-generated videos featuring Ghibli-style anime visuals with synthesized voices.

## Core Architecture

The application uses a **Next.js frontend** with **Supabase database/storage** and **Cloud Run serverless backend**. The automated processing pipeline combines **OpenAI APIs** (GPT-4 mini for scripts, DALL-E for images, TTS for voices) with **mulmocast-cli** for video generation.

Key data flow:
1. User submits story → Supabase `stories` table
2. Database webhook triggers Cloud Run `webhook-handler.js`
3. OpenAI generates 5-act Shakespeare script in JSON format
4. mulmocast-cli creates video with AI voices/images
5. Video uploaded to Supabase Storage
6. User accesses via registration ID

## Essential Commands

### Development
```bash
# Setup and start development
npm install
cp .env.local.example .env.local  # Configure environment variables
npm run dev

# Local testing
node scripts/test-local.js                    # Test local webhook server
docker-compose up showgeki2-dev              # Development with mulmocast-cli
docker-compose exec showgeki2-dev node scripts/test-mulmocast.js
```

### Cloud Deployment
```bash
# Production deployment to Google Cloud Run
./deploy.sh

# Alternative manual deployment
docker build --platform linux/amd64 -t gcr.io/showgeki2/showgeki2-auto-process .
docker push gcr.io/showgeki2/showgeki2-auto-process
gcloud run services replace clouddeploy.yaml --region=asia-northeast1 --project=showgeki2
```

### Testing & Monitoring
```bash
# Test production Cloud Run service
node scripts/test-cloud-run.js

# Check service health and status
./scripts/check-cloudrun-status.sh

# Export stories data
node scripts/export-stories-excel.js
```

### Manual Video Upload
```bash
# Upload completed video for a story
node scripts/upload-video.js /path/to/video.mp4 STORY_ID
```

## Key Components

### Database Schema
- **`stories`**: `id` (8-digit), `story_text`, `is_completed`, `video_url`, `created_at`
- **`reviews`**: `story_id`, `review_text`, `rating` (1-5), `created_at`

### Core Scripts
- **`webhook-handler.js`**: Cloud Run webhook receiver for automated processing
- **`auto-process.js`**: Legacy batch processing (replaced by webhook)
- **`upload-video.js`**: Manual video upload utility
- **`export-stories-excel.js`**: Data export to Excel

### Frontend Pages
- **`/`**: Homepage and service introduction
- **`/create`**: Story submission form
- **`/watch`**: Video viewing with registration ID input
- **`/mgmt-x7k9n2p8q5`**: Admin management interface (secure URL)

### Frontend Components

#### ScriptDirector Component
**Location**: `/src/components/editor/script-director/`

A comprehensive, mobile-friendly visual editor for MulmoScript structure that serves as an intuitive alternative to JSON-based script editing. The component provides three main editing areas:

**Core Features**:
- **Title Editor**: Real-time validation with character count
- **Image Settings**: Style preset selection and face reference management
- **Speech Settings**: Speaker management with OpenAI voice selection
- **Beat Editor**: Interactive beat management with speaker assignment

**Architecture**:
- **Main Component**: `index.tsx` - Orchestrates all sub-components and state
- **Hooks**: Custom state management hooks for different aspects
  - `useScriptDirector.ts`: Main state management and tab switching
  - `useSpeakerManager.ts`: Speaker CRUD operations and voice assignment
  - `useBeatsManager.ts`: Beat list management with add/delete/reorder
  - `useImageManager.ts`: Face reference image management
- **Components**: Modular UI components for each editing section
  - `TitleEditor.tsx`: Title input with validation
  - `SpeechSettings.tsx`: Speaker list and management interface
  - `BeatsEditor.tsx`: Beat editing with speaker/image selection
  - `ImageSettings.tsx`: Style and face reference management
- **Modals**: `SpeakerModal.tsx`, `ImageModal.tsx` for detailed editing
- **Styling**: `ScriptDirector.module.css` - Mobile-first responsive design

**Integration**: Replaced the original "Story Content" tab in the story editor page (`/src/app/stories/[id]/page.tsx`), providing seamless script editing within the existing story management workflow.

**Technical Notes**:
- Built with TypeScript for full type safety
- Supports all OpenAI TTS voices (alloy, echo, fable, nova, onyx, shimmer)
- Compatible with MulmoScript schema while extending it for face references
- Responsive design optimized for both mobile and desktop use

## Environment Configuration

### Required Environment Variables
- **`SUPABASE_URL`**: Database connection URL
- **`SUPABASE_SERVICE_KEY`**: Admin database access key
- **`OPENAI_API_KEY`**: OpenAI API access key
- **`NEXT_PUBLIC_SUPABASE_URL`**: Frontend database URL
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Frontend database key

### Optional Environment Variables
- **`OPENAI_IMAGE_QUALITY_DEFAULT`**: OpenAI image quality (`high`/`medium`/`low`)
  - Production: `medium` (balanced quality/cost)
  - Development: `low` (cost optimization)

### Cloud Run Secrets
Environment variables are stored in Google Cloud Secret Manager:
- `supabase-url`, `supabase-service-key`, `openai-api-key`

## Database Management

### Schema Migrations
Database schema changes are managed through SQL migration files in the `migrations/` directory:

```bash
migrations/
├── README.md                         # Migration management guide
├── 000_initial_schema_recreation.sql # Complete database recreation (with beats)
├── 001_add_beats_column.sql         # Incremental beats column addition
└── 999_template.sql                  # Template for new migrations
```

### Running Migrations
Execute migrations through Supabase Dashboard:
1. Open [Supabase Dashboard](https://app.supabase.com) → SQL Editor
2. Copy migration file content and execute
3. Verify using the built-in verification queries

### Database Schema
- **`stories`**: `id` (UUID), `workspace_id`, `uid`, `title`, `text_raw`, `script_json`, `status`, `beats` (1-20), `created_at`, `updated_at`
- **`workspaces`**: `id` (UUID), `uid`, `name`, `created_at`
- **`videos`**: `id` (UUID), `story_id`, `uid`, `status`, `video_url`, `created_at`, `updated_at`
- **`reviews`**: `story_id`, `review_text`, `rating` (1-5), `created_at`

### Key Database Features
- **UUID Primary Keys**: All tables use UUID for better distribution
- **Row Level Security**: Enabled with uid-based access control
- **Constraints**: beats field constrained to 1-20 range
- **Indexes**: Optimized for uid-based queries and status filtering

## mulmocast-cli Integration

The video generation uses mulmocast-cli with quality parameters. A patch is applied during Docker build to add image quality control:

```typescript
// Applied to mulmocast-cli during build
type OpenAIImageQuality = "high" | "medium" | "low";
imageParams: {
  quality: process.env.OPENAI_IMAGE_QUALITY_DEFAULT || "low"
}
```

### Quality Settings by Environment
- **Production (Vercel/Cloud Run)**: `OPENAI_IMAGE_QUALITY_DEFAULT=medium`
- **Development**: `OPENAI_IMAGE_QUALITY_DEFAULT=low` (cost optimization)

### Development Environment
Use `docker-compose.yml` for local development with actual mulmocast-cli:
- Includes canvas build dependencies (cairo, pango, etc.)
- FFmpeg and ImageMagick for media processing
- Full mulmocast-cli installation with quality patch

## AI Processing Details

### Script Generation
- **Model**: GPT-4 mini (o4-mini) for cost efficiency
- **Format**: JSON with 5 beats (acts), characters, dialogue, image prompts
- **Style**: Shakespeare-style Japanese dialogue with Ghibli anime visuals
- **Voices**: Automatic assignment from OpenAI TTS voices (alloy, echo, fable, onyx, nova, shimmer)

### Video Output
- **Duration**: Typically 30-60 seconds
- **Style**: Ghibli anime with soft pastel colors
- **Resolution**: Optimized for mobile viewing
- **Processing time**: 2-5 minutes per video

## Deployment Architecture

### Cloud Run Configuration
- **Scaling**: 0-10 instances (cost-optimized)
- **Resources**: 1 vCPU, 2GB RAM
- **Timeout**: 3600 seconds (for long video processing)
- **Platform**: linux/amd64 (required for mulmocast-cli)

### Cost Optimization
- Serverless scaling with zero minimum instances
- Webhook-driven processing (only when needed)
- Medium quality images (vs high) to reduce OpenAI costs
- Efficient resource allocation for video generation

## Development Notes

### Local Development Setup
1. Copy `.env.local.example` to `.env.local` and configure
2. Run `./dev-setup.sh` for complete Docker development environment
3. Use `docker-compose up showgeki2-dev` for mulmocast-cli testing

### Testing Strategy
- `test-local.js`: Local webhook testing
- `test-cloud-run.js`: End-to-end production testing with real story creation
- `test-mulmocast.js`: Video generation verification

### Admin Interface
- Access via `/mgmt-x7k9n2p8q5` (secure URL pattern)
- Filter stories by completion status
- Copy functionality for IDs and content
- Review management for completed videos

## File Structure Notes

- **`scripts/`**: All utility and processing scripts
- **`docs/`**: Deployment and API documentation
- **`src/app/`**: Next.js App Router pages and API routes
- **`src/components/`**: Reusable React components
- **Docker files**: `Dockerfile` (production), `Dockerfile.dev` (development)
- **`clouddeploy.yaml`**: Cloud Run service configuration