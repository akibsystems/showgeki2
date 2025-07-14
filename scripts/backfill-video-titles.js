#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('  - SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('  - SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

console.log('🔧 Configuration:');
console.log(`  - Supabase URL: ${supabaseUrl}`);
console.log(`  - Service Key: ${supabaseServiceKey ? '✓ (set)' : '✗ (not set)'}`);
console.log('');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfillVideoTitles() {
  console.log('🔄 Starting video title backfill...\n');

  try {
    // 1. Get all videos without titles
    console.log('📊 Fetching videos without titles...');
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, story_id, uid')
      .is('title', null)
      .order('created_at', { ascending: false });

    if (videosError) {
      console.error('❌ Error fetching videos:', videosError);
      return;
    }

    console.log(`📊 Found ${videos.length} videos without titles\n`);

    if (videos.length === 0) {
      console.log('✅ All videos already have titles!');
      return;
    }

    // 2. Get unique story IDs
    const uniqueStoryIds = [...new Set(videos.map(v => v.story_id))];
    console.log(`📚 Fetching titles for ${uniqueStoryIds.length} unique stories...`);

    // 3. Create a map to store titles (storyboards title takes priority over stories title)
    const titleMap = new Map();
    const BATCH_SIZE = 50; // Process 50 story IDs at a time
    
    // 3a. First fetch from stories table
    console.log('\n📖 Fetching titles from stories table...');
    for (let i = 0; i < uniqueStoryIds.length; i += BATCH_SIZE) {
      const batch = uniqueStoryIds.slice(i, i + BATCH_SIZE);
      console.log(`  - Stories batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(uniqueStoryIds.length / BATCH_SIZE)}...`);
      
      const { data: stories, error: storiesError } = await supabase
        .from('stories')
        .select('id, title')
        .in('id', batch);

      if (storiesError) {
        console.error('❌ Error fetching stories batch:', storiesError);
        continue; // Continue with other batches
      }

      // Add to map
      stories.forEach(story => {
        if (story.title) {
          titleMap.set(story.id, story.title);
        }
      });
    }
    
    console.log(`  ✓ Found ${titleMap.size} titles from stories table`);

    // 3b. Then fetch from storyboards table (will override stories titles if exists)
    console.log('\n📋 Fetching titles from storyboards table...');
    for (let i = 0; i < uniqueStoryIds.length; i += BATCH_SIZE) {
      const batch = uniqueStoryIds.slice(i, i + BATCH_SIZE);
      console.log(`  - Storyboards batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(uniqueStoryIds.length / BATCH_SIZE)}...`);
      
      const { data: storyboards, error: storyboardsError } = await supabase
        .from('storyboards')
        .select('id, title')
        .in('id', batch);

      if (storyboardsError) {
        console.error('❌ Error fetching storyboards batch:', storyboardsError);
        continue; // Continue with other batches
      }

      // Add to map (overriding stories titles if exists)
      let overrideCount = 0;
      storyboards.forEach(storyboard => {
        if (storyboard.title) {
          if (titleMap.has(storyboard.id)) {
            overrideCount++;
          }
          titleMap.set(storyboard.id, storyboard.title);
        }
      });
      
      if (overrideCount > 0) {
        console.log(`    → Updated ${overrideCount} titles with storyboard versions`);
      }
    }

    console.log(`\n📚 Total titles found: ${titleMap.size} (from both stories and storyboards)\n`);

    // 4. Update videos with titles
    let successCount = 0;
    let errorCount = 0;

    console.log('🔄 Updating video titles...');
    for (const video of videos) {
      const title = titleMap.get(video.story_id);
      
      if (title) {
        const { error: updateError } = await supabase
          .from('videos')
          .update({ 
            title: title,
            updated_at: new Date().toISOString()
          })
          .eq('id', video.id);

        if (updateError) {
          console.error(`❌ Error updating video ${video.id}:`, updateError);
          errorCount++;
        } else {
          successCount++;
          console.log(`✅ Updated video ${video.id} with title: "${title}"`);
        }
      } else {
        console.warn(`⚠️  No title found in stories or storyboards for video ${video.id} (story_id: ${video.story_id})`);
        errorCount++;
      }
    }

    // 5. Summary
    console.log('\n📊 Backfill Summary:');
    console.log(`✅ Successfully updated: ${successCount} videos`);
    console.log(`❌ Failed/Skipped: ${errorCount} videos`);
    console.log(`📊 Total processed: ${videos.length} videos`);

    // 6. Verify results
    console.log('\n🔍 Verifying results...');
    const { data: remainingVideos, error: remainingError } = await supabase
      .from('videos')
      .select('id')
      .is('title', null);

    if (!remainingError) {
      console.log(`📊 Remaining videos without titles: ${remainingVideos.length}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the backfill
backfillVideoTitles();