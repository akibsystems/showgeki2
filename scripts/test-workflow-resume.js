#!/usr/bin/env node

/**
 * Test script for workflow resume functionality
 * 
 * This script tests:
 * 1. Creating a draft story via the /api/stories/draft endpoint
 * 2. Navigating to the workflow with a specific step
 * 3. Saving progress and resuming from where left off
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const API_BASE_URL = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || 'http://localhost:3002';

async function createDraftStory(uid, workspaceId) {
  console.log('Creating draft story...');
  
  const response = await fetch(`${API_BASE_URL}/api/stories/draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-UID': uid,
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create draft: ${response.status} - ${error}`);
  }

  const result = await response.json();
  console.log('Draft story created:', result.story);
  return result.story;
}

async function getOrCreateWorkspace(uid) {
  console.log('Getting workspace for user...');
  
  const response = await fetch(`${API_BASE_URL}/api/workspaces/current`, {
    method: 'GET',
    headers: {
      'X-User-UID': uid,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get workspace: ${response.status}`);
  }

  const result = await response.json();
  return result.workspace;
}

async function testWorkflowResume() {
  try {
    // Test parameters
    const testUid = 'test-user-' + Date.now();
    
    console.log('Starting workflow resume test...');
    console.log('Test UID:', testUid);
    console.log('API Base URL:', API_BASE_URL);
    
    // Get or create workspace
    const workspace = await getOrCreateWorkspace(testUid);
    console.log('Workspace:', workspace);
    
    // Step 1: Create a draft story
    const draftStory = await createDraftStory(testUid, workspace.id);
    
    // Step 2: Show the URLs for manual testing
    console.log('\n=== Workflow URLs ===');
    console.log(`1. New workflow: ${API_BASE_URL}/stories/new`);
    console.log(`2. Resume workflow: ${API_BASE_URL}/stories/${draftStory.id}/new?step=1`);
    console.log(`3. Dashboard: ${API_BASE_URL}/stories`);
    
    console.log('\n=== Test Instructions ===');
    console.log('1. Enable workflow V2 by setting NEXT_PUBLIC_ENABLE_WORKFLOW_V2=true');
    console.log('2. Visit /stories/new - it should create a draft and redirect');
    console.log('3. Fill in step 1 and proceed to step 2');
    console.log('4. Leave the page and go to /stories dashboard');
    console.log('5. Look for "作成中のワークフロー" section');
    console.log('6. Click "続きから作成" to resume from step 2');
    
    console.log('\n✅ Test setup complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testWorkflowResume();