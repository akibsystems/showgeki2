# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Showgeki2 is an AI-powered Japanese web application that transforms user stories into Shakespeare-style 5-act theatrical videos. Users submit stories about their future dreams, receive an 8-digit registration ID, and get AI-generated videos featuring anime-style visuals with synthesized voices.

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
# Note: clouddeploy.yaml has been removed. Use deploy.sh or gcloud run deploy directly
```

### Testing & Monitoring
```bash
# Unit and integration tests (Vitest)
npm test                                  # Run all tests in watch mode
npm run test:run                          # Run tests once
npm run test:coverage                     # Generate coverage report
npm run test:ui                           # Run tests in browser UI

# Production deployment tests
node scripts/test-cloud-run.js           # Test production Cloud Run service
./scripts/check-cloudrun-status.sh       # Check service health and status

# Development tests
node scripts/test-local.js               # Test local webhook server

# Data export
node scripts/export-stories-excel.js    # Export stories data

# Instant Mode monitoring and analysis
node scripts/monitor-instant-mode.js     # Real-time monitor for active instant mode workflows
node scripts/monitor-instant-mode.js --interval 5  # Update every 5 seconds
node scripts/analyze-instant-times.js    # Analyze execution times for completed workflows
node scripts/analyze-instant-times.js --days 7 --export  # Export 7 days of data to Excel
```

### Manual Video Upload
```bash
# Upload completed video for a story
node scripts/upload-video.js /path/to/video.mp4 STORY_ID
```

### Video Management & Export
```bash
# Default: Export and download videos from past 24 hours to ~/Downloads
node scripts/video-manager.js

# Export only (no download)
node scripts/video-manager.js --export-only

# Download from existing Excel file
node scripts/video-manager.js --download-only --excel-file showgeki2_videos_2025-06-28_18-00-00.xlsx

# Custom date range
node scripts/video-manager.js --from "2025-06-28 09:00" --to "2025-06-28 18:00"

# Export videos with JST timezone support
node scripts/export-videos.js --from "2025-07-01 16:00" --to "2025-07-01 17:00"
```

### Load Testing
```bash
# Run comprehensive load test with 10 concurrent users
node scripts/load-test-concurrent.js

# Check failed videos after load test
node scripts/check-failed-videos.js
```

### Cloud Run Webhook Testing
```bash
# Quick health check
curl https://showgeki2-auto-process-mqku5oexhq-an.a.run.app/health

# Single webhook test with detailed logging
./scripts/test-webhook-curl.sh

