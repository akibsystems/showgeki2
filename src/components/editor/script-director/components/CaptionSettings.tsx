import React, { useState, useRef, useEffect } from 'react';
import cssStyles from '../styles/ScriptDirector.module.css';

// ================================================================
// Types
// ================================================================

interface CaptionSettingsProps {
  enabled: boolean;
  lang: string;
  styles: string[];
  onToggleEnabled: (enabled: boolean) => void;
  onUpdateLang: (lang: string) => void;
  onUpdateStyles: (styles: string[]) => void;
  isReadOnly?: boolean;
}

interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  textShadowX: number;
  textShadowY: number;
  textShadowBlur: number;
  textShadowColor: string;
  textShadowOpacity: number;
  padding: number;
  borderRadius: number;
  letterSpacing: number;
}

// ================================================================
// Constants
// ================================================================

const FONT_FAMILIES = [
  { value: "'Noto Sans JP', sans-serif", label: 'Noto Sans JP (ゴシック)' },
  { value: "'Noto Serif JP', serif", label: 'Noto Serif JP (明朝)' },
  { value: "'Hiragino Sans', sans-serif", label: 'ヒラギノ角ゴシック' },
  { value: "'Hiragino Mincho ProN', serif", label: 'ヒラギノ明朝' },
  { value: "'Yu Gothic', sans-serif", label: '游ゴシック' },
  { value: "'Yu Mincho', serif", label: '游明朝' },
  { value: "'Meiryo', sans-serif", label: 'メイリオ' },
];

const FONT_WEIGHTS = [
  { value: '300', label: '細字 (Light)' },
  { value: '400', label: '標準 (Regular)' },
  { value: '500', label: '中字 (Medium)' },
  { value: '700', label: '太字 (Bold)' },
  { value: '900', label: '極太字 (Black)' },
];

const LANGUAGE_OPTIONS = [
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
];

const DEFAULT_STYLE: CaptionStyle = {
  fontFamily: "'Noto Sans JP', sans-serif",
  fontSize: 48,
  fontWeight: '700',
  color: '#ffffff',
  backgroundColor: '#000000',
  backgroundOpacity: 0,
  textShadowX: 2,
  textShadowY: 2,
  textShadowBlur: 4,
  textShadowColor: '#000000',
  textShadowOpacity: 0.8,
  padding: 10,
  borderRadius: 5,
  letterSpacing: 0,
};

// ================================================================
// Helper Functions
// ================================================================

