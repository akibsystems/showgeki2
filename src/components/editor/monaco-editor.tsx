'use client';

import React, { useRef, useEffect, useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { Button } from '@/components/ui';

// ================================================================
// Monaco Editor Component Types
// ================================================================

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: 'vs-dark' | 'light';
  height?: string;
  readOnly?: boolean;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  schema?: object;
  className?: string;
}

// ================================================================
// Mulmocast Script JSON Schema
// ================================================================

const mulmoscriptSchema = {
  type: "object",
  properties: {
    version: {
      type: "string",
      description: "Script version"
    },
    title: {
      type: "string",
      description: "Script title"
    },
    scenes: {
      type: "array",
      description: "Array of scenes",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Scene ID"
          },
          type: {
            type: "string",
            enum: ["dialogue", "narration", "action"],
            description: "Scene type"
          },
          content: {
            type: "string",
            description: "Scene content/text"
          },
          duration: {
            type: "number",
            minimum: 0.1,
            description: "Scene duration in seconds"
          },
          voice: {
            type: "object",
            properties: {
              character: {
                type: "string",
                description: "Voice character name"
              },
              emotion: {
                type: "string",
                description: "Voice emotion"
              }
            },
            required: ["character"],
            additionalProperties: false
          }
        },
        required: ["id", "type", "content", "duration"],
        additionalProperties: false
      }
    },
    metadata: {
      type: "object",
      properties: {
        duration_total: {
          type: "number",
          minimum: 0,
          description: "Total duration in seconds"
        },
        resolution: {
          type: "string",
          description: "Video resolution (e.g., 1920x1080)"
        },
        fps: {
          type: "integer",
          minimum: 1,
          description: "Frames per second"
        }
      },
      required: ["duration_total", "resolution", "fps"],
      additionalProperties: false
    }
  },
  required: ["version", "title", "scenes", "metadata"],
  additionalProperties: false
};

// ================================================================
// Monaco Editor Component
// ================================================================

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  language = 'json',
  theme = 'vs-dark',
  height = '400px',
  readOnly = false,
  onValidationChange,
  schema = mulmoscriptSchema,
  className = '',
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [isValidJson, setIsValidJson] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Configure Monaco editor
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure JSON language support
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [
        {
          uri: "http://mulmocast.local/script.json",
          fileMatch: ["*"],
          schema: schema,
        },
      ],
    });

    // Set up custom key bindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Format document on Ctrl+S
      editor.getAction('editor.action.formatDocument')?.run();
    });

    // Set up validation
    const model = editor.getModel();
    if (model) {
      const updateValidation = () => {
        const markers = monaco.editor.getModelMarkers({ resource: model.uri });
        const errors = markers
          .filter(marker => marker.severity === monaco.MarkerSeverity.Error)
          .map(marker => `Line ${marker.startLineNumber}: ${marker.message}`);
        
        const isValid = errors.length === 0;
        setIsValidJson(isValid);
        setValidationErrors(errors);
        onValidationChange?.(isValid, errors);
      };

      // Update validation on change
      model.onDidChangeContent(() => {
        setTimeout(updateValidation, 100); // Debounce validation
      });

      // Initial validation
      updateValidation();
    }
  };

  // Handle value changes
  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue);
    }
  };

  // Format JSON
  const formatJson = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  // Validate and fix JSON
  const validateAndFix = () => {
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
    } catch (error) {
      console.error('Invalid JSON:', error);
    }
  };

  return (
    <div className={`monaco-editor-container ${className}`}>
      {/* Editor Toolbar */}
      <div className="flex justify-between items-center mb-3 p-3 bg-gray-50 border border-gray-200 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Script Editor</span>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${isValidJson ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-xs ${isValidJson ? 'text-green-700' : 'text-red-700'}`}>
              {isValidJson ? 'Valid' : 'Invalid JSON'}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={formatJson}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Format
          </Button>
          <Button variant="ghost" size="sm" onClick={validateAndFix}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Fix JSON
          </Button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="border border-gray-200 rounded-b-lg overflow-hidden">
        <Editor
          height={height}
          language={language}
          theme={theme}
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            rulers: [],
            wordWrap: 'on',
            wrappingIndent: 'indent',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
            unfoldOnClickAfterEndOfLine: false,
            contextmenu: true,
            selectOnLineNumbers: true,
            roundedSelection: false,
            cursorStyle: 'line',
            accessibilitySupport: 'auto',
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            hover: {
              enabled: true,
              delay: 300,
            },
            parameterHints: {
              enabled: true,
            },
            autoIndent: 'full',
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-2">
            <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-medium text-red-800">Validation Errors</span>
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex items-start">
                <span className="w-1 h-1 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Help Text */}
      {!readOnly && (
        <div className="mt-3 text-xs text-gray-500">
          <div className="flex flex-wrap gap-4">
            <span>• <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl+S</kbd> Format document</span>
            <span>• <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl+Space</kbd> Trigger suggestions</span>
            <span>• <kbd className="px-1 py-0.5 bg-gray-100 rounded">F1</kbd> Command palette</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ================================================================
// Export
// ================================================================

export default MonacoEditor;