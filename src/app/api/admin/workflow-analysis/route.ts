import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase';
import fs from 'fs/promises';
import path from 'path';

// ================================================================
// Types
// ================================================================

interface StepPrompt {
  file: string;
  step: string;
  description: string;
  systemPrompts: string[];
  directorPrompts: string[];
}

interface WorkflowData {
  steps: StepPrompt[];
  flowDiagram: {
    nodes: Array<{
      id: string;
      label: string;
      type: 'input' | 'process' | 'output';
    }>;
    edges: Array<{
      from: string;
      to: string;
      label?: string;
    }>;
  };
}

// ================================================================
// Helper Functions
// ================================================================

async function checkAdminAuth(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized' };
  }
  
  const adminSupabase = createAdminClient();
  const { data: admin, error: adminError } = await adminSupabase
    .from('admins')
    .select('id, is_active')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();
  
  if (adminError || !admin) {
    return { authorized: false, error: 'Admin access required' };
  }
  
  return { authorized: true };
}

function extractPrompts(content: string, fileName: string): StepPrompt {
  const step = fileName.match(/step(\d+)/)?.[1] || 'unknown';
  const prompts: StepPrompt = {
    file: fileName,
    step: step,
    description: getStepDescription(step),
    systemPrompts: [],
    directorPrompts: []
  };
  
  // システムプロンプトを抽出（messages配列のrole: 'system'）
  const systemPromptVarMatches = content.matchAll(/role:\s*['"]system['"]\s*,\s*content:\s*(\w+)/g);
  for (const match of systemPromptVarMatches) {
    const varName = match[1];
    const varDefRegex = new RegExp(`const\\s+${varName}\\s*=\\s*\\\`([^\\\`]+)\\\``, 's');
    const varDefMatch = content.match(varDefRegex);
    if (varDefMatch) {
      prompts.systemPrompts.push(varDefMatch[1].trim());
    }
  }
  
  // ユーザープロンプトを抽出（role: 'user'）
  const userPromptVarMatches = content.matchAll(/role:\s*['"]user['"]\s*,\s*content:\s*(\w+)/g);
  for (const match of userPromptVarMatches) {
    const varName = match[1];
    const varDefRegex = new RegExp(`const\\s+${varName}\\s*=\\s*\\\`([^\\\`]+)\\\``, 's');
    const varDefMatch = content.match(varDefRegex);
    if (varDefMatch) {
      prompts.directorPrompts.push(varDefMatch[1].trim());
    }
  }
  
  // create*Prompt関数の戻り値を抽出
  const promptFunctions = content.matchAll(/function\s+(create\w*Prompt)\s*\([^)]*\)\s*:\s*string\s*\{/g);
  
  for (const funcMatch of promptFunctions) {
    const functionName = funcMatch[1];
    const startPos = funcMatch.index! + funcMatch[0].length;
    
    // 関数の終了位置を探す（ブレースのネストを考慮）
    let braceCount = 1;
    let endPos = startPos;
    
    while (braceCount > 0 && endPos < content.length) {
      if (content[endPos] === '{') braceCount++;
      else if (content[endPos] === '}') braceCount--;
      endPos++;
    }
    
    const functionBody = content.substring(startPos, endPos - 1);
    
    // return文を探す（テンプレートリテラルに対応）
    const templateLiteralRegex = /return\s*`([\s\S]*?)`\s*;/;
    const returnMatch = functionBody.match(templateLiteralRegex);
    
    if (returnMatch) {
      let promptContent = returnMatch[1];
      promptContent = promptContent.replace(/^\n/, '').replace(/\n$/, '');
      
      if (functionName.toLowerCase().includes('system')) {
        prompts.systemPrompts.push(promptContent);
      } else if (functionName.toLowerCase().includes('user') || functionName.toLowerCase().includes('director')) {
        prompts.directorPrompts.push(promptContent);
      }
    }
  }
  
  // directorPrompt変数パターン
  const directorPromptMatches = content.matchAll(/const\s+(?:director|user)Prompt\s*=\s*\`([^\`]+)\`/gs);
  for (const match of directorPromptMatches) {
    prompts.directorPrompts.push(match[1].trim());
  }
  
  // 重複を削除
  prompts.systemPrompts = [...new Set(prompts.systemPrompts)];
  prompts.directorPrompts = [...new Set(prompts.directorPrompts)];
  
  return prompts;
}

function createFlowDiagram() {
  return {
    nodes: [
      { id: 'input', label: 'ユーザー入力', type: 'input' as const },
      { id: 'step1', label: 'Step 1: 文脈分析', type: 'process' as const },
      { id: 'step2', label: 'Step 2: キャラクター設定', type: 'process' as const },
      { id: 'step3', label: 'Step 3: ストーリー構造', type: 'process' as const },
      { id: 'step4', label: 'Step 4: ビート生成', type: 'process' as const },
      { id: 'step5', label: 'Step 5: セリフ生成', type: 'process' as const },
      { id: 'step6', label: 'Step 6: 画像プロンプト', type: 'process' as const },
      { id: 'step7', label: 'Step 7: MulmoScript生成', type: 'process' as const },
      { id: 'output', label: '動画生成', type: 'output' as const }
    ],
    edges: [
      { from: 'input', to: 'step1', label: '原文' },
      { from: 'step1', to: 'step2', label: '文脈情報' },
      { from: 'step2', to: 'step3', label: 'キャラクター' },
      { from: 'step3', to: 'step4', label: '構造' },
      { from: 'step4', to: 'step5', label: 'ビート' },
      { from: 'step5', to: 'step6', label: 'セリフ' },
      { from: 'step6', to: 'step7', label: '画像' },
      { from: 'step7', to: 'output', label: 'MulmoScript' }
    ]
  };
}

function getStepDescription(step: string): string {
  const descriptions: Record<string, string> = {
    '1': 'ユーザーの入力テキストを分析し、感情、テーマ、文脈を抽出します。',
    '2': '物語に登場するキャラクターを定義し、性格や関係性を設定します。',
    '3': 'シェイクスピア風の5幕構成にストーリーを組み立てます。',
    '4': '各シーンの詳細な内容（ビート）を生成します。',
    '5': '各キャラクターのセリフを生成し、物語を進行させます。',
    '6': '各シーンの視覚的な描写を画像生成AI用のプロンプトに変換します。',
    '7': '全ての要素を統合してMulmoScript形式の最終的な動画スクリプトを生成します。'
  };
  return descriptions[step] || '';
}

// ================================================================
// API Route Handler
// ================================================================

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await checkAdminAuth(request);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    
    // step-processorsディレクトリのパス
    const processorsDir = path.join(process.cwd(), 'src', 'lib', 'workflow', 'step-processors');
    
    // step1-7のファイルを読み込む
    const steps: StepPrompt[] = [];
    
    for (let i = 1; i <= 7; i++) {
      const filePath = path.join(processorsDir, `step${i}-processor.ts`);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const fileName = path.basename(filePath);
        const prompts = extractPrompts(content, fileName);
        steps.push(prompts);
      } catch (error) {
        console.error(`Failed to read ${filePath}:`, error);
      }
    }
    
    // Create response data
    const workflowData: WorkflowData = {
      steps,
      flowDiagram: createFlowDiagram()
    };
    
    return NextResponse.json(workflowData);
    
  } catch (error) {
    console.error('[workflow-analysis] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}