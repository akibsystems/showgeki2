'use client';

import React, { useState, useEffect } from 'react';
import { MonacoEditor } from './monaco-editor';
import { Button, Spinner } from '@/components/ui';
import type { Mulmoscript } from '@/types';

// ================================================================
// Script Editor Component Types
// ================================================================

interface ScriptEditorProps {
  script: Mulmoscript | null;
  onChange: (script: Mulmoscript) => void;
  onSave?: (script: Mulmoscript) => Promise<void>;
  isReadOnly?: boolean;
  isLoading?: boolean;
  className?: string;
}


// ================================================================
// Script Editor Component
// ================================================================

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  script,
  onChange,
  onSave,
  isReadOnly = false,
  isLoading = false,
  className = '',
}) => {
  const [jsonValue, setJsonValue] = useState('');
  const [isValidJson, setIsValidJson] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Initialize JSON value when script changes (but not while editing)
  useEffect(() => {
    if (script && !isEditing) {
      setJsonValue(JSON.stringify(script, null, 2));
      setIsValidJson(true);
    }
  }, [script, isEditing]);

  // Initialize when component mounts
  useEffect(() => {
    if (script && jsonValue === '') {
      setJsonValue(JSON.stringify(script, null, 2));
      setIsValidJson(true);
      setIsEditing(false);
    }
  }, [script, jsonValue]);


  // Handle JSON code changes
  const handleJsonChange = (newValue: string) => {
    setJsonValue(newValue);
    setIsEditing(true);
    try {
      const parsed = JSON.parse(newValue);
      onChange(parsed);
      setIsValidJson(true);
    } catch {
      setIsValidJson(false);
    }
  };

  // Handle validation changes
  const handleValidationChange = (isValid: boolean) => {
    setIsValidJson(isValid);
  };

  // Save script
  const handleSave = async () => {
    if (!onSave || !isValidJson) return;

    setIsSaving(true);
    try {
      // Parse the current JSON value to get the edited script
      const parsedScript = JSON.parse(jsonValue);
      await onSave(parsedScript);
      // Reset editing state after successful save
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save script:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !script) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading script...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`script-editor ${className}`}>
      {/* Editor Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Script Editor</h2>
          <p className="text-sm text-gray-600">Edit your video script content and timing</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Save Button */}
          {onSave && !isReadOnly && (
            <Button
              onClick={handleSave}
              disabled={isSaving || !isValidJson}
              className="min-w-[100px]"
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  Saving...
                </>
              ) : (
                'Save Script'
              )}
            </Button>
          )}
        </div>
      </div>


      {/* Editor Content - Code Only */}
      <MonacoEditor
        value={jsonValue}
        onChange={handleJsonChange}
        onValidationChange={handleValidationChange}
        readOnly={isReadOnly}
        height="600px"
        className="json-editor"
      />
    </div>
  );
};

// ================================================================
// Export
// ================================================================

export default ScriptEditor;