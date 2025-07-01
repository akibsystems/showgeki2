import React, { useState, useEffect } from 'react';
import styles from '../styles/ScriptDirector.module.css';

interface TitleEditorProps {
  title: string;
  onChange: (title: string) => void;
  onValidate?: (title: string) => string | undefined;
  isReadOnly?: boolean;
  error?: string;
}

export function TitleEditor({
  title,
  onChange,
  onValidate,
  isReadOnly = false,
  error,
}: TitleEditorProps) {
  const [localTitle, setLocalTitle] = useState(title);
  const [isFocused, setIsFocused] = useState(false);

  // 外部からのタイトル変更を反映
  useEffect(() => {
    if (!isFocused) {
      setLocalTitle(title);
    }
  }, [title, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    
    // リアルタイムバリデーション
    if (onValidate) {
      onValidate(newTitle);
    }
    
    onChange(newTitle);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // フォーカスが外れた時に最終的なバリデーション
    if (onValidate) {
      onValidate(localTitle);
    }
  };

  return (
    <div className={styles.titleSection}>
      <label htmlFor="script-title" className={styles.titleLabel}>
        🎬 作品タイトル
      </label>
      <div className={styles.titleInputWrapper}>
        <input
          id="script-title"
          type="text"
          value={localTitle}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="動画のタイトルを入力してください"
          className={`${styles.titleInput} ${error ? styles.titleInputError : ''}`}
          disabled={isReadOnly}
          maxLength={100}
        />
        {error && (
          <div className={styles.errorMessage} role="alert">
            {error}
          </div>
        )}
        <div className={styles.characterCount}>
          {localTitle.length}/100
        </div>
      </div>
    </div>
  );
}