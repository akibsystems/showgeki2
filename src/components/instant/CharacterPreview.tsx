'use client';

import Image from 'next/image';
import type { DetectedFace, FaceTag, FACE_ROLE_LABELS } from '@/types/face-detection';

interface CharacterPreviewProps {
  characters: Array<{
    face: DetectedFace;
    tag: FaceTag;
  }>;
  onCharacterClick?: (character: { face: DetectedFace; tag: FaceTag }) => void;
}

const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  protagonist: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  friend: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  family: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  colleague: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  other: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
};

export function CharacterPreview({ characters, onCharacterClick }: CharacterPreviewProps) {
  if (characters.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        キャラクター設定 ({characters.length}人)
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map((character, index) => {
          const roleStyle = roleColors[character.tag.role] || roleColors.other;

          return (
            <div
              key={character.face.id}
              onClick={() => onCharacterClick?.(character)}
              className={`
                bg-white rounded-lg shadow-sm border-2 p-4 transition-all cursor-pointer
                hover:shadow-md ${roleStyle.border}
              `}
            >
              <div className="flex items-start space-x-3">
                {/* 顔画像 */}
                <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={character.face.thumbnailUrl || character.face.imageUrl}
                    alt={character.tag.name}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>

                {/* キャラクター情報 */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {character.tag.name}
                  </h4>
                  
                  {/* 役割バッジ */}
                  <span
                    className={`
                      inline-block px-2 py-1 text-xs font-medium rounded-full mt-1
                      ${roleStyle.bg} ${roleStyle.text}
                    `}
                  >
                    {FACE_ROLE_LABELS[character.tag.role] || character.tag.role}
                  </span>

                  {/* 説明 */}
                  {character.tag.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {character.tag.description}
                    </p>
                  )}

                  {/* 感情情報 */}
                  {character.face.attributes && (
                    <div className="mt-2 text-xs text-gray-500">
                      {getEmotionSummary(character.face.attributes)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ストーリー生成への説明 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <span className="font-medium">💡 ヒント:</span>{' '}
          これらのキャラクター情報は、ストーリー生成時に自動的に反映されます。
          各キャラクターの顔画像は、動画内でそのキャラクターが登場するシーンで参照画像として使用されます。
        </p>
      </div>
    </div>
  );
}

// 感情情報のサマリーを生成
function getEmotionSummary(attributes: {
  joy: number;
  sorrow: number;
  anger: number;
  surprise: number;
}): string {
  const emotions = [
    { name: '喜び', value: attributes.joy },
    { name: '悲しみ', value: attributes.sorrow },
    { name: '怒り', value: attributes.anger },
    { name: '驚き', value: attributes.surprise },
  ];

  // 最も高い感情を見つける
  const dominantEmotion = emotions.reduce((max, current) =>
    current.value > max.value ? current : max
  );

  if (dominantEmotion.value >= 0.7) {
    return `${dominantEmotion.name}の表情`;
  } else if (dominantEmotion.value >= 0.5) {
    return `やや${dominantEmotion.name}の表情`;
  } else {
    return '中立的な表情';
  }
}