function parseStylesFromArray(styles: string[]): CaptionStyle {
  const result = { ...DEFAULT_STYLE };
  
  styles.forEach(style => {
    const [property, value] = style.split(':').map(s => s.trim());
    if (!property || !value) return;
    
    switch (property) {
      case 'font-family':
        result.fontFamily = value;
        break;
      case 'font-size':
        result.fontSize = parseInt(value) || DEFAULT_STYLE.fontSize;
        break;
      case 'font-weight':
        result.fontWeight = value;
        break;
      case 'color':
        result.color = value;
        break;
      case 'background-color':
        const bgMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
        if (bgMatch) {
          result.backgroundColor = `#${parseInt(bgMatch[1]).toString(16).padStart(2, '0')}${parseInt(bgMatch[2]).toString(16).padStart(2, '0')}${parseInt(bgMatch[3]).toString(16).padStart(2, '0')}`;
          result.backgroundOpacity = parseFloat(bgMatch[4] || '1');
        } else if (value.startsWith('#')) {
          result.backgroundColor = value;
          result.backgroundOpacity = 1;
        }
        break;
      case 'text-shadow':
        const shadowMatch = value.match(/(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
        if (shadowMatch) {
          result.textShadowX = parseInt(shadowMatch[1]);
          result.textShadowY = parseInt(shadowMatch[2]);
          result.textShadowBlur = parseInt(shadowMatch[3]);
          result.textShadowColor = `#${parseInt(shadowMatch[4]).toString(16).padStart(2, '0')}${parseInt(shadowMatch[5]).toString(16).padStart(2, '0')}${parseInt(shadowMatch[6]).toString(16).padStart(2, '0')}`;
          result.textShadowOpacity = parseFloat(shadowMatch[7] || '1');
        }
        break;
      case 'padding':
        result.padding = parseInt(value) || 0;
        break;
      case 'border-radius':
        result.borderRadius = parseInt(value) || 0;
        break;
      case 'letter-spacing':
        result.letterSpacing = parseFloat(value) || 0;
        break;
    }
  });
  
  return result;
}

function convertStyleToArray(style: CaptionStyle): string[] {
  const result: string[] = [
    `font-family: ${style.fontFamily}`,
    `font-size: ${style.fontSize}px`,
    `font-weight: ${style.fontWeight}`,
    `color: ${style.color}`,
  ];
  
  if (style.backgroundOpacity > 0) {
    const r = parseInt(style.backgroundColor.slice(1, 3), 16);
    const g = parseInt(style.backgroundColor.slice(3, 5), 16);
    const b = parseInt(style.backgroundColor.slice(5, 7), 16);
    result.push(`background-color: rgba(${r}, ${g}, ${b}, ${style.backgroundOpacity})`);
    result.push(`padding: ${style.padding}px`);
    result.push(`border-radius: ${style.borderRadius}px`);
  }
  
  if (style.textShadowOpacity > 0) {
    const r = parseInt(style.textShadowColor.slice(1, 3), 16);
    const g = parseInt(style.textShadowColor.slice(3, 5), 16);
    const b = parseInt(style.textShadowColor.slice(5, 7), 16);
    result.push(`text-shadow: ${style.textShadowX}px ${style.textShadowY}px ${style.textShadowBlur}px rgba(${r}, ${g}, ${b}, ${style.textShadowOpacity})`);
  }
  
  if (style.letterSpacing !== 0) {
    result.push(`letter-spacing: ${style.letterSpacing}em`);
  }
  
  return result;
}

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ================================================================
// Component
// ================================================================

export function CaptionSettings({
  enabled,
  lang,
  styles,
  onToggleEnabled,
  onUpdateLang,
  onUpdateStyles,
  isReadOnly = false,
}: CaptionSettingsProps) {
  const [previewText, setPreviewText] = useState('こんにちは、世界！');
  const [currentStyle, setCurrentStyle] = useState<CaptionStyle>(() => parseStylesFromArray(styles));
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentStyle(parseStylesFromArray(styles));
  }, [styles]);

  const updateStyle = (updates: Partial<CaptionStyle>) => {
    if (isReadOnly) return;
    const newStyle = { ...currentStyle, ...updates };
    setCurrentStyle(newStyle);
    onUpdateStyles(convertStyleToArray(newStyle));
  };

  const toggleEnabled = () => {
    if (!isReadOnly) {
      onToggleEnabled(!enabled);
    }
  };

  const getPreviewStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      fontFamily: currentStyle.fontFamily,
      fontSize: `${currentStyle.fontSize}px`,
      fontWeight: currentStyle.fontWeight,
      color: currentStyle.color,
      letterSpacing: `${currentStyle.letterSpacing}em`,
    };

    if (currentStyle.backgroundOpacity > 0) {
      style.backgroundColor = hexToRgba(currentStyle.backgroundColor, currentStyle.backgroundOpacity);
      style.padding = `${currentStyle.padding}px`;
      style.borderRadius = `${currentStyle.borderRadius}px`;
    }

    if (currentStyle.textShadowOpacity > 0) {
      style.textShadow = `${currentStyle.textShadowX}px ${currentStyle.textShadowY}px ${currentStyle.textShadowBlur}px ${hexToRgba(currentStyle.textShadowColor, currentStyle.textShadowOpacity)}`;
    }

    return style;
  };

  return (
    <div className={cssStyles.captionContent}>
      {/* メインコントロール */}
      <div className={cssStyles.captionMainControl}>
        <div className={cssStyles.captionToggleWrapper}>
          <button
            onClick={toggleEnabled}
            disabled={isReadOnly}
            className={`${cssStyles.captionToggleButton} ${enabled ? cssStyles.captionToggleButtonActive : ''}`}
          >
            <div className={cssStyles.captionToggleInner}>
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 4v3h5.5v12h3V7H19V4z"/>
              </svg>
              <span>字幕</span>
              <div className={`${cssStyles.captionToggleSwitch} ${enabled ? cssStyles.captionToggleSwitchActive : ''}`}>
                <div className={cssStyles.captionToggleSlider} />
              </div>
            </div>
          </button>
          
          {enabled && (
            <div className={cssStyles.captionLangSelect}>
              {LANGUAGE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => !isReadOnly && onUpdateLang(option.value)}
                  disabled={isReadOnly}
                  className={`${cssStyles.captionLangButton} ${lang === option.value ? cssStyles.captionLangButtonActive : ''}`}
                >
                  <span className={cssStyles.captionLangFlag}>{option.flag}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {enabled && (
        <>
          {/* プレビューエリア */}
          <div className={cssStyles.captionPreviewSection}>
            <div className={cssStyles.captionPreviewHeader}>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className={cssStyles.captionPreviewTitle}>字幕プレビュー</span>
            </div>
            <div className={cssStyles.captionPreviewContainer}>
              <div className={cssStyles.captionPreviewScreen}>
                <div 
                  ref={previewRef}
                  className={cssStyles.captionPreviewText}
                  style={getPreviewStyle()}
                >
                  {previewText}
                </div>
              </div>
              <input
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="プレビューテキストを入力"
                className={cssStyles.captionPreviewInput}
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* スタイル設定 */}
          <div className={cssStyles.captionStyleControls}>
            {/* フォント設定 */}
            <div className={cssStyles.captionControlGroup}>
              <h4 className={cssStyles.captionControlGroupTitle}>フォント設定</h4>
              
              <div className={cssStyles.captionControlRow}>
                <label className={cssStyles.captionControlLabel}>フォント</label>
                <select
                  value={currentStyle.fontFamily}
                  onChange={(e) => updateStyle({ fontFamily: e.target.value })}
                  disabled={isReadOnly}
                  className={cssStyles.captionControlSelect}
                >
                  {FONT_FAMILIES.map(font => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={cssStyles.captionControlRow}>
                <label className={cssStyles.captionControlLabel}>サイズ</label>
                <div className={cssStyles.captionControlSliderWrapper}>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    step="2"
                    value={currentStyle.fontSize}
                    onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) })}
                    disabled={isReadOnly}
                    className={cssStyles.captionControlSlider}
                  />
                  <span className={cssStyles.captionControlValue}>{currentStyle.fontSize}px</span>
                </div>
              </div>

              <div className={cssStyles.captionControlRow}>
                <label className={cssStyles.captionControlLabel}>太さ</label>
                <select
                  value={currentStyle.fontWeight}
                  onChange={(e) => updateStyle({ fontWeight: e.target.value })}
                  disabled={isReadOnly}
                  className={cssStyles.captionControlSelect}
                >
                  {FONT_WEIGHTS.map(weight => (
                    <option key={weight.value} value={weight.value}>
                      {weight.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={cssStyles.captionControlRow}>
                <label className={cssStyles.captionControlLabel}>文字間隔</label>
                <div className={cssStyles.captionControlSliderWrapper}>
                  <input
                    type="range"
                    min="-0.1"
                    max="0.5"
                    step="0.05"
                    value={currentStyle.letterSpacing}
                    onChange={(e) => updateStyle({ letterSpacing: parseFloat(e.target.value) })}
                    disabled={isReadOnly}
                    className={cssStyles.captionControlSlider}
                  />
                  <span className={cssStyles.captionControlValue}>{currentStyle.letterSpacing.toFixed(2)}em</span>
                </div>
              </div>
            </div>

            {/* 色設定 */}
            <div className={cssStyles.captionControlGroup}>
              <h4 className={cssStyles.captionControlGroupTitle}>色設定</h4>
              
              <div className={cssStyles.captionControlRow}>
                <label className={cssStyles.captionControlLabel}>文字色</label>
                <div className={cssStyles.captionControlColorWrapper}>
                  <input
                    type="color"
                    value={currentStyle.color}
                    onChange={(e) => updateStyle({ color: e.target.value })}
                    disabled={isReadOnly}
                    className={cssStyles.captionControlColor}
                  />
                  <span className={cssStyles.captionControlColorValue}>{currentStyle.color}</span>
                </div>
              </div>

              <div className={cssStyles.captionControlRow}>
                <label className={cssStyles.captionControlLabel}>背景色</label>
                <div className={cssStyles.captionControlColorWrapper}>
                  <input
                    type="color"
                    value={currentStyle.backgroundColor}
                    onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                    disabled={isReadOnly}
                    className={cssStyles.captionControlColor}
                  />
                  <span className={cssStyles.captionControlColorValue}>{currentStyle.backgroundColor}</span>
                </div>
              </div>

              <div className={cssStyles.captionControlRow}>
                <label className={cssStyles.captionControlLabel}>背景の透明度</label>
                <div className={cssStyles.captionControlSliderWrapper}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={currentStyle.backgroundOpacity}
                    onChange={(e) => updateStyle({ backgroundOpacity: parseFloat(e.target.value) })}
                    disabled={isReadOnly}
                    className={cssStyles.captionControlSlider}
                  />
                  <span className={cssStyles.captionControlValue}>{(currentStyle.backgroundOpacity * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* 影とスタイル設定 */}
            <div className={cssStyles.captionControlGroup}>
              <h4 className={cssStyles.captionControlGroupTitle}>影とスタイル</h4>
              
              <div className={cssStyles.captionControlRow}>
                <label className={cssStyles.captionControlLabel}>影の色</label>
                <div className={cssStyles.captionControlColorWrapper}>
                  <input
                    type="color"
                    value={currentStyle.textShadowColor}
                    onChange={(e) => updateStyle({ textShadowColor: e.target.value })}
                    disabled={isReadOnly}
                    className={cssStyles.captionControlColor}
                  />
                  <span className={cssStyles.captionControlColorValue}>{currentStyle.textShadowColor}</span>
                </div>
              </div>

              <div className={cssStyles.captionControlRow}>
                <label className={cssStyles.captionControlLabel}>影の濃さ</label>
                <div className={cssStyles.captionControlSliderWrapper}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={currentStyle.textShadowOpacity}
                    onChange={(e) => updateStyle({ textShadowOpacity: parseFloat(e.target.value) })}
                    disabled={isReadOnly}
                    className={cssStyles.captionControlSlider}
                  />
                  <span className={cssStyles.captionControlValue}>{(currentStyle.textShadowOpacity * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div className={cssStyles.captionControlRow}>
                <label className={cssStyles.captionControlLabel}>影のぼかし</label>
                <div className={cssStyles.captionControlSliderWrapper}>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={currentStyle.textShadowBlur}
                    onChange={(e) => updateStyle({ textShadowBlur: parseInt(e.target.value) })}
                    disabled={isReadOnly}
                    className={cssStyles.captionControlSlider}
                  />
                  <span className={cssStyles.captionControlValue}>{currentStyle.textShadowBlur}px</span>
                </div>
              </div>

              <div className={cssStyles.captionControlRow}>
                <label className={cssStyles.captionControlLabel}>余白</label>
                <div className={cssStyles.captionControlSliderWrapper}>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="5"
                    value={currentStyle.padding}
                    onChange={(e) => updateStyle({ padding: parseInt(e.target.value) })}
                    disabled={isReadOnly}
                    className={cssStyles.captionControlSlider}
                  />
                  <span className={cssStyles.captionControlValue}>{currentStyle.padding}px</span>
                </div>
              </div>

              <div className={cssStyles.captionControlRow}>
                <label className={cssStyles.captionControlLabel}>角の丸み</label>
                <div className={cssStyles.captionControlSliderWrapper}>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="2"
                    value={currentStyle.borderRadius}
                    onChange={(e) => updateStyle({ borderRadius: parseInt(e.target.value) })}
                    disabled={isReadOnly}
                    className={cssStyles.captionControlSlider}
                  />
                  <span className={cssStyles.captionControlValue}>{currentStyle.borderRadius}px</span>
                </div>
              </div>
            </div>
          </div>

          {/* 使用上の注意 */}
          <div className={cssStyles.captionNotice}>
            <div className={cssStyles.captionNoticeIcon}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className={cssStyles.captionNoticeText}>
              <p>字幕は動画の下部に表示されます。背景と十分なコントラストがあることを確認してください。</p>
              <p className={cssStyles.captionNoticeSubtext}>設定はリアルタイムでプレビューに反映されます。</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CaptionSettings;