# Concurrent webhook test (tests parallel processing issues)
node scripts/test-webhook-concurrent.js
```

## Key Components

### Database Schema
- **`stories`**: `id` (8-digit), `story_text`, `is_completed`, `video_url`, `created_at`
- **`reviews`**: `story_id`, `review_text`, `rating` (1-5), `created_at`

### Core Scripts
- **`webhook-handler.js`**: Cloud Run webhook receiver for automated processing (now extracts real video metadata)
- **`auto-process.js`**: Legacy batch processing (replaced by webhook)
- **`upload-video.js`**: Manual video upload utility
- **`export-stories-excel.js`**: Data export to Excel
- **`video-manager.js`**: Unified video export and download tool (default: past 24 hours to ~/Downloads)
- **`fix-video-metadata.js`**: Fixes duration/resolution for existing videos by downloading and analyzing them
- **`export-videos.js`**: Video export script with JST timezone support for specific time ranges
- **`load-test-concurrent.js`**: Comprehensive load testing script for concurrent user simulation
- **`check-failed-videos.js`**: Monitor and analyze failed video generation attempts
- **`test-webhook-concurrent.js`**: Test webhook endpoint with concurrent requests
- **`test-webhook-curl.sh`**: Simple webhook health check using curl
- **`monitor-instant-mode.js`**: Real-time monitoring of active instant mode workflows
- **`analyze-instant-times.js`**: Analyze execution times for completed instant mode workflows

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
- **`INSTANT_MODE_SCENE_COUNT`**: Number of scenes/images to generate in instant mode (1-20)
  - Default: 5 (medium duration)
  - Overrides duration-based scene count settings
- **`INSTANT_MODE_DIRECT_GENERATION`**: Skip workflow phases 1-6 and generate MulmoScript directly
  - Default: `false` (use normal workflow phases)
  - Set to `true` for faster generation using direct OpenAI API call
  - Direct mode bypasses character analysis, scene structuring etc.
- **`SCRIPT_WRITER_TYPE`**: Choose between Shakespeare-style or general scriptwriter prompts
  - Options: `shakespeare` (default) or `general`
  - `shakespeare`: Uses dramatic, theatrical Shakespeare-inspired prompts
  - `general`: Uses modern, accessible scriptwriting approach
- **`NEXT_PUBLIC_ENABLE_INSTANT_MODE`**: Show/hide instant mode (かんたんモード) in dashboard
  - Default: `true` (shown when not set)
  - Set to `false` to hide instant mode buttons in dashboard
  - Controls visibility in both CreateScriptCard and Quick Access section
  - When not set or set to any value other than `false`, instant mode is shown

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

### Output Reuse Optimization
The webhook handler includes intelligent output reuse for all generation types:
- **Video Generation**: Checks for existing video in storage (`videos/${video_id}.mp4`) and reuses if found
- **Image Preview**: Checks for existing preview output in `videos/${video_id}/preview/output/` and downloads for reuse
- **Audio Preview**: Checks for existing audio output in `videos/${video_id}/audio-preview/output/` and downloads for reuse

This optimization:
- Significantly reduces processing time for regeneration requests
- Saves OpenAI API costs by avoiding redundant generation
- Preserves consistency when retrying failed operations
- Automatically logs when outputs are reused vs newly generated

## AI Processing Details

### Script Generation
- **Model**: GPT-4.1 (最新モデル - gpt-4oより高性能で安価)
  - **重要**: gpt-4oは古いモデルなので使用しないでください
  - gpt-4.1の方が性能が良く、料金も安いです
- **Format**: JSON with dynamic beats (1-20 scenes), characters, dialogue, image prompts
- **Style**: 
  - Shakespeare mode (`SCRIPT_WRITER_TYPE=shakespeare`): Dramatic 5-act structure with theatrical dialogue
  - General mode (`SCRIPT_WRITER_TYPE=general`): Modern storytelling with accessible narrative structure
- **Voices**: Dynamic assignment from OpenAI TTS voices (alloy, echo, fable, nova, onyx, shimmer)
- **Scene Count (Instant Mode)**:
  - Default: 5 scenes (medium duration)
  - Configurable via `INSTANT_MODE_SCENE_COUNT` environment variable (1-20)
  - Examples:
    - `INSTANT_MODE_SCENE_COUNT=3` for quick stories
    - `INSTANT_MODE_SCENE_COUNT=10` for detailed narratives
- **Instant Mode Generation Methods**:
  - **Normal Mode** (`INSTANT_MODE_DIRECT_GENERATION=false`):
    - Uses full workflow phases 1-6
    - Detailed character analysis and scene structuring
    - Higher quality but slower (2-3 minutes)
  - **Direct Mode** (`INSTANT_MODE_DIRECT_GENERATION=true`):
    - Bypasses phases 1-6, generates MulmoScript directly
    - Single OpenAI API call
    - Faster generation (30-60 seconds) but less structured

### Video Output
- **Duration**: Typically 30-60 seconds (automatically detected from video file)
- **Style**: anime with soft pastel colors
- **Resolution**: Optimized for mobile viewing (automatically detected from video file)
- **Processing time**: 2-5 minutes per video
- **Metadata**: Duration and resolution are extracted using ffprobe after generation
  - Duration is stored in seconds (rounded to nearest integer)
  - Resolution is stored as "widthxheight" format (e.g., "1920x1080")

## Deployment Architecture

### Cloud Run Configuration
- **Scaling**: 0-100 instances (increased for higher throughput)
- **Resources**: 4 vCPU, 8GB RAM (gen2 execution environment)
- **Timeout**: 3600 seconds (for long video processing)
- **Platform**: linux/amd64 (required for mulmocast-cli)
- **Concurrency**: 1 request per container (prevents global variable conflicts)
- **Rate Limiting**: Automatic handling of 429 errors with video status update
- **Caption Support**: Automatic detection of caption language (ja/en) for proper video file naming

### Cost Optimization
- Serverless scaling with zero minimum instances
- Webhook-driven processing (only when needed)
- Medium quality images (vs high) to reduce OpenAI costs
- Efficient resource allocation for video generation

### Watch Mode (Local Development)
The system supports two operation modes:
- **Production Mode**: Cloud Run receives webhooks and processes videos
- **Watch Mode**: Local development mode for testing without Cloud Run
  - Set `WATCH_MODE=true` in webhook-handler.js environment
  - Set `DISABLE_WEBHOOK=true` in frontend to disable Cloud Run calls
  - The webhook handler polls the database for queued videos
  - Processes videos locally using the same pipeline
  - Useful for development and testing without deploying to Cloud Run

## Development Notes

### Local Development Setup
1. Copy `.env.local.example` to `.env.local` and configure
2. Run `./dev-setup.sh` for complete Docker development environment
3. Use `docker-compose up showgeki2-dev` for mulmocast-cli testing

### Testing Strategy
- `test-local.js`: Local webhook testing
- `test-cloud-run.js`: End-to-end production testing with real story creation
- `test-mulmocast.js`: Video generation verification
- `test-webhook-concurrent.js`: Concurrent webhook processing test

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

## Video Title Management (2025-01-14)

### Database Changes
- Added `title` and `updated_at` columns to `videos` table
- Migration file: `migrations/002_add_videos_title_updated_at.sql`
- Webhook handler now saves video title during generation
- Video list page uses video.title with fallback to story title

### Backfill Script
**Script**: `scripts/backfill-video-titles.js`  
**Purpose**: Populate title field for existing videos from storyboards  
**Usage**: `node scripts/backfill-video-titles.js`

## Recently Added Scripts (2025-07-02)

### 1. export-videos.js
**Purpose**: Export video data with JST timezone support  
**Features**:
- Accepts time input in JST format (e.g., "2025-07-01 16:00")
- Exports video metadata to Excel with JST timestamps
- Downloads video files to local directory
- Properly handles timezone conversion between JST and UTC

### 2. load-test-concurrent.js
**Purpose**: Comprehensive load testing for the entire story-to-video pipeline  
**Features**:
- Simulates multiple concurrent users (configurable via --users flag, default: 1)
- Tests full workflow: story creation → script generation → video generation
- Automatically sets image quality to "low" for test efficiency
- Optional Excel report generation with --excel flag
- Measures success rate, processing time, and identifies bottlenecks
- Synchronous webhook processing with proper 429 rate limit handling
**Usage**:
```bash
node scripts/load-test-concurrent.js --users 20  # Test with 20 concurrent users
node scripts/load-test-concurrent.js -u 5 --excel  # Test with 5 users and export Excel
```

### 3. check-failed-videos.js
**Purpose**: Monitor and analyze failed video generation attempts  
**Features**:
- Lists recent failed videos with error details
- Identifies load test failures separately
- Shows video ID, story ID, UID, and error messages
- Useful for debugging production issues

### 4. test-webhook-concurrent.js
**Purpose**: Test webhook endpoint under concurrent load  
**Features**:
- Sends multiple concurrent webhook requests
- Measures response times and success rates
- Helps identify scaling issues with Cloud Run service

### 5. test-webhook-curl.sh
**Purpose**: Simple webhook health check  
**Features**:
- Quick curl-based health check for Cloud Run service
- Verifies webhook endpoint is accessible
- Useful for deployment verification

## Docker Container Updates (2025-07-03)

### Node.js Version Upgrade
**Issue**: mulmocast-cli dependency (yargs-parser) requires Node.js v20+  
**Solution**: Upgraded base image from `node:18-alpine` to `node:22-alpine`

### Puppeteer/Chromium Support for Subtitles
**Issue**: mulmocast-cli uses Puppeteer for subtitle rendering, which failed with browser launch errors  
**Solution**: Added Chromium dependencies and configuration:
- **Packages**: `chromium`, `nss`, `freetype`, `freetype-dev`, `harfbuzz`, `ca-certificates`, `ttf-freefont`
- **Japanese fonts**: `font-noto-cjk` for proper subtitle rendering
- **Environment variables**:
  - `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
  - `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`
  - `CI=true` (enables `--no-sandbox` flag for root user execution)

