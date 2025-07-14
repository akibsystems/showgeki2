#!/usr/bin/env node

/**
 * check-video-consistency.js
 * ローカルで指定した動画の一貫性チェックを実行
 * 
 * Usage:
 *   node scripts/check-video-consistency.js <VIDEO_ID>
 *   node scripts/check-video-consistency.js <VIDEO_ID> --save    # 結果をDBに保存
 *   node scripts/check-video-consistency.js <VIDEO_ID> --json    # JSON形式で出力
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';
import chalk from 'chalk';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Configuration
// Available models:
// - 'gemini-2.5-flash': Faster, cheaper, good for quick checks (default)
// - 'gemini-2.5-pro': Higher quality, slower, more expensive
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

// Max output tokens - can be overridden by GEMINI_MAX_TOKENS env var
// Default: 8192 (sufficient for most videos)
// Increase for very long videos with many scenes
const MAX_OUTPUT_TOKENS = parseInt(process.env.GEMINI_MAX_TOKENS || '8192');

// Check required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'GEMINI_API_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(chalk.red(`Error: ${envVar} is not set in .env.local`));
    process.exit(1);
  }
}

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(chalk.red('Error: Please provide a video ID'));
  console.log('\nUsage:');
  console.log('  node scripts/check-video-consistency.js <VIDEO_ID>');
  console.log('  node scripts/check-video-consistency.js <VIDEO_ID> --save');
  console.log('  node scripts/check-video-consistency.js <VIDEO_ID> --json');
  process.exit(1);
}

const videoId = args[0];
const shouldSave = args.includes('--save');
const jsonOutput = args.includes('--json');

// Consistency check prompt (same as in the API)
const CONSISTENCY_CHECK_PROMPT = `
動画を分析し、登場人物の視覚的・音声的一貫性を評価してください。
人物名とnotesは日本語で回答してください。
応答は純粋なJSONのみで、余計な説明文は含めないでください。
以下の正確なJSON形式で応答してください：

{
  "scenes": [
    {
      "index": 1,
      "timeRange": { "start": 0, "end": 5.2 },
      "characters": ["Character A", "Character B"],
      "visualScore": { "Character A": 95, "Character B": 88 },
      "audioScore": { "Character A": 90, "Character B": 93 },
      "notes": "特記事項があれば記載"
    }
  ],
  "summary": {
    "overallVisualScore": 91,
    "overallAudioScore": 92,
    "totalScenes": 5,
    "charactersDetected": ["Character A", "Character B"],
    "issues": ["Character Aの服装がシーン3で変化"]
  }
}

評価基準：
1. 動画をシーン単位に分割し、各シーンの開始・終了時間を記録
2. 各シーンに登場する人物を特定し、名前またはIDで識別
3. visualScore: 同一人物の顔・髪型・服装の一貫性を0-100で評価
4. audioScore: 声の性別適合性・一貫性を0-100で評価
5. 重大な不整合がある場合はissuesに記載

スコアリング基準：
- 90-100: 優秀（一貫性が高い）
- 70-89: 良好（軽微な不整合）
- 50-69: 要改善（明らかな不整合）
- 0-49: 不良（重大な不整合）
`;

// Helper functions
function getScoreColor(score) {
  if (score >= 90) return chalk.green;
  if (score >= 70) return chalk.yellow;
  if (score >= 50) return chalk.hex('#FFA500'); // Orange
  return chalk.red;
}

function getScoreLabel(score) {
  if (score >= 90) return '優秀';
  if (score >= 70) return '良好';
  if (score >= 50) return '要改善';
  return '不良';
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Main function
async function checkVideoConsistency() {
  try {
    // 1. Get video details from database
    console.log(chalk.blue(`\n🔍 Fetching video details for ID: ${videoId}`));

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, url, title, duration_sec, story_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      console.error(chalk.red('Error: Video not found'));
      console.error(videoError);
      process.exit(1);
    }

    if (!video.url) {
      console.error(chalk.red('Error: Video has no URL'));
      process.exit(1);
    }

    // Get story/storyboard title if video has no title
    let videoTitle = video.title;
    if (!videoTitle && video.story_id) {
      const { data: storyboard } = await supabase
        .from('storyboards')
        .select('title')
        .eq('id', video.story_id)
        .single();

      videoTitle = storyboard?.title || `Video ${videoId}`;
    }

    console.log(chalk.green(`✅ Found video: ${videoTitle}`));
    console.log(chalk.gray(`   URL: ${video.url}`));
    console.log(chalk.gray(`   Duration: ${video.duration_sec ? formatDuration(video.duration_sec) : 'Unknown'}`));

    // Check for cached results
    if (!shouldSave) {
      const { data: cachedCheck } = await supabase
        .from('video_consistency_checks')
        .select('*')
        .eq('video_id', videoId)
        .eq('check_type', 'gemini')
        .single();

      if (cachedCheck) {
        console.log(chalk.yellow('\n⚠️  Cached result found. Add --save to force recheck.'));
        console.log(chalk.gray(`   Checked at: ${new Date(cachedCheck.created_at).toLocaleString()}`));
      }
    }

    // 2. Download video
    console.log(chalk.blue('\n📥 Downloading video...'));

    const videoResponse = await fetch(video.url);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    console.log(chalk.green(`✅ Downloaded ${(videoBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`));

    // 3. Analyze with Gemini
    console.log(chalk.blue(`\n🤖 Analyzing with Gemini (${GEMINI_MODEL})...`));

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'video/mp4',
              data: Buffer.from(videoBuffer).toString('base64'),
            },
          },
          { text: CONSISTENCY_CHECK_PROMPT },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.1,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
      },
    });

    const response = result.response;
    const text = response.text();

    // 4. Parse response
    let checkResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        checkResult = JSON.parse(jsonMatch[0]);
      } else {
        checkResult = JSON.parse(text);
      }
    } catch (parseError) {
      console.error(chalk.red('\n❌ Failed to parse Gemini response'));
      console.error(chalk.gray('Raw response:'));
      console.error(text);
      process.exit(1);
    }

    console.log(chalk.green('✅ Analysis complete'));

    // 5. Display results
    if (jsonOutput) {
      console.log(JSON.stringify(checkResult, null, 2));
    } else {
      console.log(chalk.blue(`\n📊 Analysis Results for "${videoTitle}"`));
      console.log(chalk.gray('─'.repeat(60)));

      // Overall scores
      const { summary } = checkResult;
      console.log(chalk.white('\n📈 Overall Scores:'));
      const visualColor = getScoreColor(summary.overallVisualScore);
      const audioColor = getScoreColor(summary.overallAudioScore);

      console.log(`   視覚的一貫性: ${visualColor(`${summary.overallVisualScore}点`)} ${visualColor(`(${getScoreLabel(summary.overallVisualScore)})`)})`);
      if (summary.visualScoreReason) {
        console.log(chalk.gray(`     └ 理由: ${summary.visualScoreReason}`));
      }
      console.log(`   音声一貫性: ${audioColor(`${summary.overallAudioScore}点`)} ${audioColor(`(${getScoreLabel(summary.overallAudioScore)})`)})`);
      if (summary.audioScoreReason) {
        console.log(chalk.gray(`     └ 理由: ${summary.audioScoreReason}`));
      }
      console.log(`   検出キャラクター: ${summary.charactersDetected.join(', ')}`);
      console.log(`   総シーン数: ${summary.totalScenes}`);

      // Scene breakdown
      console.log(chalk.white('\n🎬 Scene Analysis:'));
      checkResult.scenes.forEach((scene) => {
        console.log(chalk.gray(`\n   Scene ${scene.index} (${scene.timeRange.start}s - ${scene.timeRange.end}s):`));
        console.log(`   Characters: ${scene.characters.join(', ')}`);

        // Visual scores
        console.log('   Visual Scores:');
        Object.entries(scene.visualScore).forEach(([char, score]) => {
          const color = getScoreColor(score);
          console.log(`     ${char}: ${color(`${score}`)}`);
        });

        // Audio scores
        console.log('   Audio Scores:');
        Object.entries(scene.audioScore).forEach(([char, score]) => {
          const color = getScoreColor(score);
          console.log(`     ${char}: ${color(`${score}`)}`);
        });

        if (scene.notes) {
          console.log(chalk.gray(`   Notes: ${scene.notes}`));
        }
      });

      // Issues
      if (summary.issues && summary.issues.length > 0) {
        console.log(chalk.red('\n⚠️  Detected Issues:'));
        summary.issues.forEach((issue, i) => {
          if (typeof issue === 'string') {
            console.log(chalk.red(`   ${i + 1}. ${issue}`));
          } else {
            const severityLabels = { high: '重要', medium: '中程度', low: '軽微' };
            const severityColors = { 
              high: chalk.red, 
              medium: chalk.yellow, 
              low: chalk.blue 
            };
            const severityLabel = severityLabels[issue.severity] || '中程度';
            const severityColor = severityColors[issue.severity] || chalk.yellow;
            
            console.log(chalk.red(`   ${i + 1}. `) + severityColor(`[${severityLabel}] `) + chalk.red(issue.description));
            if (issue.reason) {
              console.log(chalk.gray(`       └ 理由: ${issue.reason}`));
            }
          }
        });
      }

      console.log(chalk.gray('\n' + '─'.repeat(60)));
    }

    // 6. Save to database if requested
    if (shouldSave) {
      console.log(chalk.blue('\n💾 Saving results to database...'));

      const metadata = {
        videoTitle,
        videoDuration: video.duration_sec,
        checkedBy: 'local-script',
        checkDate: new Date().toISOString(),
        modelUsed: GEMINI_MODEL,
      };

      const { error: insertError } = await supabase
        .from('video_consistency_checks')
        .upsert({
          video_id: videoId,
          check_type: 'gemini',
          result: checkResult,
          metadata,
          checked_by: null, // No auth user in script
        }, {
          onConflict: 'video_id,check_type',
        });

      if (insertError) {
        console.error(chalk.red('❌ Failed to save results:'));
        console.error(insertError);
      } else {
        console.log(chalk.green('✅ Results saved to database'));
      }
    }

    // Save to file option
    const outputFile = `video-consistency-${videoId}.json`;
    writeFileSync(outputFile, JSON.stringify({
      videoId,
      videoTitle,
      checkedAt: new Date().toISOString(),
      result: checkResult,
    }, null, 2));
    console.log(chalk.gray(`\n📄 Full results saved to: ${outputFile}`));

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);

    // Check for rate limit error
    if (error.message?.includes('429')) {
      console.error(chalk.yellow('\n⚠️  Gemini API rate limit reached. Try again later.'));
    }

    process.exit(1);
  }
}

// Run the script
checkVideoConsistency();