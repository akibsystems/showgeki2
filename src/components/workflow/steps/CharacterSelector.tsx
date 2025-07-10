'use client';

import React from 'react';

interface Character {
  id: string;
  name: string;
  faceReference?: string;
}

interface CharacterSelectorProps {
  sceneId: string;
  availableCharacters: Character[];
  selectedCharacters: string[];
  onCharacterToggle: (sceneId: string, characterId: string) => void;
}

export default function CharacterSelector({
  sceneId,
  availableCharacters,
  selectedCharacters,
  onCharacterToggle
}: CharacterSelectorProps) {
  
  // デバッグ情報
  if (availableCharacters.length > 0) {
    console.log('[CharacterSelector] Scene ID:', sceneId);
    console.log('[CharacterSelector] Available characters:', availableCharacters);
    console.log('[CharacterSelector] Selected characters:', selectedCharacters);
  }
  
  // 顔参照画像を持つキャラクターのみをフィルタリング
  const charactersWithFaceRef = availableCharacters.filter(char => char.faceReference);
  
  if (charactersWithFaceRef.length > 0) {
    console.log('[CharacterSelector] Characters with face ref:', charactersWithFaceRef);
  }
  
  if (charactersWithFaceRef.length === 0) {
    console.log('[CharacterSelector] No characters with face reference found, returning null');
    return null; // キャラクターがいない場合は何も表示しない
  }

  return (
    <div className="mt-6 border-t border-gray-700 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h4 className="text-sm font-medium text-gray-300">
          このシーンに登場するキャラクター
        </h4>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {charactersWithFaceRef.map((character) => {
          const isSelected = selectedCharacters.includes(character.id);
          
          return (
            <button
              key={character.id}
              onClick={() => onCharacterToggle(sceneId, character.id)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-full
                transition-all duration-200 transform hover:scale-105
                ${isSelected 
                  ? 'bg-purple-600 text-white border-2 border-purple-500' 
                  : 'bg-gray-700 text-gray-300 border-2 border-gray-600 hover:border-gray-500'
                }
              `}
            >
              <img 
                src={character.faceReference} 
                alt={character.name}
                className={`w-8 h-8 rounded-full object-cover border-2 ${
                  isSelected ? 'border-white' : 'border-gray-500'
                }`}
                onError={(e) => {
                  // 画像読み込みエラー時はデフォルトアイコンを表示
                  const img = e.target as HTMLImageElement;
                  img.style.display = 'none';
                  const placeholder = img.nextElementSibling as HTMLElement;
                  if (placeholder) placeholder.style.display = 'flex';
                }}
              />
              {/* 画像エラー時のプレースホルダー */}
              <div className={`w-8 h-8 rounded-full bg-gray-600 items-center justify-center hidden ${
                isSelected ? 'border-2 border-white' : 'border-2 border-gray-500'
              }`}>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="font-medium text-sm">{character.name}</span>
              {isSelected && (
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="mt-3 flex items-start gap-2">
        <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-gray-400">
          選択したキャラクターの顔参照画像がこのシーンの画像生成時に使用されます
        </p>
      </div>
    </div>
  );
}