import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { withAdminAuth, AdminContext } from '@/lib/admin-auth';
import { geminiClient, ConsistencyCheckResult, CONSISTENCY_CHECK_PROMPT } from '@/lib/gemini-client';
import { ErrorType } from '@/types';
import { z } from 'zod';

// ================================================================
// Configuration
// ================================================================

// Gemini model selection - can be overridden by GEMINI_MODEL env var
// Available models:
// - 'gemini-2.5-pro': Higher quality, slower, more expensive
// - 'gemini-2.5-flash': Faster, cheaper, good for quick checks (default)
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

// Max output tokens - can be overridden by GEMINI_MAX_TOKENS env var
// Default: 8192 (sufficient for most videos)
// Increase for very long videos with many scenes
const MAX_OUTPUT_TOKENS = parseInt(process.env.GEMINI_MAX_TOKENS || '8192');

// ================================================================
// Schemas
// ================================================================

const ConsistencyCheckRequestSchema = z.object({
  videoId: z.string().uuid(),
  forceRecheck: z.boolean().default(false),
});

// ================================================================
// POST /api/admin/videos/consistency-check
// Run consistency check on a video
// ================================================================

async function checkVideoConsistency(
  request: NextRequest,
  context: AdminContext
): Promise<NextResponse> {
  try {
    // Check if Gemini API is configured
    if (!geminiClient) {
      return NextResponse.json(
        {
          error: 'Gemini API is not configured',
          type: ErrorType.INTERNAL,
          details: 'GEMINI_API_KEY environment variable is not set',
        },
        { status: 501 }
      );
    }

    const body = await request.json();

    // Validate request
    const parseResult = ConsistencyCheckRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          type: ErrorType.VALIDATION,
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { videoId, forceRecheck } = parseResult.data;
    const supabase = createAdminClient();

    // Check if we have cached results
    if (!forceRecheck) {
      const { data: existingCheck } = await supabase
        .from('video_consistency_checks')
        .select('*')
        .eq('video_id', videoId)
        .eq('check_type', 'gemini')
        .single();

      if (existingCheck) {
        console.log(`[ConsistencyCheck] Using cached result for video ${videoId}`);
        return NextResponse.json({
          success: true,
          data: {
            result: existingCheck.result,
            metadata: existingCheck.metadata,
            cached: true,
            checkedAt: existingCheck.created_at,
          },
        });
      }
    }

    // Get video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, url, title, duration_sec')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        {
          error: 'Video not found',
          type: ErrorType.NOT_FOUND,
        },
        { status: 404 }
      );
    }

    if (!video.url) {
      return NextResponse.json(
        {
          error: 'Video has no URL',
          type: ErrorType.VALIDATION,
        },
        { status: 400 }
      );
    }

    // Download video from Supabase storage to buffer
    console.log(`[ConsistencyCheck] Downloading video ${videoId} for analysis...`);

    const videoResponse = await fetch(video.url);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBuffer = await videoResponse.arrayBuffer();

    // Upload to Gemini
    console.log(`[ConsistencyCheck] Uploading video to Gemini...`);

    const model = geminiClient.getGenerativeModel({ model: GEMINI_MODEL });

    // Note: The actual file upload API might differ based on the SDK version
    // This is a simplified version - you may need to adjust based on the actual Gemini SDK
    console.log(`[ConsistencyCheck] Analyzing video with Gemini (${GEMINI_MODEL})...`);
    console.log(`[ConsistencyCheck] Video buffer size:`, videoBuffer.byteLength, 'bytes');
    console.log(`[ConsistencyCheck] Using prompt length:`, CONSISTENCY_CHECK_PROMPT.length, 'characters');

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

    console.log('[ConsistencyCheck] Raw Gemini response length:', text.length);
    console.log('[ConsistencyCheck] Response preview:', text.substring(0, 500));

    // Parse the JSON response
    let checkResult: ConsistencyCheckResult;
    try {
      // Check if response is empty
      if (!text || text.trim() === '') {
        console.error('[ConsistencyCheck] Empty response from Gemini');
        throw new Error('Empty response from Gemini');
      }

      // Try to extract JSON from the response (sometimes Gemini adds extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('[ConsistencyCheck] Found JSON in response, attempting to parse...');
        checkResult = JSON.parse(jsonMatch[0]);
      } else {
        console.log('[ConsistencyCheck] No JSON found in response, trying direct parse...');
        checkResult = JSON.parse(text);
      }

      // Validate the structure
      if (!checkResult.scenes || !checkResult.summary) {
        console.error('[ConsistencyCheck] Invalid response structure:', JSON.stringify(checkResult).substring(0, 200));
        throw new Error('Invalid response structure from Gemini');
      }

      console.log('[ConsistencyCheck] Successfully parsed response with', checkResult.scenes.length, 'scenes');
    } catch (parseError) {
      console.error('[ConsistencyCheck] Parse error details:', parseError);
      console.error('[ConsistencyCheck] Failed to parse Gemini response. Full text:', text);

      // Check if response was truncated
      if (text.length > 0 && !text.trim().endsWith('}')) {
        console.error('[ConsistencyCheck] Response appears to be truncated. Consider increasing maxOutputTokens.');
        throw new Error('Response was truncated. The video may be too long for current token limits.');
      }

      throw new Error(`Failed to parse consistency check result: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }

    // Store the result in database
    const metadata = {
      videoTitle: video.title,
      videoDuration: video.duration_sec,
      checkedBy: context.adminEmail || context.adminId,
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
        checked_by: context.adminId,
      }, {
        onConflict: 'video_id,check_type',
      });

    if (insertError) {
      console.error('[ConsistencyCheck] Failed to save result:', insertError);
      // Continue even if caching fails
    }

    console.log(`[ConsistencyCheck] Analysis complete for video ${videoId}`);

    return NextResponse.json({
      success: true,
      data: {
        result: checkResult,
        metadata,
        cached: false,
        checkedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[ConsistencyCheck] Unexpected error:', error);

    // Check for rate limit error
    if (error instanceof Error && error.message.includes('429')) {
      const retryMatch = error.message.match(/retryDelay":"(\d+)s"/);
      const retryAfter = retryMatch ? parseInt(retryMatch[1]) : 60;

      return NextResponse.json(
        {
          error: 'Gemini APIのレート制限に達しました',
          type: ErrorType.RATE_LIMIT,
          details: `${retryAfter}秒後に再試行してください。無料プランの制限に達している可能性があります。`,
          retryAfter,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to check video consistency',
        type: ErrorType.INTERNAL,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ================================================================
// GET /api/admin/videos/consistency-check
// Get consistency check history
// ================================================================

async function getConsistencyChecks(
  request: NextRequest,
  _context: AdminContext
): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');

    const supabase = createAdminClient();

    let query = supabase
      .from('video_consistency_checks')
      .select('*')
      .order('created_at', { ascending: false });

    if (videoId) {
      query = query.eq('video_id', videoId);
    }

    const { data: checks, error } = await query;

    if (error) {
      console.error('[getConsistencyChecks] Database error:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch consistency checks',
          type: ErrorType.INTERNAL,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        checks: checks || [],
      },
    });

  } catch (error) {
    console.error('[getConsistencyChecks] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch consistency checks',
        type: ErrorType.INTERNAL,
      },
      { status: 500 }
    );
  }
}

// ================================================================
// Export handlers
// ================================================================

export const POST = withAdminAuth(checkVideoConsistency);
export const GET = withAdminAuth(getConsistencyChecks);