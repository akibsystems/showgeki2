'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/layout';
import { Button, Card, CardContent, PageLoading, Spinner } from '@/components/ui';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useStory } from '@/hooks';
import { useToast } from '@/contexts';
import Link from 'next/link';
import styles from './scenes.module.css';
import { mutate } from 'swr';
import { swrKeys } from '@/lib/swr-config';

interface SceneInfo {
  number: number;
  title: string;
}

const SceneEditorContent: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: showError } = useToast();
  const storyId = params.id as string;
  const { story, isLoading, generateScript: generateScriptFromHook, mutate: mutateStory } = useStory(storyId);
  const [scenes, setScenes] = useState<SceneInfo[]>([]);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [editingScene, setEditingScene] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  // Get beats from URL parameter if available
  const beatsFromUrl = searchParams.get('beats');
  const beatsCount = beatsFromUrl ? parseInt(beatsFromUrl, 10) : (story?.beats || 10);
  const shouldRegenerate = searchParams.get('regenerate') === 'true';

  // Force refresh story data when component mounts or beats changes
  useEffect(() => {
    // Force a fresh fetch, bypassing cache
    mutateStory();
    // Reset scenes when beats changes to force regeneration
    setScenes([]);
    // Also invalidate after a delay to ensure fresh data
    const timer = setTimeout(() => {
      mutateStory();
    }, 100);
    return () => clearTimeout(timer);
  }, [beatsCount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (story && scenes.length === 0) {
      // 再生成フラグがある場合は、保存されたシーンを無視して新規生成
      if (shouldRegenerate || !story.script_json || !(story.script_json as any).beats) {
        // ストーリーから新規生成
        generateInitialScenes();
      } else {
        // シーン分析データがセッションストレージに保存されているか確認
        const savedScenes = sessionStorage.getItem(`scenes_${storyId}`);
        if (savedScenes && !shouldRegenerate) {
          try {
            const parsedScenes = JSON.parse(savedScenes);
            setScenes(parsedScenes);
            return;
          } catch (e) {
            console.error('Failed to parse saved scenes:', e);
          }
        }
        
        // 既存の台本がある場合でも、シーン分析が必要な場合は再生成
        // ナビゲーションパスをチェックして、戻ってきた場合は再生成
        const navPath = sessionStorage.getItem('navigationPath');
        if (story.script_json && (story.script_json as any).beats && navPath !== 'story-scenes-script') {
          const beats = (story.script_json as any).beats;
          const extractedScenes = beats.map((beat: any, index: number) => {
            // 台詞の最初の部分を簡潔なタイトルに変換
            let title = `シーン ${index + 1}`;
            if (beat.text) {
              // 最初の20文字を取得して、句読点で区切る
              const shortText = beat.text.substring(0, 40);
              const firstPart = shortText.split(/[。、！？]/)[0];
              title = firstPart.length > 20 ? firstPart.substring(0, 20) + '...' : firstPart;
            } else if (beat.imagePrompt) {
              // 画像プロンプトから抽出
              const shortPrompt = beat.imagePrompt.substring(0, 30);
              title = shortPrompt + '...';
            }
            return {
              number: index + 1,
              title: title
            };
          });
          setScenes(extractedScenes);
        } else {
          // 台本がない場合、または戻ってきた場合は、ストーリーから生成
          generateInitialScenes();
        }
      }
    }
  }, [story, beatsCount, shouldRegenerate]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateInitialScenes = async () => {
    if (!story) return;

    setIsGeneratingScenes(true);
    console.log('[SceneEditor] Generating scenes with beatCount:', beatsCount);
    
    try {
      const response = await fetch('/api/stories/generate-scene-overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyText: story.text_raw,
          beatCount: beatsCount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate scenes');
      }

      const data = await response.json();
      const newScenes = data.scenes.map((s: any) => ({ number: s.number, title: s.title }));
      setScenes(newScenes);
      // シーン情報をセッションストレージに保存
      sessionStorage.setItem(`scenes_${storyId}`, JSON.stringify(newScenes));
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

  const handleMoveScene = (index: number, direction: 'up' | 'down') => {
    const newScenes = [...scenes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // スワップ
    [newScenes[index], newScenes[targetIndex]] = [newScenes[targetIndex], newScenes[index]];
    
    // シーン番号を再割り当て
    newScenes.forEach((scene, i) => {
      scene.number = i + 1;
    });
    
    setScenes(newScenes);
  };

  const handleGenerateScript = async () => {
    setIsGeneratingScript(true);
    
    // デバッグ: 送信するシーン情報を確認
    console.log('[SceneEditor] Generating script with scenes:', scenes);
    
    // シーン情報をクリア（台本生成後は新しいシーン分析が必要）
    sessionStorage.removeItem(`scenes_${storyId}`);
    
    try {
      const response = await fetch(`/api/stories/${storyId}/generate-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenes: scenes,
          beats: scenes.length || beatsCount,  // シーン数を明示的に送信
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate script');
      }
      
      // レスポンスを確認
      const result = await response.json();
      console.log('[SceneEditor] Script generation response:', result);
      if (result.data?.script_json) {
        console.log('[SceneEditor] Generated script details:', {
          hasBeats: !!result.data.script_json.beats,
          beatsCount: result.data.script_json.beats?.length,
          firstBeat: result.data.script_json.beats?.[0]
        });
      }
      
      // SWRキャッシュを手動で更新
      if (result.data?.story) {
        console.log('[SceneEditor] Updating SWR cache with new story data');
        await mutate(swrKeys.story(storyId), result.data.story, false);
      }

      // 台本生成成功をストレージに保存
      sessionStorage.setItem('scriptGenerationSuccess', 'true');
      
      // Set navigation tracking if coming from scene editor
      const currentPath = sessionStorage.getItem('navigationPath');
      if (currentPath === 'story-scenes-script') {
        sessionStorage.setItem('navigationPath', 'story-scenes-script');
      }
      
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
          <Link 
            href={story?.script_json ? `/stories/${storyId}` : `/stories/new?storyId=${storyId}&beats=${beatsCount}`} 
            className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-block"
          >
            ← {story?.script_json ? '台本編集画面に戻る' : 'ストーリー入力画面に戻る'}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-2">
            シーン構成の編集
          </h1>
          <p className="text-sm text-gray-400">
            {story.title || 'タイトル未設定'} - {scenes.length > 0 ? `${scenes.length}シーン` : `${beatsCount}シーン`}
          </p>
          {story.script_json && !shouldRegenerate && (
            <p className="text-xs text-purple-400 mt-1">
              ※ 現在の台本から読み込まれたシーン構成です
            </p>
          )}
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            {/* Story Content Preview */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-200">ストーリー内容</h2>
                <Link href={`/stories/new?storyId=${storyId}&beats=${beatsCount}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    ストーリー入力画面へ
                  </Button>
                </Link>
              </div>
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

              {isGeneratingScenes && (!story.script_json || shouldRegenerate) ? (
                <div className="text-center py-8">
                  <Spinner size="md" />
                  <p className="mt-4 text-gray-400">シーン構成を生成中...</p>
                </div>
              ) : (
                <div className={styles.sceneList}>
                  {scenes.map((scene, index) => (
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
                      <div className={styles.sceneActions}>
                        {index > 0 && (
                          <button
                            onClick={() => handleMoveScene(index, 'up')}
                            className={styles.moveButton}
                            title="上に移動"
                          >
                            ⬆️
                          </button>
                        )}
                        {index < scenes.length - 1 && (
                          <button
                            onClick={() => handleMoveScene(index, 'down')}
                            className={styles.moveButton}
                            title="下に移動"
                          >
                            ⬇️
                          </button>
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
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Link href={story?.script_json ? `/stories/${storyId}` : `/stories/new?storyId=${storyId}&beats=${beatsCount}`}>
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
                  story.script_json ? '台本を更新' : '台本を作成'
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