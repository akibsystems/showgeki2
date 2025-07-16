'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { DetectedFace, FaceTag, FaceRole, FACE_ROLE_LABELS } from '@/types/face-detection';

interface FaceTaggingPanelProps {
  faces: DetectedFace[];
  onTagUpdate: (faceId: string, tag: FaceTag) => void;
  onReorder: (faces: DetectedFace[]) => void;
  onDelete: (faceId: string) => void;
  selectedFaceId?: string;
  onFaceSelect?: (faceId: string) => void;
}

const roleOptions: Array<{ value: FaceRole; label: string }> = [
  { value: 'protagonist', label: '主人公' },
  { value: 'friend', label: '友人' },
  { value: 'family', label: '家族' },
  { value: 'colleague', label: '同僚' },
  { value: 'other', label: 'その他' },
];

export function FaceTaggingPanel({
  faces,
  onTagUpdate,
  onReorder,
  onDelete,
  selectedFaceId,
  onFaceSelect,
}: FaceTaggingPanelProps) {
  const [editingFaceId, setEditingFaceId] = useState<string | null>(null);
  const [draggedFaceId, setDraggedFaceId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // フォームの状態管理
  const [formData, setFormData] = useState<Record<string, Partial<FaceTag>>>({});

  // 顔のタグ情報が更新されたらフォームデータを更新
  useEffect(() => {
    const newFormData: Record<string, Partial<FaceTag>> = {};
    faces.forEach(face => {
      newFormData[face.id] = face.tag || {
        name: '',
        role: 'other' as FaceRole,
        description: '',
      };
    });
    setFormData(newFormData);
  }, [faces]);

  // ドラッグ&ドロップのハンドラー
  const handleDragStart = (e: React.DragEvent, faceId: string) => {
    setDraggedFaceId(faceId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetFaceId: string) => {
    e.preventDefault();
    
    if (!draggedFaceId || draggedFaceId === targetFaceId) return;

    const draggedIndex = faces.findIndex(f => f.id === draggedFaceId);
    const targetIndex = faces.findIndex(f => f.id === targetFaceId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newFaces = [...faces];
    const [draggedFace] = newFaces.splice(draggedIndex, 1);
    newFaces.splice(targetIndex, 0, draggedFace);

    onReorder(newFaces);
    setDraggedFaceId(null);
  };

  // タグの保存
  const handleSaveTag = (faceId: string) => {
    const tag = formData[faceId];
    if (tag && tag.name) {
      onTagUpdate(faceId, {
        name: tag.name,
        role: tag.role || 'other',
        description: tag.description,
      });
      setEditingFaceId(null);
    }
  };

  // 削除の確認と実行
  const handleDelete = (faceId: string) => {
    onDelete(faceId);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          検出された人物 ({faces.length}人)
        </h3>
        <p className="text-sm text-gray-500">
          ドラッグして並び順を変更できます
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {faces.map((face, index) => {
          const isEditing = editingFaceId === face.id;
          const isSelected = selectedFaceId === face.id;
          const isDeleting = deleteConfirmId === face.id;
          const tag = formData[face.id] || {};

          return (
            <div
              key={face.id}
              draggable={!isEditing && !isDeleting}
              onDragStart={(e) => handleDragStart(e, face.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, face.id)}
              onClick={() => !isEditing && onFaceSelect?.(face.id)}
              className={`
                relative bg-white rounded-lg shadow-sm border-2 p-3 transition-all
                ${isSelected ? 'border-purple-500' : 'border-gray-200'}
                ${!isEditing && !isDeleting ? 'cursor-move hover:shadow-md' : ''}
                ${draggedFaceId === face.id ? 'opacity-50' : ''}
              `}
            >
              {/* 削除確認ダイアログ */}
              {isDeleting && (
                <div className="absolute inset-0 bg-white bg-opacity-95 rounded-lg flex flex-col items-center justify-center p-4 z-10">
                  <p className="text-sm text-center mb-3">削除しますか？</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDelete(face.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      削除
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}

              {/* 顔画像 */}
              <div className="relative aspect-square mb-2 rounded overflow-hidden">
                <Image
                  src={face.thumbnailUrl || face.imageUrl}
                  alt={tag.name || `人物 ${index + 1}`}
                  fill
                  style={{ objectFit: 'cover' }}
                />
                {/* 番号バッジ */}
                <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </div>
              </div>

              {/* タグ情報 */}
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={tag.name || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      [face.id]: { ...tag, name: e.target.value }
                    })}
                    placeholder="名前"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                    autoFocus
                  />
                  <select
                    value={tag.role || 'other'}
                    onChange={(e) => setFormData({
                      ...formData,
                      [face.id]: { ...tag, role: e.target.value as FaceRole }
                    })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {roleOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleSaveTag(face.id)}
                      disabled={!tag.name}
                      className="flex-1 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:bg-gray-300"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setEditingFaceId(null);
                        setFormData({
                          ...formData,
                          [face.id]: face.tag || { name: '', role: 'other', description: '' }
                        });
                      }}
                      className="flex-1 px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {tag.name || `人物 ${index + 1}`}
                  </p>
                  {tag.role && (
                    <p className="text-xs text-gray-500">
                      {roleOptions.find(r => r.value === tag.role)?.label}
                    </p>
                  )}
                  <div className="flex space-x-1 mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFaceId(face.id);
                      }}
                      className="flex-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                    >
                      編集
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(face.id);
                      }}
                      className="px-2 py-1 bg-gray-100 text-red-600 text-xs rounded hover:bg-red-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {faces.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          検出された顔がありません
        </div>
      )}
    </div>
  );
}