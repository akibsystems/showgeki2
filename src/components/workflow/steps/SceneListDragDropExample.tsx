'use client';

import React, { useState } from 'react';
import { SceneListDragDrop } from './SceneListDragDrop';

interface Scene {
  id: string;
  title: string;
  description: string;
  speaker: string;
}

// 使用例
export const SceneListDragDropExample: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>([
    {
      id: '1',
      title: 'シーン 1',
      description: '主人公が目覚めるシーン',
      speaker: 'ナレーター'
    },
    {
      id: '2',
      title: 'シーン 2',
      description: '街を歩くシーン',
      speaker: '主人公'
    },
    {
      id: '3',
      title: 'シーン 3',
      description: '友人と出会うシーン',
      speaker: '友人A'
    },
    {
      id: '4',
      title: 'シーン 4',
      description: '冒険の始まり',
      speaker: 'ナレーター'
    }
  ]);

  const handleReorder = (reorderedItems: any[]) => {
    // idを元にシーンを並び替え
    const newScenes = reorderedItems.map(item => 
      scenes.find(scene => scene.id === item.id)!
    );
    setScenes(newScenes);
  };

  // SceneListDragDrop用にデータを変換
  const dragDropItems = scenes.map(scene => ({
    id: scene.id,
    content: (
      <div style={{ padding: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
          {scene.title}
        </h4>
        <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#666' }}>
          {scene.description}
        </p>
        <span style={{ fontSize: '12px', color: '#999' }}>
          話者: {scene.speaker}
        </span>
      </div>
    )
  }));

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>シーンの並び替え</h2>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        ドラッグ&ドロップでシーンの順序を変更できます
      </p>
      
      <SceneListDragDrop
        items={dragDropItems}
        onReorder={handleReorder}
      />
      
      <div style={{ marginTop: '40px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '12px' }}>現在の順序:</h3>
        <ol>
          {scenes.map((scene, index) => (
            <li key={scene.id} style={{ marginBottom: '8px' }}>
              {scene.title} - {scene.description}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};