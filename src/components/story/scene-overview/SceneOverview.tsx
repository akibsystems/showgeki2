'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui';
import styles from './SceneOverview.module.css';

interface SceneInfo {
  number: number;
  title: string;
  summary: string;
}

interface SceneOverviewProps {
  storyText: string;
  beatCount: number;
  onScenesGenerated?: (scenes: SceneInfo[]) => void;
  className?: string;
}

export function SceneOverview({ 
  storyText, 
  beatCount, 
  onScenesGenerated,
  className 
}: SceneOverviewProps) {
  const [scenes, setScenes] = useState<SceneInfo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set());

  useEffect(() => {
    generateSceneOverview();
  }, [storyText, beatCount]);

  const generateSceneOverview = async () => {
    if (!storyText || beatCount < 1) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/stories/generate-scene-overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyText,
          beatCount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate scene overview');
      }

      const data = await response.json();
      setScenes(data.scenes);
      
      if (onScenesGenerated) {
        onScenesGenerated(data.scenes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSceneExpansion = (sceneNumber: number) => {
    setExpandedScenes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sceneNumber)) {
        newSet.delete(sceneNumber);
      } else {
        newSet.add(sceneNumber);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedScenes(new Set(scenes.map(s => s.number)));
  };

  const collapseAll = () => {
    setExpandedScenes(new Set());
  };

  if (isGenerating) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.loading}>
          <Spinner size="md" />
          <p>シーン構成を分析中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.error}>
          <p>エラー: {error}</p>
          <button onClick={generateSceneOverview} className={styles.retryButton}>
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (scenes.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.icon}>✨</span>
          シーン構成
        </h3>
        <div className={styles.actions}>
          <button onClick={expandAll} className={styles.actionButton}>
            すべて展開
          </button>
          <button onClick={collapseAll} className={styles.actionButton}>
            すべて折りたたむ
          </button>
        </div>
      </div>

      <div className={styles.sceneList}>
        {scenes.map((scene) => (
          <div key={scene.number} className={styles.sceneItem}>
            <button
              onClick={() => toggleSceneExpansion(scene.number)}
              className={styles.sceneHeader}
            >
              <div className={styles.sceneNumber}>
                シーン {scene.number}
              </div>
              <div className={styles.sceneTitle}>
                {scene.title}
              </div>
              <span className={styles.chevron}>
                {expandedScenes.has(scene.number) ? '▲' : '▼'}
              </span>
            </button>
            
            {expandedScenes.has(scene.number) && (
              <div className={styles.sceneSummary}>
                {scene.summary}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}