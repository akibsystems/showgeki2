'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { DetectedFace } from '@/types/face-detection';

interface CharacterSelectionProps {
  faces: DetectedFace[];
  onCharacterUpdate: (characterData: { [faceId: string]: { enabled: boolean; name: string } }) => void;
}

export function CharacterSelection({ faces, onCharacterUpdate }: CharacterSelectionProps) {
  const [characters, setCharacters] = useState<{ [faceId: string]: { enabled: boolean; name: string } }>({});

  const handleToggle = (faceId: string) => {
    const newCharacters = {
      ...characters,
      [faceId]: {
        enabled: !characters[faceId]?.enabled,
        name: characters[faceId]?.name || ''
      }
    };
    setCharacters(newCharacters);
    onCharacterUpdate(newCharacters);
  };

  const handleNameChange = (faceId: string, name: string) => {
    const newCharacters = {
      ...characters,
      [faceId]: {
        ...characters[faceId],
        name
      }
    };
    setCharacters(newCharacters);
    onCharacterUpdate(newCharacters);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {faces.map((face, index) => {
          const isEnabled = characters[face.id]?.enabled || false;
          const name = characters[face.id]?.name || '';

          return (
            <div key={face.id} className="space-y-2">
              {/* Face thumbnail with checkbox */}
              <div className="relative">
                <div className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 ${isEnabled ? 'ring-2 ring-blue-500' : ''
                  }`}>
                  <Image
                    src={face.thumbnailUrl || face.imageUrl}
                    alt={`人物${index + 1}`}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>

                {/* Checkbox in corner */}
                <label className="absolute top-1 right-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggle(face.id)}
                    className="sr-only"
                  />
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isEnabled
                    ? 'bg-blue-600 text-white'
                    : 'bg-white bg-opacity-90 border-2 border-gray-300 hover:border-blue-500'
                    }`}>
                    {isEnabled && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </label>
              </div>

              {/* Name input */}
              {isEnabled ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(face.id, e.target.value)}
                  placeholder="キャラ名を入力"
                  className={`w-full px-2 py-1 text-sm text-gray-900 border rounded-md focus:outline-none focus:ring-1 ${isEnabled && !name.trim()
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                    }`}
                />
              ) : (
                <div className="h-[30px] flex items-center justify-center">
                  <span className="text-xs text-gray-400">未使用</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500">
        登場させたい人物をタップして選択し、名前を入力してください
      </p>
    </div>
  );
}