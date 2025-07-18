'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Spinner, Button } from '@/components/ui';
import { APIErrorMessage } from '@/components/ui/error-message';

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
// Components
// ================================================================

function FlowDiagram({ flowDiagram }: { flowDiagram: WorkflowData['flowDiagram'] }) {
  return (
    <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
      <div className="flex items-center space-x-8 min-w-max">
        {flowDiagram.nodes.map((node, index) => {
          const edge = flowDiagram.edges.find(e => e.from === node.id);
          const isLast = index === flowDiagram.nodes.length - 1;
          
          return (
            <div key={node.id} className="flex items-center">
              {/* Node */}
              <div
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm whitespace-nowrap
                  ${node.type === 'input' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : ''}
                  ${node.type === 'process' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : ''}
                  ${node.type === 'output' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : ''}
                `}
              >
                {node.label}
              </div>
              
              {/* Arrow */}
              {!isLast && edge && (
                <div className="flex flex-col items-center mx-4">
                  <div className="flex items-center">
                    <div className="w-8 h-0.5 bg-gray-600"></div>
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {edge.label && (
                    <span className="text-xs text-gray-500 whitespace-nowrap mt-1">
                      {edge.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepPromptCard({ 
  step,
  onCopy
}: { 
  step: StepPrompt;
  onCopy?: (text: string, fieldName: string) => void;
}) {
  const [expandedSystem, setExpandedSystem] = useState(true);
  const [expandedDirector, setExpandedDirector] = useState(true);
  
  const copyToClipboard = async (text: string, fieldName: string) => {
    if (onCopy) {
      onCopy(text, fieldName);
    } else {
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ステップのテキスト形式を生成
  const generateStepText = () => {
    let text = `Step ${step.step}\n`;
    text += `ファイル: ${step.file}\n`;
    if (step.description) {
      text += `説明: ${step.description}\n`;
    }
    text += '\n';
    
    if (step.systemPrompts.length > 0) {
      text += `システムプロンプト (${step.systemPrompts.length}):\n`;
      text += '─'.repeat(50) + '\n';
      step.systemPrompts.forEach((prompt, index) => {
        text += `[${index + 1}]\n${prompt}\n\n`;
      });
    }
    
    if (step.directorPrompts.length > 0) {
      text += `ディレクター指示 (${step.directorPrompts.length}):\n`;
      text += '─'.repeat(50) + '\n';
      step.directorPrompts.forEach((prompt, index) => {
        text += `[${index + 1}]\n${prompt}\n\n`;
      });
    }
    
    return text.trim();
  };
  
  const stepText = generateStepText();
  
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-6">
        <div className="mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-100">
                Step {step.step}
              </h3>
              <p className="text-sm text-gray-400 mb-2">{step.file}</p>
              {step.description && (
                <p className="text-sm text-gray-300">{step.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => copyToClipboard(stepText, `step${step.step}`)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-gray-300"
                title="このステップをコピー"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([stepText], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `workflow_step${step.step}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-gray-300"
                title="テキストとしてダウンロード"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* System Prompts */}
        {step.systemPrompts.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setExpandedSystem(!expandedSystem)}
              className="flex items-center justify-between w-full text-left mb-2"
            >
              <h4 className="text-sm font-medium text-blue-400">
                システムプロンプト ({step.systemPrompts.length})
              </h4>
              <svg
                className={`w-4 h-4 text-gray-400 transform transition-transform ${expandedSystem ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedSystem && (
              <div className="space-y-2">
                {step.systemPrompts.map((prompt, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-4">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                      {prompt.replace(/\\n/g, '\n').replace(/\\"/g, '"')}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Director Prompts */}
        {step.directorPrompts.length > 0 && (
          <div>
            <button
              onClick={() => setExpandedDirector(!expandedDirector)}
              className="flex items-center justify-between w-full text-left mb-2"
            >
              <h4 className="text-sm font-medium text-purple-400">
                ディレクター指示 ({step.directorPrompts.length})
              </h4>
              <svg
                className={`w-4 h-4 text-gray-400 transform transition-transform ${expandedDirector ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedDirector && (
              <div className="space-y-2">
                {step.directorPrompts.map((prompt, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-4">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                      {prompt.replace(/\\n/g, '\n').replace(/\\"/g, '"')}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ================================================================
// Main Component
// ================================================================

export default function WorkflowAnalysisPage() {
  const [data, setData] = useState<WorkflowData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  useEffect(() => {
    fetchWorkflowData();
  }, []);
  
  const fetchWorkflowData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/workflow-analysis');
      if (!response.ok) {
        throw new Error(`Failed to fetch workflow data: ${response.statusText}`);
      }
      
      const workflowData = await response.json();
      setData(workflowData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // 全ステップのテキスト形式を生成
  const generateAllStepsText = () => {
    if (!data) return '';
    
    let text = 'ShowGeki2 ワークフロー分析\n';
    text += '=' .repeat(60) + '\n\n';
    
    // フロー図
    text += '処理フロー:\n';
    text += '─'.repeat(50) + '\n';
    data.flowDiagram.nodes.forEach((node, index) => {
      text += node.label;
      if (index < data.flowDiagram.nodes.length - 1) {
        const edge = data.flowDiagram.edges.find(e => e.from === node.id);
        if (edge?.label) {
          text += ` → [${edge.label}] → `;
        } else {
          text += ' → ';
        }
      }
    });
    text += '\n\n';
    
    // 各ステップ
    data.steps.forEach((step, index) => {
      if (index > 0) text += '\n' + '='.repeat(60) + '\n\n';
      
      text += `Step ${step.step}\n`;
      text += `ファイル: ${step.file}\n`;
      if (step.description) {
        text += `説明: ${step.description}\n`;
      }
      text += '\n';
      
      if (step.systemPrompts.length > 0) {
        text += `システムプロンプト (${step.systemPrompts.length}):\n`;
        text += '─'.repeat(50) + '\n';
        step.systemPrompts.forEach((prompt, i) => {
          text += `[${i + 1}]\n${prompt}\n\n`;
        });
      }
      
      if (step.directorPrompts.length > 0) {
        text += `ディレクター指示 (${step.directorPrompts.length}):\n`;
        text += '─'.repeat(50) + '\n';
        step.directorPrompts.forEach((prompt, i) => {
          text += `[${i + 1}]\n${prompt}\n\n`;
        });
      }
    });
    
    // 統計
    text += '\n' + '='.repeat(60) + '\n\n';
    text += '統計情報:\n';
    text += '─'.repeat(50) + '\n';
    text += `総ステップ数: ${data.steps.length}\n`;
    text += `総システムプロンプト数: ${data.steps.reduce((acc, step) => acc + step.systemPrompts.length, 0)}\n`;
    text += `総ディレクター指示数: ${data.steps.reduce((acc, step) => acc + step.directorPrompts.length, 0)}\n`;
    
    return text;
  };
  
  return (
    <div className="space-y-6">
      <div className="mb-6 lg:mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-100">ワークフロー分析</h1>
            <p className="mt-2 text-sm lg:text-base text-gray-400">
              ShowGeki2の6フェーズ処理とプロンプトの詳細
            </p>
          </div>
          {data && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(generateAllStepsText(), 'all')}
              >
                すべてコピー
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => downloadText(generateAllStepsText(), 'workflow_all_steps.txt')}
              >
                すべてエクスポート
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Error Message */}
      {error && !isLoading && (
        <div className="mb-8">
          <APIErrorMessage 
            error={error} 
            onRetry={fetchWorkflowData} 
          />
        </div>
      )}
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      )}
      
      {/* Content */}
      {data && !isLoading && (
        <>
          {/* Flow Diagram */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">処理フロー</h2>
            <FlowDiagram flowDiagram={data.flowDiagram} />
          </section>
          
          {/* Step Details */}
          <section>
            <h2 className="text-xl font-semibold text-gray-100 mb-4">各ステップの詳細</h2>
            <div className="grid gap-6">
              {data.steps.map((step) => (
                <StepPromptCard 
                  key={step.step} 
                  step={step} 
                  onCopy={copyToClipboard}
                />
              ))}
            </div>
          </section>
          
          {/* Statistics */}
          <section className="mt-8">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-4">統計情報</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400">総ステップ数</p>
                    <p className="text-2xl font-bold text-gray-100">{data.steps.length}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400">総システムプロンプト数</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {data.steps.reduce((acc, step) => acc + step.systemPrompts.length, 0)}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400">総ディレクター指示数</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {data.steps.reduce((acc, step) => acc + step.directorPrompts.length, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}
      
      {/* Copy notification */}
      {copiedField && (
        <div className="fixed bottom-4 right-4 bg-green-500/20 text-green-400 px-4 py-2 rounded-lg border border-green-500/30 z-50">
          コピーしました
        </div>
      )}
    </div>
  );
}