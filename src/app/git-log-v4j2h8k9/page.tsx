'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

interface Commit {
  hash: string;
  author?: string;
  email?: string;
  date?: string;
  message: string;
}

export default function GitLogPage() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<'oneline' | 'full'>('full');
  const [limit, setLimit] = useState('50');

  useEffect(() => {
    let mounted = true;
    const timeoutId = setTimeout(() => {
      const fetchGitLog = async () => {
        if (!mounted) return;
        
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/git-log?format=${format}&limit=${limit}`);
          if (!response.ok) {
            throw new Error('Failed to fetch git log');
          }
          const data = await response.json();
          
          if (mounted) {
            setCommits(data.commits);
          }
        } catch (err) {
          if (mounted) {
            setError(err instanceof Error ? err.message : 'Unknown error');
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

      fetchGitLog();
    }, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [format, limit]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  const getCommitTypeColor = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.startsWith('fix')) return '#dc2626';
    if (lowerMessage.startsWith('feat')) return '#16a34a';
    if (lowerMessage.startsWith('docs')) return '#2563eb';
    if (lowerMessage.startsWith('style')) return '#9333ea';
    if (lowerMessage.startsWith('refactor')) return '#f59e0b';
    if (lowerMessage.startsWith('test')) return '#0891b2';
    return '#6b7280';
  };

  const getCommitTypeLabel = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.startsWith('fix')) return 'Fix';
    if (lowerMessage.startsWith('feat')) return 'Feature';
    if (lowerMessage.startsWith('docs')) return 'Docs';
    if (lowerMessage.startsWith('style')) return 'Style';
    if (lowerMessage.startsWith('refactor')) return 'Refactor';
    if (lowerMessage.startsWith('test')) return 'Test';
    if (lowerMessage.includes('merge')) return 'Merge';
    return 'Commit';
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Git Commit Log</h1>
      
      <div className={styles.controls}>
        <div className={styles.toggleGroup}>
          <button
            className={`${styles.toggleButton} ${format === 'oneline' ? styles.active : ''}`}
            onClick={() => setFormat('oneline')}
          >
            Simple
          </button>
          <button
            className={`${styles.toggleButton} ${format === 'full' ? styles.active : ''}`}
            onClick={() => setFormat('full')}
          >
            Detailed
          </button>
        </div>
        
        <div className={styles.limitControl}>
          <label htmlFor="limit">Limit:</label>
          <input
            id="limit"
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            min="1"
            max="1000"
            className={styles.limitInput}
          />
        </div>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          Loading...
        </div>
      )}

      {error && (
        <div className={styles.error}>
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div className={styles.commitList}>
          {commits.map((commit, index) => (
            <div key={commit.hash} className={styles.commit}>
              <div className={styles.commitHeader}>
                <span 
                  className={styles.commitType}
                  style={{ backgroundColor: getCommitTypeColor(commit.message) }}
                >
                  {getCommitTypeLabel(commit.message)}
                </span>
                <div className={styles.commitMessage}>
                  {commit.message}
                </div>
              </div>
              <div className={styles.commitMeta}>
                <code className={styles.commitHash}>{commit.hash.substring(0, 7)}</code>
                {commit.author && (
                  <span className={styles.commitAuthor}>by {commit.author}</span>
                )}
                {commit.date && (
                  <span className={styles.commitDate}>{formatDate(commit.date)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}