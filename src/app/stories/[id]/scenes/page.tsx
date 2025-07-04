'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/layout';
import { Button, Card, CardContent, PageLoading, Spinner } from '@/components/ui';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useStory } from '@/hooks';
import { useToast } from '@/contexts';
import Link from 'next/link';
import styles from './scenes.module.css';

interface SceneInfo {
  number: number;
  title: string;
}

const SceneEditorContent: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { error: showError } = useToast();
  const storyId = params.id as string;
  const { story, isLoading } = useStory(storyId);
  const [scenes, setScenes] = useState<SceneInfo[]>([]);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [editingScene, setEditingScene] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    if (story && scenes.length === 0) {
      generateInitialScenes();
    }
  }, [story]);

  const generateInitialScenes = async () => {
    if (!story) return;

    setIsGeneratingScenes(true);
    try {
      const response = await fetch('/api/stories/generate-scene-overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyText: story.text_raw,
          beatCount: story.beats || 10,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate scenes');
      }

      const data = await response.json();
      setScenes(data.scenes.map((s: any) => ({ number: s.number, title: s.title })));
    } catch (err) {
      showError('シーン構成の生成に失敗しました');
    } finally {
      setIsGeneratingScenes(false);
    }
  };

  const handleTitleEdit = (sceneNumber: number, newTitle: string) => {
    setScenes(scenes.map(scene => 
      scene.number === sceneNumber 
        ? { ...scene, title: newTitle }
        : scene
    ));
    setEditingScene(null);
    setEditingTitle('');
  };

  const handleAddScene = () => {
    const newNumber = scenes.length + 1;
    setScenes([...scenes, { number: newNumber, title: `シーン ${newNumber}` }]);
  };

  const handleDeleteScene = (sceneNumber: number) => {
    const newScenes = scenes
      .filter(scene => scene.number !== sceneNumber)
      .map((scene, index) => ({ ...scene, number: index + 1 }));
    setScenes(newScenes);
  };

  const handleGenerateScript = async () => {
    setIsGeneratingScript(true);
    
    // デバッグ: 送信するシーン情報を確認
    console.log('[SceneEditor] Generating script with scenes:', scenes);
    
    try {
      const response = await fetch(`/api/stories/${storyId}/generate-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenes: scenes,
          beats: scenes.length,  // シーン数を明示的に送信
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate script');
      }
      
      // レスポンスを確認
      const result = await response.json();
      console.log('[SceneEditor] Script generation response:', result);

      // 台本生成成功をストレージに保存
      sessionStorage.setItem('scriptGenerationSuccess', 'true');
      
      // 少し待ってから遷移（データの更新を待つ）
      setTimeout(() => {
        router.push(`/stories/${storyId}?tab=content`);
      }, 1000);  // 1秒待機に変更
    } catch (err) {
      showError('台本の生成に失敗しました');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (!story) {
    return (
      <Layout>
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-red-500">ストーリーの読み込みに失敗しました</p>
            <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 underline mt-4 inline-block">
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-block">
            ← ダッシュボードに戻る
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-2">
            シーン構成の編集
          </h1>
          <p className="text-sm text-gray-400">
            {story.title || 'タイトル未設定'} - {story.beats || 10}シーン
          </p>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            {/* Story Content Preview */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-200 mb-3">ストーリー内容</h2>
              <div className="bg-gray-800/50 border border-purple-500/20 rounded-md p-4">
                <p className="text-gray-300 whitespace-pre-wrap line-clamp-3">
                  {story.text_raw}
                </p>
              </div>
            </div>

            {/* Scene List */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-200">シーン構成</h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddScene}
                  disabled={isGeneratingScenes || scenes.length >= 20}
                >
                  シーンを追加
                </Button>
              </div>

              {isGeneratingScenes ? (
                <div className="text-center py-8">
                  <Spinner size="md" />
                  <p className="mt-4 text-gray-400">シーン構成を生成中...</p>
                </div>
              ) : (
                <div className={styles.sceneList}>
                  {scenes.map((scene) => (
                    <div key={scene.number} className={styles.sceneItem}>
                      <div className={styles.sceneNumber}>
                        シーン {scene.number}
                      </div>
                      {editingScene === scene.number ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => handleTitleEdit(scene.number, editingTitle)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleTitleEdit(scene.number, editingTitle);
                            } else if (e.key === 'Escape') {
                              setEditingScene(null);
                              setEditingTitle('');
                            }
                          }}
                          className={styles.titleInput}
                          autoFocus
                          maxLength={100}
                        />
                      ) : (
                        <div
                          className={styles.sceneTitle}
                          onClick={() => {
                            setEditingScene(scene.number);
                            setEditingTitle(scene.title);
                          }}
                        >
                          {scene.title}
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteScene(scene.number)}
                        className={styles.deleteButton}
                        disabled={scenes.length <= 1}
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Link href="/dashboard">
                <Button variant="secondary">
                  キャンセル
                </Button>
              </Link>
              <Button 
                onClick={handleGenerateScript}
                disabled={isGeneratingScript || scenes.length === 0}
              >
                {isGeneratingScript ? (
                  <>
                    <Spinner size="sm" color="white" className="mr-2" />
                    台本を作成中...
                  </>
                ) : (
                  '台本を作成'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

const SceneEditorPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <SceneEditorContent />
    </ProtectedRoute>
  );
};

export default SceneEditorPage;