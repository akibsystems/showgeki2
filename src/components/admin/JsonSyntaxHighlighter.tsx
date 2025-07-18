'use client';

import React from 'react';

interface JsonSyntaxHighlighterProps {
  json: string;
  className?: string;
}

export function JsonSyntaxHighlighter({ json, className = '' }: JsonSyntaxHighlighterProps) {
  // Function to render JSON with proper formatting and highlighting
  const renderJson = (obj: any, indent: number = 0, parentKey?: string): React.ReactNode => {
    const spaces = '  '.repeat(indent);
    
    if (obj === null) {
      return <span className="text-gray-400 italic">null</span>;
    }
    
    if (typeof obj === 'string') {
      // Escape special characters for display
      const escaped = obj
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      
      // For non-text fields, show as simple string
      return <span className="text-emerald-400">"{escaped}"</span>;
      
      // Multi-line string - special handling for originalText and similar fields
      const isTextContent = parentKey === 'originalText' || 
                           parentKey === 'text' || 
                           parentKey === 'description' ||
                           parentKey === 'content' ||
                           parentKey === 'storyText' ||
                           parentKey === 'characters' ||
                           parentKey === 'dramaticTurningPoint' ||
                           parentKey === 'futureVision' ||
                           parentKey === 'learnings' ||
                           parentKey === 'dialogue' ||
                           parentKey === 'stage_directions' ||
                           parentKey === 'synopsis';
      
      if (isTextContent) {
        // For text content fields, display with actual line breaks for readability
        // Convert \n to actual line breaks and decode HTML entities
        // JSONの中の文字列は既に適切にパースされているはずだが、
        // HTMLエンティティをデコード
        const decodedText = obj
          .replace(/&gt;/g, '>')    // Decode HTML entities
          .replace(/&lt;/g, '<')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"');
        
        return (
          <div className="text-emerald-400">
            <span>"</span>
            <div className="pl-4 py-1">
              <div className="text-emerald-300 whitespace-pre-wrap break-words font-mono text-sm">
                {decodedText}
              </div>
            </div>
            <span>{spaces}"</span>
          </div>
        );
      }
    }
    
    if (typeof obj === 'number') {
      return <span className="text-cyan-400">{obj}</span>;
    }
    
    if (typeof obj === 'boolean') {
      return <span className="text-amber-400">{String(obj)}</span>;
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return <span className="text-gray-400">[]</span>;
      }
      
      return (
        <>
          <span className="text-gray-400">[</span>
          {obj.map((item, index) => (
            <React.Fragment key={index}>
              {'\n'}{spaces}  {renderJson(item, indent + 1)}
              {index < obj.length - 1 && <span className="text-gray-500">,</span>}
            </React.Fragment>
          ))}
          {'\n'}{spaces}<span className="text-gray-400">]</span>
        </>
      );
    }
    
    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) {
        return <span className="text-gray-400">{'{}'}</span>;
      }
      
      return (
        <>
          <span className="text-gray-400">{'{'}</span>
          {entries.map(([key, value], index) => (
            <React.Fragment key={key}>
              {'\n'}{spaces}  <span className="text-purple-400">"{key}"</span>
              <span className="text-gray-500">: </span>
              {renderJson(value, indent + 1, key)}
              {index < entries.length - 1 && <span className="text-gray-500">,</span>}
            </React.Fragment>
          ))}
          {'\n'}{spaces}<span className="text-gray-400">{'}'}</span>
        </>
      );
    }
    
    return String(obj);
  };

  // Parse the JSON
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return (
      <pre className={`text-sm font-mono text-red-400 ${className}`}>
        Invalid JSON: {String(e)}
      </pre>
    );
  }

  return (
    <pre className={`text-sm font-mono leading-relaxed overflow-auto whitespace-pre ${className}`}>
      {renderJson(parsed)}
    </pre>
  );
}