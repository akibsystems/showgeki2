#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// step-processorsディレクトリのパス
const processorsDir = path.join(__dirname, '..', 'src', 'lib', 'workflow', 'step-processors');

// 出力ファイルのパス
const outputPath = path.join(__dirname, '..', 'prompts-summary.md');

// プロンプトを抽出する関数
function extractPrompts(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  const prompts = {
    file: fileName,
    step: fileName.match(/step(\d+)/)?.[1] || 'unknown',
    systemPrompts: [],
    directorPrompts: []
  };
  
  // システムプロンプトを抽出（messages配列のrole: 'system'）
  // content: systemPrompt のパターン
  const systemPromptVarMatches = content.matchAll(/role:\s*['"]system['"]\s*,\s*content:\s*(\w+)/g);
  for (const match of systemPromptVarMatches) {
    const varName = match[1];
    // 変数の定義を探す
    const varDefRegex = new RegExp(`const\\s+${varName}\\s*=\\s*\\\`([^\\\`]+)\\\``, 's');
    const varDefMatch = content.match(varDefRegex);
    if (varDefMatch) {
      prompts.systemPrompts.push(varDefMatch[1].trim());
    }
  }
  
  // ユーザープロンプトを抽出（role: 'user'）
  // content: userPrompt のパターン
  const userPromptVarMatches = content.matchAll(/role:\s*['"]user['"]\s*,\s*content:\s*(\w+)/g);
  for (const match of userPromptVarMatches) {
    const varName = match[1];
    // 変数の定義を探す
    const varDefRegex = new RegExp(`const\\s+${varName}\\s*=\\s*\\\`([^\\\`]+)\\\``, 's');
    const varDefMatch = content.match(varDefRegex);
    if (varDefMatch) {
      prompts.directorPrompts.push(varDefMatch[1].trim());
    }
  }
  
  // create*Prompt関数の戻り値を抽出（改善版）
  // より広範なパターンでPrompt関数を検索
  const promptFunctions = content.matchAll(/function\s+(create\w*Prompt)\s*\([^)]*\)\s*:\s*string\s*\{/g);
  
  for (const funcMatch of promptFunctions) {
    const functionName = funcMatch[1];
    const startPos = funcMatch.index + funcMatch[0].length;
    
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
      // 最初と最後の改行を削除
      promptContent = promptContent.replace(/^\n/, '').replace(/\n$/, '');
      
      // SystemPromptかUserPromptかを判定
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

// メイン処理
async function main() {
  console.log('🔍 Step processorsからプロンプトを抽出中...\n');
  
  // step1-7のファイルを読み込む（全てのステップを含む）
  const stepFiles = [];
  for (let i = 1; i <= 7; i++) {
    const filePath = path.join(processorsDir, `step${i}-processor.ts`);
    if (fs.existsSync(filePath)) {
      stepFiles.push(filePath);
    }
  }
  
  if (stepFiles.length === 0) {
    console.error('❌ step-processorファイルが見つかりません');
    process.exit(1);
  }
  
  // 各ファイルからプロンプトを抽出
  const allPrompts = [];
  for (const filePath of stepFiles) {
    console.log(`📄 処理中: ${path.basename(filePath)}`);
    const prompts = extractPrompts(filePath);
    allPrompts.push(prompts);
  }
  
  // Markdownテーブルを生成
  let markdown = '# Step Processors プロンプト一覧\n\n';
  markdown += `生成日時: ${new Date().toLocaleString('ja-JP')}\n\n`;
  
  // 概要テーブル
  markdown += '## 概要\n\n';
  markdown += '| ステップ | ファイル名 | システムプロンプト数 | ディレクター指示数 |\n';
  markdown += '|---------|-----------|-------------------|------------------|\n';
  
  for (const prompt of allPrompts) {
    markdown += `| Step ${prompt.step} | ${prompt.file} | ${prompt.systemPrompts.length} | ${prompt.directorPrompts.length} |\n`;
  }
  
  markdown += '\n## 詳細\n\n';
  
  // 各ステップの詳細
  for (const prompt of allPrompts) {
    markdown += `### Step ${prompt.step} (${prompt.file})\n\n`;
    
    if (prompt.systemPrompts.length > 0) {
      markdown += '#### システムプロンプト\n\n';
      prompt.systemPrompts.forEach((sp, index) => {
        markdown += `**プロンプト ${index + 1}:**\n\n`;
        markdown += '```\n';
        markdown += sp.replace(/\\n/g, '\n').replace(/\\"/g, '"');
        markdown += '\n```\n\n';
      });
    }
    
    if (prompt.directorPrompts.length > 0) {
      markdown += '#### ディレクター指示\n\n';
      prompt.directorPrompts.forEach((dp, index) => {
        markdown += `**指示 ${index + 1}:**\n\n`;
        markdown += '```\n';
        markdown += dp.replace(/\\n/g, '\n').replace(/\\"/g, '"');
        markdown += '\n```\n\n';
      });
    }
    
    if (prompt.systemPrompts.length === 0 && prompt.directorPrompts.length === 0) {
      markdown += '*プロンプトが見つかりませんでした*\n\n';
    }
  }
  
  // ファイルに書き出し
  fs.writeFileSync(outputPath, markdown, 'utf8');
  console.log(`\n✅ プロンプト一覧を生成しました: ${outputPath}`);
  
  // 簡易的なプロンプト分析
  console.log('\n📊 プロンプト統計:');
  let totalSystem = 0;
  let totalDirector = 0;
  
  for (const prompt of allPrompts) {
    totalSystem += prompt.systemPrompts.length;
    totalDirector += prompt.directorPrompts.length;
  }
  
  console.log(`  - 総システムプロンプト数: ${totalSystem}`);
  console.log(`  - 総ディレクター指示数: ${totalDirector}`);
  console.log(`  - 合計プロンプト数: ${totalSystem + totalDirector}`);
}

// 実行
main().catch(console.error);