### Subtitle Video File Handling
**Issue**: Videos with subtitles generate files with different naming convention (`script__ja.mp4`, `script__en.mp4`)  
**Solution**: Updated `webhook-handler.js`:
- Modified `generateMovie()` to accept `captionLang` parameter (instead of boolean)
- Dynamically check for `script__${lang}.mp4` based on `captionParams.lang` value
- Supports multiple languages (ja, en, etc.)
- Detect subtitle language via `script_json.captionParams.lang`

### Bug Fixes
- Fixed `movieMetrics is not defined` error by initializing the variable outside try block
- Improved error handling and logging for better debugging

## Troubleshooting

### Common Issues and Solutions

#### 1. Node.js Version Error
**Error**: `yargs parser supports a minimum Node.js version of 20`  
**Solution**: Update Dockerfile to use `node:22-alpine` or later

#### 2. Puppeteer Browser Launch Error
**Error**: `Failed to launch the browser process!`  
**Common causes and solutions**:
- **Running as root**: Set `CI=true` environment variable
- **Missing dependencies**: Install Chromium and related packages
- **Architecture mismatch**: Ensure `--platform linux/amd64` in Docker build

#### 3. Subtitle Video Not Found
**Error**: `動画ファイルが見つかりません` (Video file not found)  
**Cause**: mulmocast-cli outputs different filenames for subtitled videos  
**Solution**: Check for `script__ja.mp4` when `captionParams` exists

#### 4. Japanese Text Rendering Issues
**Error**: Subtitles show boxes or missing characters  
**Solution**: Install Japanese fonts (`font-noto-cjk`) in Docker image

#### 5. Container Rebuild Required
After modifying Dockerfile, always rebuild with no-cache:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

#### 6. Instant Mode Background Processing on Vercel
**Issue**: Instant mode processing stops immediately after API response on Vercel  
**Cause**: Vercel serverless functions terminate after response is sent  
**Solution**: Use `waitUntil` from `@vercel/functions` to extend function lifetime:

```typescript
import { waitUntil } from '@vercel/functions';

// Register background processing with waitUntil
waitUntil(
  processInstantMode({
    workflowId: workflow.id,
    storyboardId: storyboard.id,
    uid,
    input: body
  })
);
```

This ensures the background processing continues even after the response is returned to the client.