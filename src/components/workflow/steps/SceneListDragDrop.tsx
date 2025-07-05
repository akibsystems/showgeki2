'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './SceneListDragDrop.module.css';

interface DragDropItem {
  id: string;
  content: React.ReactNode;
}

interface SceneListDragDropProps {
  items: DragDropItem[];
  onReorder: (items: DragDropItem[]) => void;
  className?: string;
}

export const SceneListDragDrop: React.FC<SceneListDragDropProps> = ({
  items,
  onReorder,
  className
}) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedOverItem, setDraggedOverItem] = useState<string | null>(null);
  const [touchY, setTouchY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const draggedElement = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ドラッグ開始（マウス）
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, itemId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    setDraggedItem(itemId);
    setIsDragging(true);
    
    // ドラッグ中の要素の見た目を設定
    const element = e.currentTarget as HTMLDivElement;
    draggedElement.current = element;
    
    // ドラッグゴーストイメージを非表示
    const dragImage = new Image();
    dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    e.dataTransfer.setDragImage(dragImage, 0, 0);
  }, []);

  // タッチ開始
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, itemId: string) => {
    // ドラッグハンドルエリアからのタッチのみ処理
    const target = e.target as HTMLElement;
    const isDragHandle = target.closest('.dragHandle') !== null;
    if (!isDragHandle) return;
    
    const touch = e.touches[0];
    setTouchY(touch.clientY);
    setDraggedItem(itemId);
    setIsDragging(true);
    
    const element = e.currentTarget as HTMLDivElement;
    draggedElement.current = element;
    
    // タッチ時は長押しでドラッグ開始
    e.currentTarget.style.transition = 'none';
    
    // 振動フィードバック（対応デバイスのみ）
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  // ドラッグ中（マウス）
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // ドラッグがアイテムの上に来た時
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>, itemId: string) => {
    if (draggedItem && draggedItem !== itemId) {
      setDraggedOverItem(itemId);
    }
  }, [draggedItem]);

  // タッチ移動
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!draggedItem) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    
    // タッチ位置の要素を取得
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const itemElement = element.closest('[data-item-id]');
      if (itemElement) {
        const itemId = itemElement.getAttribute('data-item-id');
        if (itemId && itemId !== draggedItem) {
          setDraggedOverItem(itemId);
        }
      } else {
        setDraggedOverItem(null);
      }
    }
    
    // ドラッグ中の要素を移動
    if (draggedElement.current) {
      const deltaY = touch.clientY - touchY;
      draggedElement.current.style.transform = `translateY(${deltaY}px) scale(1.02)`;
      draggedElement.current.style.zIndex = '1000';
      draggedElement.current.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
    }
  }, [draggedItem, touchY]);

  // ドロップ（マウス）
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedItem && draggedItem !== targetId) {
      const newItems = [...items];
      const draggedIndex = items.findIndex(item => item.id === draggedItem);
      const targetIndex = items.findIndex(item => item.id === targetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = newItems.splice(draggedIndex, 1);
        newItems.splice(targetIndex, 0, removed);
        onReorder(newItems);
      }
    }
    
    resetDragState();
  }, [draggedItem, items, onReorder]);

  // タッチ終了
  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!draggedItem || !draggedOverItem) {
      resetDragState();
      return;
    }
    
    if (draggedItem !== draggedOverItem) {
      const newItems = [...items];
      const draggedIndex = items.findIndex(item => item.id === draggedItem);
      const targetIndex = items.findIndex(item => item.id === draggedOverItem);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = newItems.splice(draggedIndex, 1);
        newItems.splice(targetIndex, 0, removed);
        onReorder(newItems);
      }
    }
    
    resetDragState();
  }, [draggedItem, draggedOverItem, items, onReorder]);

  // ドラッグ終了
  const handleDragEnd = useCallback(() => {
    resetDragState();
  }, []);

  // ドラッグ状態をリセット
  const resetDragState = () => {
    setDraggedItem(null);
    setDraggedOverItem(null);
    setIsDragging(false);
    if (draggedElement.current) {
      draggedElement.current.style.transform = '';
      draggedElement.current.style.transition = '';
      draggedElement.current.style.zIndex = '';
      draggedElement.current.style.boxShadow = '';
    }
    draggedElement.current = null;
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      resetDragState();
    };
  }, []);

  return (
    <div ref={containerRef} className={`${styles.container} ${className || ''}`}>
      {items.map((item, index) => (
        <div
          key={item.id}
          data-item-id={item.id}
          className={`
            ${styles.item}
            ${draggedItem === item.id ? styles.dragging : ''}
            ${draggedOverItem === item.id ? styles.dragOver : ''}
            ${isDragging && draggedItem !== item.id ? styles.notDragging : ''}
          `}
          draggable
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragEnter={(e) => handleDragEnter(e, item.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, item.id)}
          onDragEnd={handleDragEnd}
          onTouchStart={(e) => handleTouchStart(e, item.id)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={`${styles.dragHandle} dragHandle`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 4h6M7 10h6M7 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className={styles.content}>
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
};