#!/usr/bin/env node

/**
 * OpenAI Integration Test Script
 * 
 * This script tests the OpenAI integration for script generation
 * without requiring a full application setup.
 */

// Load environment variables manually
const fs = require('fs');
const path = require('path');

// Simple .env.local loader (no external dependencies)
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      console.log('✅ Loaded environment variables from .env.local');
    } else {
      console.log('⚠️  No .env.local file found, using system environment variables');
    }
  } catch (error) {
    console.log('⚠️  Could not load .env.local file:', error.message);
  }
}

loadEnvFile();

async function testOpenAIIntegration() {
  console.log('🚀 Starting OpenAI Integration Test...\n');

  // Check environment variables
  console.log('📋 Checking environment configuration...');
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`   ✅ OpenAI API Key: ${hasOpenAIKey ? 'Configured' : '❌ Missing'}`);
  console.log(`   ✅ Supabase URL: ${hasSupabaseUrl ? 'Configured' : '❌ Missing'}`);
  console.log(`   ✅ Supabase Key: ${hasSupabaseKey ? 'Configured' : '❌ Missing'}`);

  if (!hasOpenAIKey) {
    console.log('\n❌ OpenAI API Key is missing. Please set OPENAI_API_KEY in .env.local');
    console.log('   Get your API key from: https://platform.openai.com/api-keys');
    process.exit(1);
  }

  try {
    // Dynamic import to handle ES modules
    const { testOpenAIConnection, generateMulmoscriptWithOpenAI } = await import('../src/lib/openai-client.ts');

    // Test 1: Basic connection test
    console.log('\n🔍 Test 1: Testing OpenAI API connection...');
    const connectionTest = await testOpenAIConnection();

    if (connectionTest.success) {
      console.log('   ✅ OpenAI API connection successful');
      console.log(`   📊 Model: ${connectionTest.model_info?.model}`);
      console.log(`   📊 Usage: ${JSON.stringify(connectionTest.model_info?.usage)}`);
    } else {
      console.log(`   ❌ OpenAI API connection failed: ${connectionTest.error}`);
      return;
    }

    // Test 2: Script generation test
    console.log('\n🎬 Test 2: Testing script generation...');

    const testStory = {
      id: 'TEST001',
      workspace_id: 'test-workspace',
      uid: 'test-user',
      title: 'A Magical Adventure',
      text_raw: 'Once upon a time, there was a young adventurer who discovered a magical portal in their backyard. Through this portal, they found a world filled with talking animals and mystical creatures. Their journey taught them about courage, friendship, and the power of believing in oneself.',
      script_json: null,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log(`   📖 Test story: "${testStory.title}"`);
    console.log(`   📝 Content length: ${testStory.text_raw.length} characters`);

    const generationResult = await generateMulmoscriptWithOpenAI(testStory, {
      targetDuration: 20,
      stylePreference: 'adventure',
      language: 'en',
      retryCount: 1,
    });

    if (generationResult.success && generationResult.script) {
      console.log('   ✅ Script generation successful');
      console.log(`   🎭 Generated ${generationResult.script.scenes.length} scenes`);
      console.log(`   ⏱️  Total duration: ${generationResult.script.metadata.duration_total} seconds`);
      console.log(`   🤖 Model used: ${generationResult.metadata.model_used}`);
      console.log(`   💰 Input tokens: ${generationResult.metadata.input_tokens}`);
      console.log(`   💰 Output tokens: ${generationResult.metadata.output_tokens}`);
      console.log(`   ⚡ Response time: ${generationResult.metadata.response_time_ms}ms`);

      // Display first scene as example
      if (generationResult.script.scenes.length > 0) {
        const firstScene = generationResult.script.scenes[0];
        console.log('\n   📺 First scene preview:');
        console.log(`      Type: ${firstScene.type}`);
        console.log(`      Content: ${firstScene.content.slice(0, 80)}...`);
        console.log(`      Duration: ${firstScene.duration}s`);
        if (firstScene.voice) {
          console.log(`      Voice: ${firstScene.voice.character} (${firstScene.voice.emotion})`);
        }
      }

    } else {
      console.log(`   ❌ Script generation failed: ${generationResult.error}`);
      console.log(`   🔄 Retry count: ${generationResult.metadata.retry_count}`);
      return;
    }

    // Test 3: Template system test
    console.log('\n📝 Test 3: Testing prompt template system...');

    const { getAllTemplates, getDefaultTemplate, generatePrompt } = await import('../src/lib/prompt-templates.ts');

    const templates = getAllTemplates();
    console.log(`   📚 Available templates: ${templates.length}`);
    templates.forEach(template => {
      console.log(`      - ${template.name} (${template.id})`);
    });

    const defaultTemplate = getDefaultTemplate();
    console.log(`   🎯 Default template: ${defaultTemplate.name}`);

    const promptResult = generatePrompt(testStory, {
      targetDuration: 25,
      stylePreference: 'dramatic',
      language: 'ja',
    });

    console.log(`   ✅ Prompt generation successful`);
    console.log(`   📊 Estimated tokens: ${promptResult.estimated_tokens}`);
    console.log(`   🏷️  Template used: ${promptResult.template_id}`);

    // Test 4: Performance tracking
    console.log('\n📈 Test 4: Testing performance tracking...');

    const { getOverallPerformance } = await import('../src/lib/prompt-templates.ts');

    const performance = getOverallPerformance();
    console.log(`   📊 Total requests: ${performance.total_requests}`);
    console.log(`   ✅ Success rate: ${Math.round(performance.overall_success_rate * 100)}%`);
    console.log(`   🎯 Templates tracked: ${Object.keys(performance.template_performance).length}`);

    // All tests passed
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n💡 Integration Summary:');
    console.log('   ✅ OpenAI API connection working');
    console.log('   ✅ Script generation working');
    console.log('   ✅ Template system working');
    console.log('   ✅ Performance tracking working');
    console.log('\n🚀 Your OpenAI integration is ready for production!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check that all environment variables are set correctly');
    console.error('   2. Verify your OpenAI API key is valid and has sufficient credits');
    console.error('   3. Ensure you have internet connectivity');
    console.error('   4. Check that you are using a supported Node.js version (16+)');
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testOpenAIIntegration().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { testOpenAIIntegration };