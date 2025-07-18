'use client';

import React from 'react';

interface JsonSyntaxHighlighterProps {
  json: string;
  className?: string;
}

export function JsonSyntaxHighlighter({ json, className = '' }: JsonSyntaxHighlighterProps) {
  // Function to render JSON with proper formatting and highlighting
  const renderJson = (obj: any, indent: number = 0): React.ReactNode => {
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
      return <span className="text-emerald-400">"{escaped}"</span>;
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
              {renderJson(value, indent + 1)}
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