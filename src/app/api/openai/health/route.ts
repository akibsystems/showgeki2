import { NextRequest, NextResponse } from 'next/server';
import { testOpenAIConnection, getOpenAIUsage } from '@/lib/openai-client';
import { getOverallPerformance } from '@/lib/prompt-templates';
import { ErrorType } from '@/types';

// ================================================================
// GET /api/openai/health
// OpenAI API接続状態とパフォーマンス情報を取得
// ================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[OpenAI Health] Checking API connection and performance...');
    
    // Test OpenAI connection
    const connectionTest = await testOpenAIConnection();
    
    // Get performance statistics
    const performance = getOverallPerformance();
    
    // Get usage statistics (placeholder for now)
    const usage = await getOpenAIUsage();
    
    // Check environment configuration
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    const apiKeyStatus = hasApiKey 
      ? `Configured (${process.env.OPENAI_API_KEY?.slice(0, 8)}...)`
      : 'Not configured';
    
    const healthData = {
      connection: {
        status: connectionTest.success ? 'healthy' : 'unhealthy',
        last_tested: new Date().toISOString(),
        error: connectionTest.error,
        model_info: connectionTest.model_info,
      },
      configuration: {
        api_key_status: apiKeyStatus,
        has_api_key: hasApiKey,
      },
      performance: {
        total_requests: performance.total_requests,
        overall_success_rate: Math.round(performance.overall_success_rate * 100) / 100,
        template_count: Object.keys(performance.template_performance).length,
        template_stats: performance.template_performance,
      },
      usage: {
        total_requests: usage.total_requests,
        total_input_tokens: usage.total_input_tokens,
        total_output_tokens: usage.total_output_tokens,
        estimated_cost_usd: usage.estimated_cost_usd,
      },
    };
    
    const responseStatus = connectionTest.success ? 200 : 503;
    
    console.log(`[OpenAI Health] Health check completed`, {
      connection_status: connectionTest.success ? 'healthy' : 'unhealthy',
      has_api_key: hasApiKey,
      total_requests: performance.total_requests,
    });
    
    return NextResponse.json({
      success: connectionTest.success,
      data: healthData,
      message: connectionTest.success 
        ? 'OpenAI API is healthy and functioning' 
        : 'OpenAI API connection failed',
      timestamp: new Date().toISOString(),
    }, { status: responseStatus });
    
  } catch (error) {
    console.error('[OpenAI Health] Health check failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during health check';
    
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      type: ErrorType.INTERNAL,
      details: errorMessage,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// ================================================================
// POST /api/openai/health
// OpenAI接続の強制テスト（管理者用）
// ================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const forceTest = body.force_test === true;
    
    if (!forceTest) {
      return NextResponse.json({
        error: 'Force test flag required',
        type: ErrorType.VALIDATION,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    console.log('[OpenAI Health] Running forced connection test...');
    
    // Run connection test
    const connectionTest = await testOpenAIConnection();
    
    return NextResponse.json({
      success: connectionTest.success,
      data: {
        test_result: connectionTest,
        tested_at: new Date().toISOString(),
      },
      message: connectionTest.success 
        ? 'Forced connection test passed' 
        : 'Forced connection test failed',
      timestamp: new Date().toISOString(),
    }, { status: connectionTest.success ? 200 : 503 });
    
  } catch (error) {
    console.error('[OpenAI Health] Forced test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Forced test failed',
      type: ErrorType.INTERNAL,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}